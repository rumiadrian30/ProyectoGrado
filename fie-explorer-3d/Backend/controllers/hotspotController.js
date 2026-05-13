// controllers/hotspotController.js
// GET /api/hotspots usa caché Redis (TTL 60 s).
// POST / PUT / PATCH / DELETE invalidan el caché automáticamente.

const pool = require('../db/pool');
const { writeAudit } = require('./authController');
const { getClient }  = require('../utils/redisClient');

const log = (msg) => console.log(`  \x1b[35m[HOTSPOT]\x1b[0m ${msg}`);

const CACHE_KEY = 'hotspots:list';
const CACHE_TTL = 60; // segundos

const VALID_TYPES = ['lab', 'office', 'service', 'access', 'classroom'];

// ── Helpers de caché ─────────────────────────────────────────
async function cacheGet(key) {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (raw) {
      console.log(`  \x1b[36m[Redis]\x1b[0m cache hit  → ${key}`);
      return JSON.parse(raw);
    }
    console.log(`  \x1b[36m[Redis]\x1b[0m cache miss → ${key}`);
    return null;
  } catch (err) {
    console.warn(`  \x1b[33m[Redis]\x1b[0m get error: ${err.message}`);
    return null;
  }
}

async function cacheSet(key, data, ttl = CACHE_TTL) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
    console.log(`  \x1b[36m[Redis]\x1b[0m cache set  → ${key} (TTL ${ttl}s)`);
  } catch (err) {
    console.warn(`  \x1b[33m[Redis]\x1b[0m set error: ${err.message}`);
  }
}

async function cacheInvalidate(key) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(key);
    console.log(`  \x1b[36m[Redis]\x1b[0m cache invalidated → ${key}`);
  } catch (err) {
    console.warn(`  \x1b[33m[Redis]\x1b[0m del error: ${err.message}`);
  }
}

// ── GET / — lista todos los hotspots (con caché) ─────────────
async function list(req, res, next) {
  try {
    const cached = await cacheGet(CACHE_KEY);
    if (cached) return res.json(cached);

    const { rows } = await pool.query(`
      SELECT h.*, b.name AS building_name, b.code AS building_code
      FROM hotspots h
      JOIN buildings b ON b.id = h.building_id
      ORDER BY h.created_at DESC
    `);
    log(`Listado: ${rows.length} hotspots`);

    await cacheSet(CACHE_KEY, rows);
    res.json(rows);
  } catch (err) { next(err); }
}

// ── GET /:id ─────────────────────────────────────────────────
async function getOne(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT h.*, b.name AS building_name, b.code AS building_code
       FROM hotspots h
       JOIN buildings b ON b.id = h.building_id
       WHERE h.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) {
      const err = new Error('Hotspot no encontrado.'); err.status = 404; return next(err);
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
}

