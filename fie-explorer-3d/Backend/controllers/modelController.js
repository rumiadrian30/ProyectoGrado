const pool = require('../db/pool');
const { writeAudit } = require('./authController');
const log = (msg) => console.log(`  \x1b[36m[MODEL]\x1b[0m ${msg}`);

async function list(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT m.*, b.name AS building_name, b.code AS building_code
      FROM models_3d m
      JOIN buildings b ON b.id = m.building_id
      ORDER BY b.name, m.model_type, m.lod_level
    `);
    log(`Listado: ${rows.length} modelos`);
    res.json(rows);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  const { building_id, model_type, file_path, file_size_mb, triangle_count, lod_level, format, version } = req.body;
  if (!building_id || !model_type || !file_path) {
    const e = new Error('building_id, model_type y file_path son obligatorios.'); e.status = 400; return next(e);
  }
  try {
    const { rows } = await pool.query(`
      INSERT INTO models_3d (building_id, model_type, file_path, file_size_mb, triangle_count, lod_level, format, version)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [building_id, model_type, file_path, file_size_mb||null, triangle_count||null,
        lod_level??0, format||'GLB', version||null]);
    await writeAudit({
      user_id: req.admin.id, action: 'CREATE', entity_type: 'models_3d', entity_id: rows[0].id,
      new_values: { building_id, model_type, file_path, lod_level: lod_level??0 },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✅ CREADO — ${model_type} LOD${lod_level??0} → ${file_path}`);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  const { id } = req.params;
  const { file_path, file_size_mb, triangle_count, version, is_active } = req.body;
  try {
    const before = await pool.query(`SELECT * FROM models_3d WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e = new Error('Modelo no encontrado.'); e.status = 404; return next(e); }
    const { rows } = await pool.query(`
      UPDATE models_3d SET
        file_path      = COALESCE($1, file_path),
        file_size_mb   = COALESCE($2, file_size_mb),
        triangle_count = COALESCE($3, triangle_count),
        version        = COALESCE($4, version),
        is_active      = COALESCE($5, is_active),
        updated_at     = NOW()
      WHERE id = $6 RETURNING *
    `, [file_path, file_size_mb, triangle_count, version, is_active, id]);
    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE', entity_type: 'models_3d', entity_id: id,
      old_values: { file_path: before.rows[0].file_path, is_active: before.rows[0].is_active },
      new_values: { file_path: rows[0].file_path, is_active: rows[0].is_active },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✏️  ACTUALIZADO — modelo ${id}`);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  const { id } = req.params;
  try {
    const before = await pool.query(`SELECT * FROM models_3d WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e = new Error('Modelo no encontrado.'); e.status = 404; return next(e); }
    await pool.query(`DELETE FROM models_3d WHERE id = $1`, [id]);
    await writeAudit({
      user_id: req.admin.id, action: 'DELETE', entity_type: 'models_3d', entity_id: id,
      old_values: { file_path: before.rows[0].file_path, model_type: before.rows[0].model_type },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`🗑️  ELIMINADO — modelo ${before.rows[0].file_path}`);
    res.json({ message: 'Modelo eliminado correctamente.' });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
