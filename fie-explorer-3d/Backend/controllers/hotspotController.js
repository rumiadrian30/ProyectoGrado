// controllers/hotspotController.js

'use strict';

const pool           = require('../db/pool');
const { writeAudit } = require('./authController');
const { getClient }  = require('../utils/redisClient');

const log = (msg) => console.log(`  \x1b[35m[HOTSPOT]\x1b[0m ${msg}`);

const CACHE_TTL   = 60; // segundos
const VALID_TYPES = ['lab', 'office', 'service', 'access', 'classroom'];

// Formato UUID v4 estándar que PostgreSQL acepta como tipo uuid
// Ejemplo válido: "550e8400-e29b-41d4-a716-446655440000"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─────────────────────────────────────────────────────────────
// Helpers de caché
// ─────────────────────────────────────────────────────────────

/**
 * Construye la clave de caché para un edificio concreto.
 * Si building_id es null/undefined se usa el segmento "all" para la
 * consulta global, evitando colisiones entre edificios.
 *
 * @param {string|null} building_id  UUID del edificio, p.ej. "550e8400-e29b-41d4-a716-446655440000"
 * @returns {string}  p.ej. "hotspots:list:550e8400-..." | "hotspots:list:all"
 */
function buildCacheKey(building_id) {
  return building_id ? `hotspots:list:${building_id}` : 'hotspots:list:all';
}

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

async function cacheDelete(key) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(key);
    console.log(`  \x1b[36m[Redis]\x1b[0m cache invalidated → ${key}`);
  } catch (err) {
    console.warn(`  \x1b[33m[Redis]\x1b[0m del error: ${err.message}`);
  }
}

/**
 * Invalida el caché del edificio afectado Y la lista global.
 * Cuando un hotspot cambia de edificio (update) se pasan ambos IDs
 * para limpiar también la entrada del edificio origen.
 *
 * @param {string}      building_id      UUID del edificio destino (o único)
 * @param {string|null} old_building_id  UUID del edificio origen (solo en update cross-building)
 */
async function cacheInvalidateForBuilding(building_id, old_building_id = null) {
  // 1. Siempre limpiar la vista global sin filtro
  await cacheDelete('hotspots:list:all');

  // 2. Limpiar la entrada del edificio afectado
  if (building_id) {
    await cacheDelete(`hotspots:list:${building_id}`);
  }

  // 3. Si el hotspot cambió de edificio, limpiar también el edificio anterior
  if (old_building_id && String(old_building_id) !== String(building_id)) {
    await cacheDelete(`hotspots:list:${old_building_id}`);
  }
}

// ─────────────────────────────────────────────────────────────
// GET / — Lista hotspots (filtrada por edificio si se indica)
// ─────────────────────────────────────────────────────────────

/**
 * CORRECCIÓN Bug #1:
 *   Extrae building_id de req.query y lo aplica como filtro en SQL.
 *
 * CORRECCIÓN Bug #2:
 *   La clave de caché incluye el building_id para aislar los datos
 *   de cada edificio y evitar que una consulta envenene la de otra.
 */
