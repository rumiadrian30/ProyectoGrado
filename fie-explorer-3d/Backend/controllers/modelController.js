// Backend/controllers/modelController.js
const path = require('path');
const fs   = require('fs');
const pool = require('../db/pool');
const { writeAudit } = require('./authController');
const { MODELS_DIR }  = require('../middleware/uploadMiddleware');

const log = (msg) => console.log(`  \x1b[36m[MODEL]\x1b[0m ${msg}`);

function parseBool(val) {
  if (val === true  || val === 'true'  || val === 1 || val === '1') return true;
  if (val === false || val === 'false' || val === 0 || val === '0') return false;
  return undefined;
}

// Un solo modelo activo por edificio
async function checkActiveConflict(building_id, excludeId = null) {
  const { rows } = await pool.query(`
    SELECT id, lod_level, file_path FROM models_3d
    WHERE building_id = $1
      AND is_active   = TRUE
      ${excludeId ? 'AND id <> $2' : ''}
  `, excludeId ? [building_id, excludeId] : [building_id]);
  return rows;
}

function conflictMessage(conflictRows = []) {
  const lod = conflictRows[0]?.lod_level;
  const LOD_NAMES = ['Alta (LOD 0)', 'Media (LOD 1)', 'Baja (LOD 2)'];
  const lodLabel  = lod !== undefined ? ` (${LOD_NAMES[lod] ?? `LOD ${lod}`})` : '';
  return `Ya existe un modelo activo para este edificio. Desactívalo antes de activar otro.`;
}

// ── GET / ─────────────────────────────────────────────────────
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
      ORDER BY b.name, m.lod_level
    `);
    log(`Listado: ${rows.length} modelos`);
    res.json(rows);
  } catch (err) { next(err); }
}

// ── POST / ────────────────────────────────────────────────────
async function create(req, res, next) {
  const {
    building_id, file_path, file_size_mb, triangle_count,
    lod_level, format, version,
    scale_x, scale_y, scale_z,
    offset_x, offset_y, offset_z,
    rotate_x, rotate_y, rotate_z,
  } = req.body;

  if (!building_id || !file_path) {
    const e = new Error('building_id y file_path son obligatorios.'); e.status = 400; return next(e);
  }

  const isActiveOnCreate = parseBool(req.body.is_active) ?? true;

  try {
    if (isActiveOnCreate) {
      const conflict = await checkActiveConflict(building_id);
      if (conflict.length > 0) {
        const e = new Error(conflictMessage(conflict));
        e.status = 409; return next(e);
      }
    }

    const { rows } = await pool.query(`
      INSERT INTO models_3d (
        building_id, file_path, file_size_mb, triangle_count,
        lod_level, format, version,
        scale_x, scale_y, scale_z,
        offset_x, offset_y, offset_z,
        rotate_x, rotate_y, rotate_z
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
    `, [
      building_id, file_path, file_size_mb||null, triangle_count||null,
      lod_level??0, format||'GLB', version||null,
      scale_x??1.0, scale_y??1.0, scale_z??1.0,
      offset_x??0.0, offset_y??0.0, offset_z??0.0,
      rotate_x??0.0, rotate_y??0.0, rotate_z??0.0,
    ]);

    await writeAudit({
      user_id: req.admin.id, action: 'CREATE', entity_type: 'models_3d', entity_id: rows[0].id,
      new_values: { building_id, file_path, lod_level: lod_level??0, scale_x, scale_y, scale_z },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✅ CREADO — LOD${lod_level??0} → ${file_path}`);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error(conflictMessage());
      e.status = 409; return next(e);
    }
    next(err);
  }
}

