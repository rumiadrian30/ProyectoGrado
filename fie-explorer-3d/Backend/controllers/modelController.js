// controllers/modelController.js
// Las coordenadas GPS de cada edificio se gestionan exclusivamente
// desde el panel admin (Buildings). Este controlador no toca buildings.longitude/latitude.
const pool = require('../db/pool');
const { writeAudit } = require('./authController');
const log = (msg) => console.log(`  \x1b[36m[MODEL]\x1b[0m ${msg}`);

// ── GET / ────────────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT m.*,
             b.name      AS building_name,
             b.code      AS building_code,
             b.offset_x  AS building_offset_x,
             b.offset_y  AS building_offset_y,
             b.offset_z  AS building_offset_z
      FROM models_3d m
      JOIN buildings b ON b.id = m.building_id
      ORDER BY b.name, m.model_type, m.lod_level
    `);
    log(`Listado: ${rows.length} modelos`);
    res.json(rows);
  } catch (err) { next(err); }
}

// ── POST / ───────────────────────────────────────────────────
async function create(req, res, next) {
  const {
    building_id, model_type, file_path, file_size_mb, triangle_count,
    lod_level, format, version,
    scale_x, scale_y, scale_z,
    offset_x, offset_y, offset_z,
    rotate_x, rotate_y, rotate_z,
  } = req.body;

  if (!building_id || !model_type || !file_path) {
    const e = new Error('building_id, model_type y file_path son obligatorios.');
    e.status = 400; return next(e);
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO models_3d (
        building_id, model_type, file_path, file_size_mb, triangle_count,
        lod_level, format, version,
        scale_x, scale_y, scale_z,
        offset_x, offset_y, offset_z,
        rotate_x, rotate_y, rotate_z
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *
    `, [
      building_id, model_type, file_path,
      file_size_mb || null, triangle_count || null,
      lod_level ?? 0, format || 'GLB', version || null,
      scale_x  ?? 1.0, scale_y  ?? 1.0, scale_z  ?? 1.0,
      offset_x ?? 0.0, offset_y ?? 0.0, offset_z ?? 0.0,
      rotate_x ?? 0.0, rotate_y ?? 0.0, rotate_z ?? 0.0,
    ]);

    const m = rows[0];
    await writeAudit({
      user_id: req.admin.id, action: 'CREATE',
      entity_type: 'models_3d', entity_id: m.id,
      new_values: { building_id, model_type, file_path, lod_level: lod_level ?? 0 },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✅ CREADO — ${model_type} LOD${lod_level ?? 0} → ${file_path}`);
    res.status(201).json(m);
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'uq_models_building_type_lod') {
      const LOD_NAMES = ['Alta (LOD 0)', 'Media (LOD 1)', 'Baja (LOD 2)'];
      const e = new Error(
        `Ya existe un modelo ${model_type} de resolución ${LOD_NAMES[lod_level ?? 0] ?? `LOD ${lod_level}`} ` +
        `para este edificio. Elimina o desactiva el existente antes de registrar uno nuevo.`
      );
      e.status = 409; return next(e);
    }
    next(err);
  }
}

// ── PUT /:id ─────────────────────────────────────────────────
async function update(req, res, next) {
  const { id } = req.params;
  // offset_x/y/z no se actualizan (posición viene del building padre)
  const {
    file_path, file_size_mb, triangle_count, version, is_active,
    scale_x, scale_y, scale_z,
    rotate_x, rotate_y, rotate_z,
  } = req.body;

  try {
    const before = await pool.query(`SELECT * FROM models_3d WHERE id = $1`, [id]);
    if (!before.rows[0]) {
      const e = new Error('Modelo no encontrado.'); e.status = 404; return next(e);
    }
    const old = before.rows[0];

    const { rows } = await pool.query(`
      UPDATE models_3d SET
        file_path      = COALESCE($1,  file_path),
        file_size_mb   = COALESCE($2,  file_size_mb),
        triangle_count = COALESCE($3,  triangle_count),
        version        = COALESCE($4,  version),
        is_active      = COALESCE($5,  is_active),
        scale_x        = COALESCE($6,  scale_x),
        scale_y        = COALESCE($7,  scale_y),
        scale_z        = COALESCE($8,  scale_z),
        rotate_x       = COALESCE($9,  rotate_x),
        rotate_y       = COALESCE($10, rotate_y),
        rotate_z       = COALESCE($11, rotate_z),
        updated_at     = NOW()
      WHERE id = $12 RETURNING *
    `, [
      file_path, file_size_mb, triangle_count, version, is_active,
      scale_x, scale_y, scale_z,
      rotate_x, rotate_y, rotate_z,
      id,
    ]);

    const m = rows[0];
    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE',
      entity_type: 'models_3d', entity_id: id,
      old_values: { file_path: old.file_path, is_active: old.is_active, rotate_y: old.rotate_y },
      new_values: { file_path: m.file_path,   is_active: m.is_active,   rotate_y: m.rotate_y   },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✏️  ACTUALIZADO — modelo ${id}`);
    res.json(m);
  } catch (err) { next(err); }
}

// ── DELETE /:id ───────────────────────────────────────────────
async function remove(req, res, next) {
  const { id } = req.params;
  try {
    const before = await pool.query(`SELECT * FROM models_3d WHERE id = $1`, [id]);
    if (!before.rows[0]) {
      const e = new Error('Modelo no encontrado.'); e.status = 404; return next(e);
    }
    await pool.query(`DELETE FROM models_3d WHERE id = $1`, [id]);
    await writeAudit({
      user_id: req.admin.id, action: 'DELETE',
      entity_type: 'models_3d', entity_id: id,
      old_values: { file_path: before.rows[0].file_path, model_type: before.rows[0].model_type },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`🗑️  ELIMINADO — modelo ${before.rows[0].file_path}`);
    res.json({ message: 'Modelo eliminado correctamente.' });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };