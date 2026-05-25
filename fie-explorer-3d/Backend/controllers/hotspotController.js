// controllers/hotspotController.js
'use strict';

const pool           = require('../db/pool');
const { writeAudit } = require('./authController');
const { getClient }  = require('../utils/redisClient');

const log = msg => console.log(`  \x1b[35m[HOTSPOT]\x1b[0m ${msg}`);

const CACHE_TTL   = 15;
const VALID_TYPES = ['lab', 'office', 'service', 'access', 'classroom'];
const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─────────────────────────────────────────────────────────────
// Helpers de caché (fire-and-forget)
// ─────────────────────────────────────────────────────────────

function buildCacheKey(building_id) {
  return building_id ? `hotspots:list:${building_id}` : 'hotspots:list:all';
}

async function cacheGet(key) {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (raw) { console.log(`  \x1b[36m[Redis]\x1b[0m HIT  → ${key}`); return JSON.parse(raw); }
    console.log(`  \x1b[36m[Redis]\x1b[0m MISS → ${key}`);
    return null;
  } catch (err) { console.warn(`  \x1b[33m[Redis]\x1b[0m get: ${err.message}`); return null; }
}

async function cacheSet(key, data) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
    console.log(`  \x1b[36m[Redis]\x1b[0m SET  → ${key} (TTL ${CACHE_TTL}s)`);
  } catch (err) { console.warn(`  \x1b[33m[Redis]\x1b[0m set: ${err.message}`); }
}

async function cacheDel(key) {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(key);
    console.log(`  \x1b[36m[Redis]\x1b[0m DEL  → ${key}`);
  } catch (err) { console.warn(`  \x1b[33m[Redis]\x1b[0m del: ${err.message}`); }
}

/**
 * Invalida entradas de caché afectadas por una mutación de hotspot.
 * Siempre borra la lista global + la entrada del edificio destino.
 * Si el hotspot cambió de edificio, también borra el origen.
 */
async function invalidate(building_id, old_building_id = null) {
  const keys = new Set(['hotspots:list:all']);
  if (building_id)     keys.add(`hotspots:list:${building_id}`);
  if (old_building_id && String(old_building_id) !== String(building_id))
    keys.add(`hotspots:list:${old_building_id}`);
  await Promise.all([...keys].map(cacheDel));
}

/**
 * Exportado para que buildingController lo llame cuando un admin
 * modifique los offsets o coordenadas GPS de un edificio, evitando
 * que el sistema sirva hotspots con metadatos de edificio obsoletos.
 *
 * Borra:
 *  - hotspots:list:all          (lista global)
 *  - hotspots:list:<buildingId> (lista filtrada por edificio)
 *
 * @param {string} buildingId  UUID del edificio modificado
 */
async function cacheInvalidateForBuilding(buildingId) {
  if (!buildingId) return;
  await invalidate(buildingId);
  log(`caché invalidada por cambio de edificio [${buildingId}]`);
}

// ─────────────────────────────────────────────────────────────
// Fragment SQL reutilizable
// ─────────────────────────────────────────────────────────────
// IMPORTANTE — pos_x, pos_y, pos_z son coordenadas LOCALES al GLB del edificio.
// NO se suman los offsets del edificio (building_offset_x/y/z) aquí:
// esa transformación ocurre exclusivamente en el renderer Three.js del
// frontend (buildingGroup.position). Mezclarlos en SQL generaría una doble
// aplicación del desplazamiento y desplazaría los pines ~300 m en escena.
//
// Se incluyen b.latitude / b.longitude para que el frontend pueda usar
// coordenadas GPS exactas en el flyTo y en los pines DOM sin depender
// de la conversión aproximada offset→GPS.
const SELECT_FIELDS = `
  h.id,
  h.building_id,
  h.created_by,
  h.name,
  h.description,
  h.type,
  h.floor,
  h.is_active,
  h.schedule,
  h.equipment,
  h.teacher,
  h.capacity,
  h.phone,
  h.image_url,
  h.created_at,
  h.updated_at,
  CAST(h.pos_x AS FLOAT8) AS pos_x,
  CAST(h.pos_y AS FLOAT8) AS pos_y,
  CAST(h.pos_z AS FLOAT8) AS pos_z,
  b.name                        AS building_name,
  b.code                        AS building_code,
  CAST(b.offset_x  AS FLOAT8)  AS building_offset_x,
  CAST(b.offset_y  AS FLOAT8)  AS building_offset_y,
  CAST(b.offset_z  AS FLOAT8)  AS building_offset_z
`;

// ─────────────────────────────────────────────────────────────
// GET / — Lista hotspots
// ─────────────────────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const building_id = req.query.building_id || null;

    if (building_id !== null && !UUID_RE.test(building_id)) {
      const e = new Error(
        'El parámetro building_id debe ser un UUID válido ' +
        '(formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).',
      );
      e.status = 400;
      return next(e);
    }

    const cacheKey = buildCacheKey(building_id);
    const cached   = await cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const { text, params } = building_id
      ? {
          text: `
            SELECT ${SELECT_FIELDS}
            FROM hotspots h
            JOIN buildings b ON b.id = h.building_id
            WHERE h.building_id = $1
            ORDER BY h.floor ASC, h.created_at DESC
          `,
          params: [building_id],
        }
      : {
          text: `
            SELECT ${SELECT_FIELDS}
            FROM hotspots h
            JOIN buildings b ON b.id = h.building_id
            ORDER BY h.created_at DESC
          `,
          params: [],
        };

    const { rows } = await pool.query(text, params);
    log(`list [building=${building_id ?? 'all'}]: ${rows.length} hotspots`);

    cacheSet(cacheKey, rows).catch(() => {});

    res.set('X-Cache', 'MISS');
    res.json(rows);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// GET /:id
// ─────────────────────────────────────────────────────────────
async function getOne(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT ${SELECT_FIELDS}
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
  const {
    building_id, name, description, type, floor,
    pos_x, pos_y, pos_z,
    schedule, equipment, teacher, capacity, phone, image_url,
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
    const bldRes = await pool.query(`SELECT floor_count FROM buildings WHERE id = $1`, [building_id]);
    if (!bldRes.rows[0])
      { const e = new Error('Edificio no encontrado.'); e.status = 404; return next(e); }

    const maxFloor = bldRes.rows[0].floor_count ?? 99;
    if (parsedFloor > maxFloor) {
      const e = new Error(
        `El edificio solo tiene ${maxFloor} ${maxFloor === 1 ? 'planta' : 'plantas'}. ` +
        `Piso máximo: ${maxFloor}.`,
      );
      e.status = 400; return next(e);
    }

    // pos_x/y/z se almacenan como coordenadas locales puras relativas al GLB.
    // El frontend aplica building_offset_* en el renderer; no se pre-suman aquí.
    const { rows } = await pool.query(
      `INSERT INTO hotspots
         (building_id, created_by, name, description, type, floor,
          pos_x, pos_y, pos_z, schedule, equipment,
          teacher, capacity, phone, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        building_id, req.admin.id, name.trim(),
        description  || null, type, parsedFloor,
        parseFloat(pos_x) || 0,
        parseFloat(pos_y) || 0,
        parseFloat(pos_z) || 0,
        schedule     || null, equipment || null,
        teacher      || null, capacity  || null,
        phone        || null, image_url || null,
      ],
    );
    const h = rows[0];

    await writeAudit({
      user_id: req.admin.id, action: 'CREATE',
      entity_type: 'hotspots', entity_id: h.id,
      new_values: { name: h.name, type: h.type, floor: h.floor, building_id },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    await invalidate(building_id);
    log(`CREADO — "${h.name}" (${h.type}) por ${req.admin.email}`);
    res.status(201).json(h);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// PUT /:id
// ─────────────────────────────────────────────────────────────
async function update(req, res, next) {
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

      const bldRes = await pool.query(
        `SELECT floor_count FROM buildings WHERE id = $1`, [targetBuildingId],
      );
      if (!bldRes.rows[0])
        { const e = new Error('Edificio no encontrado.'); e.status = 404; return next(e); }

      const maxFloor = bldRes.rows[0].floor_count ?? 99;
      if (parsedFloor > maxFloor) {
        const e = new Error(
          `El edificio solo tiene ${maxFloor} ${maxFloor === 1 ? 'planta' : 'plantas'}. ` +
          `Piso máximo: ${maxFloor}.`,
        );
        e.status = 400; return next(e);
      }
    }

    // pos_x/y/z se actualizan como valores locales puros; sin suma de offsets.
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
       WHERE id = $15
       RETURNING *`,
      [
        building_id || null, name, description, type, parsedFloor,
        pos_x != null ? parseFloat(pos_x) : null,
        pos_y != null ? parseFloat(pos_y) : null,
        pos_z != null ? parseFloat(pos_z) : null,
        schedule, equipment, teacher, capacity, phone, image_url, id,
      ],
    );
    const h = rows[0];

    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE',
      entity_type: 'hotspots', entity_id: id,
      old_values: { name: old.name, type: old.type, floor: old.floor, building_id: old.building_id },
      new_values: { name: h.name,   type: h.type,   floor: h.floor,   building_id: h.building_id },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    await invalidate(h.building_id, old.building_id);
    log(`ACTUALIZADO — "${h.name}" por ${req.admin.email}`);
    res.json(h);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// PATCH /:id/toggle
// ─────────────────────────────────────────────────────────────
async function toggle(req, res, next) {
  const { id } = req.params;
  try {
    const before = await pool.query(
      `SELECT id, name, is_active, building_id FROM hotspots WHERE id = $1`, [id],
    );
    if (!before.rows[0])
      { const e = new Error('Hotspot no encontrado.'); e.status = 404; return next(e); }

    const { rows } = await pool.query(
      `UPDATE hotspots SET is_active = NOT is_active, updated_at = NOW()
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
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    await invalidate(h.building_id);
    log(`${h.is_active ? 'ACTIVADO' : 'DESACTIVADO'} — "${h.name}" por ${req.admin.email}`);
    res.json(h);
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────────
// DELETE /:id
// ─────────────────────────────────────────────────────────────
async function remove(req, res, next) {
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
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    await invalidate(deleted.building_id);
    log(`ELIMINADO — "${deleted.name}" por ${req.admin.email}`);
    res.json({ message: `Hotspot "${deleted.name}" eliminado correctamente.` });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, toggle, remove, cacheInvalidateForBuilding };