async function list(req, res, next) {
  try {
    // ── Validar building_id como UUID (la columna en PostgreSQL es tipo uuid) ──
    // El frontend envía el UUID del edificio: "550e8400-e29b-41d4-a716-446655440000"
    // parseInt lo convertiría en NaN y PostgreSQL rechazaría la comparación con
    // el mensaje: "la sintaxis de entrada no es válida para tipo uuid".
    const building_id = req.query.building_id || null;

    if (building_id !== null && !UUID_RE.test(building_id)) {
      const e = new Error(
        'El parámetro building_id debe ser un UUID válido ' +
        '(formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).',
      );
      e.status = 400;
      return next(e);
    }

    // ── Clave de caché dinámica (Bug #2 corregido) ────────────
    const cacheKey = buildCacheKey(building_id);
    const cached   = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // ── Consulta filtrada por edificio (Bug #1 corregido) ─────
    let queryText;
    let queryParams;

    if (building_id) {
      queryText = `
        SELECT
          h.*,
          b.name AS building_name,
          b.code AS building_code,
          b.offset_x AS building_offset_x,
          b.offset_y AS building_offset_y,
          b.offset_z AS building_offset_z
        FROM hotspots h
        JOIN buildings b ON b.id = h.building_id
        WHERE h.building_id = $1
        ORDER BY h.floor ASC, h.created_at DESC
      `;
      queryParams = [building_id];
    } else {
      // Sin filtro: devuelve todos (uso interno / admin)
      queryText = `
        SELECT
          h.*,
          b.name AS building_name,
          b.code AS building_code,
          b.offset_x AS building_offset_x,
          b.offset_y AS building_offset_y,
          b.offset_z AS building_offset_z
        FROM hotspots h
        JOIN buildings b ON b.id = h.building_id
        ORDER BY h.created_at DESC
      `;
      queryParams = [];
    }

    const { rows } = await pool.query(queryText, queryParams);
    log(`Listado [building_id=${building_id ?? 'all'}]: ${rows.length} hotspots`);

    await cacheSet(cacheKey, rows);
    res.json(rows);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// GET /:id
// ─────────────────────────────────────────────────────────────

async function getOne(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT
          h.*,
          b.name AS building_name,
          b.code AS building_code,
          b.offset_x AS building_offset_x,
          b.offset_y AS building_offset_y,
          b.offset_z AS building_offset_z
       FROM hotspots h
       JOIN buildings b ON b.id = h.building_id
       WHERE h.id = $1`,
      [req.params.id],
    );
    if (!rows[0]) {
      const e = new Error('Hotspot no encontrado.'); e.status = 404; return next(e);
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// POST /
// ─────────────────────────────────────────────────────────────

async function create(req, res, next) {
  const ip = req.ip;
  const {
    building_id, name, description, type, floor,
    pos_x, pos_y, pos_z,
    schedule, equipment,
    teacher, capacity, phone, image_url,
  } = req.body;

  if (!name?.trim())
    { const e = new Error('El campo "name" es obligatorio.'); e.status = 400; return next(e); }
  if (!building_id)
    { const e = new Error('El campo "building_id" es obligatorio.'); e.status = 400; return next(e); }
  if (!VALID_TYPES.includes(type))
    { const e = new Error(`Tipo inválido. Usar: ${VALID_TYPES.join(', ')}`); e.status = 400; return next(e); }

  const parsedFloor = parseInt(floor) || 1;
  if (parsedFloor < 1)
    { const e = new Error('El piso mínimo es 1.'); e.status = 400; return next(e); }

  try {
    const buildingRes = await pool.query(
      `SELECT floor_count FROM buildings WHERE id = $1`, [building_id]
    );
    if (!buildingRes.rows[0])
      { const e = new Error('Edificio no encontrado.'); e.status = 404; return next(e); }

    const maxFloor = buildingRes.rows[0].floor_count ?? 99;
    if (parsedFloor > maxFloor) {
      const e = new Error(
        `El edificio solo tiene ${maxFloor} ${maxFloor === 1 ? 'planta' : 'plantas'}. ` +
        `Piso máximo: ${maxFloor}.`
      );
      e.status = 400; return next(e);
    }

    const { rows } = await pool.query(
      `INSERT INTO hotspots
         (building_id, created_by, name, description, type, floor,
          pos_x, pos_y, pos_z, schedule, equipment,
          teacher, capacity, phone, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        building_id, req.admin.id, name.trim(),
        description || null, type, parsedFloor,
        pos_x || 0, pos_y || 0, pos_z || 0,
        schedule || null, equipment || null,
        teacher || null, capacity || null, phone || null, image_url || null,
      ],
    );
    const h = rows[0];

    await writeAudit({
      user_id: req.admin.id, action: 'CREATE',
      entity_type: 'hotspots', entity_id: h.id,
      new_values: { name: h.name, type: h.type, floor: h.floor, building_id },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });

    // Invalida la entrada del edificio afectado + la lista global
    await cacheInvalidateForBuilding(building_id);

    log(`CREADO — "${h.name}" (${h.type}) por ${req.admin.email}`);
    res.status(201).json(h);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// PUT /:id
// ─────────────────────────────────────────────────────────────

async function update(req, res, next) {
  const ip    = req.ip;
  const { id } = req.params;
  const {
    building_id, name, description, type, floor,
    pos_x, pos_y, pos_z, schedule, equipment,
    teacher, capacity, phone, image_url,
  } = req.body;

  try {
    const before = await pool.query(`SELECT * FROM hotspots WHERE id = $1`, [id]);
    if (!before.rows[0])
      { const e = new Error('Hotspot no encontrado.'); e.status = 404; return next(e); }
    const old = before.rows[0];

    const targetBuildingId = building_id || old.building_id;
    const parsedFloor      = floor !== undefined ? parseInt(floor) || 1 : undefined;

    if (parsedFloor !== undefined) {
      if (parsedFloor < 1)
        { const e = new Error('El piso mínimo es 1.'); e.status = 400; return next(e); }

      const buildingRes = await pool.query(
        `SELECT floor_count FROM buildings WHERE id = $1`, [targetBuildingId]
      );
      if (!buildingRes.rows[0])
        { const e = new Error('Edificio no encontrado.'); e.status = 404; return next(e); }
      const maxFloor = buildingRes.rows[0].floor_count ?? 99;
      if (parsedFloor > maxFloor) {
        const e = new Error(
          `El edificio solo tiene ${maxFloor} ${maxFloor === 1 ? 'planta' : 'plantas'}. ` +
          `Piso máximo: ${maxFloor}.`
        );
        e.status = 400; return next(e);
      }
    }

    const { rows } = await pool.query(
      `UPDATE hotspots SET
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
        building_id || null, name, description, type, parsedFloor,
        pos_x, pos_y, pos_z, schedule, equipment,
        teacher, capacity, phone, image_url, id,
      ],
    );
    const h = rows[0];

    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE',
      entity_type: 'hotspots', entity_id: id,
      old_values: { name: old.name, type: old.type, floor: old.floor, building_id: old.building_id },
      new_values: { name: h.name, type: h.type, floor: h.floor, building_id: h.building_id },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });

    // Invalida edificio nuevo + edificio anterior (si cambió) + lista global
    await cacheInvalidateForBuilding(h.building_id, old.building_id);

    log(`ACTUALIZADO — "${h.name}" por ${req.admin.email}`);
    res.json(h);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// PATCH /:id/toggle
// ─────────────────────────────────────────────────────────────

async function toggle(req, res, next) {
  const ip    = req.ip;
  const { id } = req.params;
  try {
    const before = await pool.query(
      `SELECT id, name, is_active, building_id FROM hotspots WHERE id = $1`, [id]
    );
    if (!before.rows[0])
      { const e = new Error('Hotspot no encontrado.'); e.status = 404; return next(e); }

    const { rows } = await pool.query(
      `UPDATE hotspots
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
    const h      = rows[0];
    const action = h.is_active ? 'ACTIVATE' : 'DEACTIVATE';

    await writeAudit({
      user_id: req.admin.id, action,
      entity_type: 'hotspots', entity_id: id,
      old_values: { is_active: before.rows[0].is_active },
      new_values: { is_active: h.is_active },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });

    await cacheInvalidateForBuilding(h.building_id);

    log(`${h.is_active ? 'ACTIVADO' : 'DESACTIVADO'} — "${h.name}" por ${req.admin.email}`);
    res.json(h);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// DELETE /:id
// ─────────────────────────────────────────────────────────────

async function remove(req, res, next) {
  const ip    = req.ip;
  const { id } = req.params;
  try {
    const before = await pool.query(`SELECT * FROM hotspots WHERE id = $1`, [id]);
    if (!before.rows[0])
      { const e = new Error('Hotspot no encontrado.'); e.status = 404; return next(e); }
    const deleted = before.rows[0];

    await pool.query(`DELETE FROM hotspots WHERE id = $1`, [id]);

    await writeAudit({
      user_id: req.admin.id, action: 'DELETE',
      entity_type: 'hotspots', entity_id: id,
      old_values: { name: deleted.name, type: deleted.type, building_id: deleted.building_id },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });

    await cacheInvalidateForBuilding(deleted.building_id);

    log(`ELIMINADO — "${deleted.name}" por ${req.admin.email}`);
    res.json({ message: `Hotspot "${deleted.name}" eliminado correctamente.` });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, toggle, remove };