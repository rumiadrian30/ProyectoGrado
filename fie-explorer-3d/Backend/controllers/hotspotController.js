const pool = require('../db/pool');
const { writeAudit } = require('./authController');

const log = (msg) => console.log(`  \x1b[35m[HOTSPOT]\x1b[0m ${msg}`);

async function list(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT h.*, b.name AS building_name, b.code AS building_code
      FROM hotspots h
      JOIN buildings b ON b.id = h.building_id
      ORDER BY h.created_at DESC
    `);
    log(`Listado: ${rows.length} hotspots`);
    res.json(rows);
  } catch (err) { next(err); }
}

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

async function create(req, res, next) {
  const ip = req.ip;
  const { building_id, name, description, type, floor, pos_x, pos_y, pos_z, schedule, equipment } = req.body;

  if (!name?.trim())     { const e=new Error('El campo "name" es obligatorio.'); e.status=400; return next(e); }
  if (!building_id)      { const e=new Error('El campo "building_id" es obligatorio.'); e.status=400; return next(e); }
  if (!['lab','office','service','access'].includes(type)) {
    const e=new Error('Tipo inválido. Usar: lab, office, service, access'); e.status=400; return next(e);
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO hotspots
        (building_id, created_by, name, description, type, floor, pos_x, pos_y, pos_z, schedule, equipment)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [building_id, req.admin.id, name.trim(), description||null, type,
       floor||1, pos_x||0, pos_y||0, pos_z||0, schedule||null, equipment||null]
    );
    const h = rows[0];
    await writeAudit({
      user_id: req.admin.id, action: 'CREATE',
      entity_type: 'hotspots', entity_id: h.id,
      new_values: { name: h.name, type: h.type, floor: h.floor, building_id },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });
    log(`✅ CREADO — "${h.name}" (${h.type}) por ${req.admin.email}`);
    res.status(201).json(h);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  const ip = req.ip;
  const { id } = req.params;
  const { name, description, type, floor, pos_x, pos_y, pos_z, schedule, equipment } = req.body;

  try {
    const before = await pool.query(`SELECT * FROM hotspots WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e=new Error('Hotspot no encontrado.'); e.status=404; return next(e); }
    const old = before.rows[0];

    const { rows } = await pool.query(`
      UPDATE hotspots SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        type        = COALESCE($3, type),
        floor       = COALESCE($4, floor),
        pos_x       = COALESCE($5, pos_x),
        pos_y       = COALESCE($6, pos_y),
        pos_z       = COALESCE($7, pos_z),
        schedule    = COALESCE($8, schedule),
        equipment   = COALESCE($9, equipment),
        updated_at  = NOW()
      WHERE id = $10 RETURNING *`,
      [name, description, type, floor, pos_x, pos_y, pos_z, schedule, equipment, id]
    );
    const h = rows[0];
    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE',
      entity_type: 'hotspots', entity_id: id,
      old_values: { name: old.name, type: old.type, floor: old.floor },
      new_values: { name: h.name, type: h.type, floor: h.floor },
      ip_address: ip, user_agent: req.headers['user-agent'],
    });
    log(`✏️  ACTUALIZADO — "${h.name}" por ${req.admin.email}`);
    res.json(h);
  } catch (err) { next(err); }
}

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
    log(`${h.is_active ? '🟢' : '🔴'} ${action} — "${h.name}" por ${req.admin.email}`);
    res.json(h);
  } catch (err) { next(err); }
}

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
    log(`🗑️  ELIMINADO — "${deleted.name}" por ${req.admin.email}`);
    res.json({ message: `Hotspot "${deleted.name}" eliminado correctamente.` });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, toggle, remove };