// ── POST / ───────────────────────────────────────────────────
async function create(req, res, next) {
  const ip = req.ip;
  const {
    building_id, name, description, type, floor,
    pos_x, pos_y, pos_z,
    schedule, equipment,
    // Campos nuevos
    teacher, capacity, phone, image_url,
  } = req.body;

  if (!name?.trim())
    { const e=new Error('El campo "name" es obligatorio.'); e.status=400; return next(e); }
  if (!building_id)
    { const e=new Error('El campo "building_id" es obligatorio.'); e.status=400; return next(e); }
  if (!VALID_TYPES.includes(type))
    { const e=new Error(`Tipo inválido. Usar: ${VALID_TYPES.join(', ')}`); e.status=400; return next(e); }

  const parsedFloor = parseInt(floor) || 1;
  if (parsedFloor < 1)
    { const e=new Error('El piso mínimo es 1.'); e.status=400; return next(e); }

  try {
    // Validar que el piso no supere el floor_count del edificio
    const buildingRes = await pool.query(`SELECT floor_count FROM buildings WHERE id = $1`, [building_id]);
    if (!buildingRes.rows[0])
      { const e=new Error('Edificio no encontrado.'); e.status=404; return next(e); }

    const maxFloor = buildingRes.rows[0].floor_count ?? 99;
    if (parsedFloor > maxFloor) {
      const e = new Error(`El edificio solo tiene ${maxFloor} ${maxFloor === 1 ? 'planta' : 'plantas'}. Piso máximo: ${maxFloor}.`);
      e.status = 400; return next(e);
    }

    const { rows } = await pool.query(`
      INSERT INTO hotspots
        (building_id, created_by, name, description, type, floor,
         pos_x, pos_y, pos_z, schedule, equipment,
         teacher, capacity, phone, image_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        building_id, req.admin.id, name.trim(), description||null, type,
        parsedFloor, pos_x||0, pos_y||0, pos_z||0, schedule||null, equipment||null,
        teacher||null, capacity||null, phone||null, image_url||null,
      ]
    );
    const h = rows[0];
    await writeAudit({
      user_id: req.admin.id, action: 'CREATE',
      entity_type: 'hotspots', entity_id: h.id,
      new_values: { name: h.name, type: h.type, floor: h.floor, building_id },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });
    await cacheInvalidate(CACHE_KEY);
    log(`✅ CREADO — "${h.name}" (${h.type}) por ${req.admin.email}`);
    res.status(201).json(h);
  } catch (err) { next(err); }
}

// ── PUT /:id ─────────────────────────────────────────────────
async function update(req, res, next) {
  const ip = req.ip;
  const { id } = req.params;
  const {
    building_id,
    name, description, type, floor,
    pos_x, pos_y, pos_z,
    schedule, equipment,
    teacher, capacity, phone, image_url,
  } = req.body;

  try {
    const before = await pool.query(`SELECT * FROM hotspots WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e=new Error('Hotspot no encontrado.'); e.status=404; return next(e); }
    const old = before.rows[0];

    // Validar piso contra el edificio destino (nuevo o el actual si no cambió)
    const targetBuildingId = building_id || old.building_id;
    const parsedFloor = floor !== undefined ? parseInt(floor) || 1 : undefined;
    if (parsedFloor !== undefined) {
      if (parsedFloor < 1)
        { const e=new Error('El piso mínimo es 1.'); e.status=400; return next(e); }

      const buildingRes = await pool.query(`SELECT floor_count FROM buildings WHERE id = $1`, [targetBuildingId]);
      if (!buildingRes.rows[0])
        { const e=new Error('Edificio no encontrado.'); e.status=404; return next(e); }
      const maxFloor = buildingRes.rows[0].floor_count ?? 99;
      if (parsedFloor > maxFloor) {
        const e = new Error(`El edificio solo tiene ${maxFloor} ${maxFloor === 1 ? 'planta' : 'plantas'}. Piso máximo: ${maxFloor}.`);
        e.status = 400; return next(e);
      }
    }

    const { rows } = await pool.query(`
      UPDATE hotspots SET
        building_id = COALESCE($1,  building_id),
        name        = COALESCE($2,  name),
        description = COALESCE($3,  description),
        type        = COALESCE($4,  type),
        floor       = COALESCE($5,  floor),
        pos_x       = COALESCE($6,  pos_x),
        pos_y       = COALESCE($7,  pos_y),
        pos_z       = COALESCE($8,  pos_z),
        schedule    = COALESCE($9,  schedule),
        equipment   = COALESCE($10, equipment),
        teacher     = COALESCE($11, teacher),
        capacity    = COALESCE($12, capacity),
        phone       = COALESCE($13, phone),
        image_url   = COALESCE($14, image_url),
        updated_at  = NOW()
      WHERE id = $15 RETURNING *`,
      [
        building_id || null,
        name, description, type, parsedFloor,
        pos_x, pos_y, pos_z, schedule, equipment,
        teacher, capacity, phone, image_url,
        id,
      ]
    );
    const h = rows[0];
    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE',
      entity_type: 'hotspots', entity_id: id,
      old_values: { name: old.name, type: old.type, floor: old.floor },
      new_values: { name: h.name, type: h.type, floor: h.floor },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });
    await cacheInvalidate(CACHE_KEY);
    log(`✏️  ACTUALIZADO — "${h.name}" por ${req.admin.email}`);
    res.json(h);
  } catch (err) { next(err); }
}

// ── PATCH /:id/toggle ─────────────────────────────────────────
async function toggle(req, res, next) {
  const ip = req.ip;
  const { id } = req.params;
  try {
    const before = await pool.query(`SELECT id, name, is_active FROM hotspots WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e=new Error('Hotspot no encontrado.'); e.status=404; return next(e); }

    const { rows } = await pool.query(
      `UPDATE hotspots SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`, [id]
    );
    const h = rows[0];
    const action = h.is_active ? 'ACTIVATE' : 'DEACTIVATE';
    await writeAudit({
      user_id: req.admin.id, action,
      entity_type: 'hotspots', entity_id: id,
      old_values: { is_active: before.rows[0].is_active },
      new_values: { is_active: h.is_active },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });
    await cacheInvalidate(CACHE_KEY);
    log(`${h.is_active ? '🟢' : '🔴'} ${action} — "${h.name}" por ${req.admin.email}`);
    res.json(h);
  } catch (err) { next(err); }
}

// ── DELETE /:id ───────────────────────────────────────────────
async function remove(req, res, next) {
  const ip = req.ip;
  const { id } = req.params;
  try {
    const before = await pool.query(`SELECT * FROM hotspots WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e=new Error('Hotspot no encontrado.'); e.status=404; return next(e); }
    const deleted = before.rows[0];

    await pool.query(`DELETE FROM hotspots WHERE id = $1`, [id]);
    await writeAudit({
      user_id: req.admin.id, action: 'DELETE',
      entity_type: 'hotspots', entity_id: id,
      old_values: { name: deleted.name, type: deleted.type, building_id: deleted.building_id },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });
    await cacheInvalidate(CACHE_KEY);
    log(`🗑️  ELIMINADO — "${deleted.name}" por ${req.admin.email}`);
    res.json({ message: `Hotspot "${deleted.name}" eliminado correctamente.` });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, toggle, remove };