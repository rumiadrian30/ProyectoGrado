// controllers/buildingController.js
const pool = require('../db/pool');
const { writeAudit } = require('./authController');
const log = (msg) => console.log(`  \x1b[34m[BUILDING]\x1b[0m ${msg}`);

// ── GET / ────────────────────────────────────────────────────
async function list(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT b.*,
        (SELECT COUNT(*)::int FROM hotspots   h WHERE h.building_id = b.id AND h.is_active) AS hotspot_count,
        (SELECT COUNT(*)::int FROM models_3d  m WHERE m.building_id = b.id AND m.is_active) AS model_count
      FROM buildings b ORDER BY b.name ASC
    `);
    log(`Listado: ${rows.length} edificios`);
    res.json(rows);
  } catch (err) { next(err); }
}

// ── POST / ───────────────────────────────────────────────────
async function create(req, res, next) {
  const { name, code, description, type, floor_count } = req.body;

  if (!name?.trim()) {
    const e = new Error('El campo "name" es obligatorio.'); e.status = 400; return next(e);
  }
  if (!code?.trim()) {
    const e = new Error('El campo "code" es obligatorio (ej: FIE-A).'); e.status = 400; return next(e);
  }
  if (!['main', 'secondary', 'lab'].includes(type)) {
    const e = new Error('Tipo inválido. Usar: main, secondary, lab.'); e.status = 400; return next(e);
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO buildings (name, code, description, type, floor_count)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name.trim(), code.trim().toUpperCase(), description || null, type, floor_count || 1]);

    const b = rows[0];
    await writeAudit({
      user_id: req.admin.id, action: 'CREATE',
      entity_type: 'buildings', entity_id: b.id,
      new_values: { name: b.name, code: b.code, type: b.type },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✅ CREADO — "${b.name}" (${b.code}) por ${req.admin.email}`);
    res.status(201).json(b);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('Ya existe un edificio con ese código.'); e.status = 409; return next(e);
    }
    next(err);
  }
}

// ── PUT /:id ─────────────────────────────────────────────────
async function update(req, res, next) {
  const { id } = req.params;
  const { name, code, description, type, floor_count, is_active } = req.body;
  try {
    const before = await pool.query(`SELECT * FROM buildings WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e = new Error('Edificio no encontrado.'); e.status = 404; return next(e); }

    const { rows } = await pool.query(`
      UPDATE buildings SET
        name        = COALESCE($1, name),
        code        = COALESCE($2, code),
        description = COALESCE($3, description),
        type        = COALESCE($4, type),
        floor_count = COALESCE($5, floor_count),
        is_active   = COALESCE($6, is_active),
        updated_at  = NOW()
      WHERE id = $7 RETURNING *
    `, [name, code ? code.trim().toUpperCase() : null, description, type, floor_count, is_active, id]);

    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE',
      entity_type: 'buildings', entity_id: id,
      old_values: { name: before.rows[0].name, code: before.rows[0].code, is_active: before.rows[0].is_active },
      new_values: { name: rows[0].name, code: rows[0].code, is_active: rows[0].is_active },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✏️  ACTUALIZADO — "${rows[0].name}" por ${req.admin.email}`);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('Ya existe un edificio con ese código.'); e.status = 409; return next(e);
    }
    next(err);
  }
}

// ── PATCH /:id/toggle ────────────────────────────────────────
async function toggle(req, res, next) {
  const { id } = req.params;
  try {
    const before = await pool.query(`SELECT id, name, is_active FROM buildings WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e = new Error('Edificio no encontrado.'); e.status = 404; return next(e); }

    const { rows } = await pool.query(
      `UPDATE buildings SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`, [id]
    );
    const b = rows[0];
    const action = b.is_active ? 'ACTIVATE' : 'DEACTIVATE';
    await writeAudit({
      user_id: req.admin.id, action,
      entity_type: 'buildings', entity_id: id,
      old_values: { is_active: before.rows[0].is_active },
      new_values: { is_active: b.is_active },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`${b.is_active ? '🟢' : '🔴'} ${action} — "${b.name}" por ${req.admin.email}`);
    res.json(b);
  } catch (err) { next(err); }
}

// ── DELETE /:id ──────────────────────────────────────────────
async function remove(req, res, next) {
  const { id } = req.params;
  try {
    const before = await pool.query(`SELECT * FROM buildings WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e = new Error('Edificio no encontrado.'); e.status = 404; return next(e); }
    const deleted = before.rows[0];

    // Verificar que no tenga hotspots activos asociados
    const { rows: activeHotspots } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM hotspots WHERE building_id = $1 AND is_active = TRUE`, [id]
    );
    if (activeHotspots[0].cnt > 0) {
      const e = new Error(
        `No se puede eliminar: el edificio tiene ${activeHotspots[0].cnt} hotspot(s) activo(s). Desactívalos primero.`
      );
      e.status = 409;
      return next(e);
    }

    await pool.query(`DELETE FROM buildings WHERE id = $1`, [id]);
    await writeAudit({
      user_id: req.admin.id, action: 'DELETE',
      entity_type: 'buildings', entity_id: id,
      old_values: { name: deleted.name, code: deleted.code, type: deleted.type },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`🗑️  ELIMINADO — "${deleted.name}" por ${req.admin.email}`);
    res.json({ message: `Edificio "${deleted.name}" eliminado correctamente.` });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, toggle, remove };
