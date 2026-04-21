const pool = require('../db/pool');
const { writeAudit } = require('./authController');
const log = (msg) => console.log(`  \x1b[34m[BUILDING]\x1b[0m ${msg}`);

async function list(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT b.*,
        (SELECT COUNT(*)::int FROM hotspots h WHERE h.building_id = b.id AND h.is_active) AS hotspot_count,
        (SELECT COUNT(*)::int FROM models_3d m WHERE m.building_id = b.id AND m.is_active) AS model_count
      FROM buildings b ORDER BY b.name ASC
    `);
    log(`Listado: ${rows.length} edificios`);
    res.json(rows);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  const { id } = req.params;
  const { name, description, floor_count, is_active } = req.body;
  try {
    const before = await pool.query(`SELECT * FROM buildings WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e = new Error('Edificio no encontrado.'); e.status = 404; return next(e); }
    const { rows } = await pool.query(`
      UPDATE buildings SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        floor_count = COALESCE($3, floor_count),
        is_active   = COALESCE($4, is_active),
        updated_at  = NOW()
      WHERE id = $5 RETURNING *
    `, [name, description, floor_count, is_active, id]);
    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE',
      entity_type: 'buildings', entity_id: id,
      old_values: { name: before.rows[0].name, is_active: before.rows[0].is_active },
      new_values: { name: rows[0].name, is_active: rows[0].is_active },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✏️  ACTUALIZADO — "${rows[0].name}" por ${req.admin.email}`);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { list, update };