// ── PUT /:id ──────────────────────────────────────────────────
async function update(req, res, next) {
  const { id } = req.params;
  const {
    file_path, file_size_mb, triangle_count, version,
    scale_x, scale_y, scale_z,
    offset_x, offset_y, offset_z,
    rotate_x, rotate_y, rotate_z,
  } = req.body;

  const is_active = parseBool(req.body.is_active);

  try {
    const before = await pool.query(`SELECT * FROM models_3d WHERE id = $1`, [id]);
    if (!before.rows[0]) {
      const e = new Error('Modelo no encontrado.'); e.status = 404; return next(e);
    }

    const rec = before.rows[0];

    if (is_active === true && rec.is_active === false) {
      const conflict = await checkActiveConflict(rec.building_id, id);
      if (conflict.length > 0) {
        const e = new Error(conflictMessage(conflict));
        e.status = 409; return next(e);
      }
    }

    const finalIsActive = is_active !== undefined ? is_active : rec.is_active;

    const { rows } = await pool.query(`
      UPDATE models_3d SET
        file_path      = COALESCE($1,  file_path),
        file_size_mb   = COALESCE($2,  file_size_mb),
        triangle_count = COALESCE($3,  triangle_count),
        version        = COALESCE($4,  version),
        is_active      = $5,
        scale_x        = COALESCE($6,  scale_x),
        scale_y        = COALESCE($7,  scale_y),
        scale_z        = COALESCE($8,  scale_z),
        offset_x       = COALESCE($9,  offset_x),
        offset_y       = COALESCE($10, offset_y),
        offset_z       = COALESCE($11, offset_z),
        rotate_x       = COALESCE($12, rotate_x),
        rotate_y       = COALESCE($13, rotate_y),
        rotate_z       = COALESCE($14, rotate_z),
        updated_at     = NOW()
      WHERE id = $15 RETURNING *
    `, [
      file_path, file_size_mb, triangle_count, version,
      finalIsActive,
      scale_x, scale_y, scale_z,
      offset_x, offset_y, offset_z,
      rotate_x, rotate_y, rotate_z,
      id,
    ]);

    if (file_path && rec.file_path !== rows[0].file_path) {
      const absOldPath = path.resolve(MODELS_DIR, path.basename(rec.file_path));
      try {
        await fs.promises.unlink(absOldPath);
        log(`🗑️  Archivo anterior eliminado: ${path.basename(rec.file_path)}`);
      } catch (unlinkErr) {
        if (unlinkErr.code !== 'ENOENT') log(`⚠️  No se pudo eliminar el archivo anterior: ${unlinkErr.message}`);
      }
    }

    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE', entity_type: 'models_3d', entity_id: id,
      old_values: { file_path: rec.file_path, is_active: rec.is_active, scale_x: rec.scale_x, scale_y: rec.scale_y, scale_z: rec.scale_z, rotate_x: rec.rotate_x, rotate_y: rec.rotate_y, rotate_z: rec.rotate_z },
      new_values: { file_path: rows[0].file_path, is_active: rows[0].is_active, scale_x: rows[0].scale_x, scale_y: rows[0].scale_y, scale_z: rows[0].scale_z, rotate_x: rows[0].rotate_x, rotate_y: rows[0].rotate_y, rotate_z: rows[0].rotate_z },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✏️  ACTUALIZADO — modelo ${id} is_active=${rows[0].is_active}`);
    res.json(rows[0]);
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

    const absFilePath = path.resolve(MODELS_DIR, path.basename(before.rows[0].file_path));
    try {
      await fs.promises.unlink(absFilePath);
      log(`🗑️  Archivo eliminado del disco: ${path.basename(before.rows[0].file_path)}`);
    } catch (unlinkErr) {
      if (unlinkErr.code !== 'ENOENT') log(`⚠️  No se pudo eliminar el archivo: ${unlinkErr.message}`);
    }

    await writeAudit({
      user_id: req.admin.id, action: 'DELETE', entity_type: 'models_3d', entity_id: id,
      old_values: { file_path: before.rows[0].file_path },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`🗑️  ELIMINADO — ${before.rows[0].file_path}`);
    res.json({ message: 'Modelo eliminado correctamente.' });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };