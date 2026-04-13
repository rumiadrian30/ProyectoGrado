const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /api/hotspots?building_id=xxx&floor=1&type=lab
const getAll = async (req, res, next) => {
  try {
    const { building_id, floor, type } = req.query;
    const conditions = ['h.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (building_id) { conditions.push(`h.building_id = $${idx++}`); params.push(building_id); }
    if (floor !== undefined) { conditions.push(`h.floor = $${idx++}`); params.push(parseInt(floor)); }
    if (type) { conditions.push(`h.type = $${idx++}`); params.push(type); }

    const whereClause = conditions.join(' AND ');

    const result = await query(`
      SELECT
        h.id, h.building_id, h.name, h.description, h.type, h.floor,
        h.pos_x, h.pos_y, h.pos_z,
        h.schedule, h.equipment, h.is_active,
        b.name AS building_name, b.code AS building_code,
        (
          SELECT json_agg(json_build_object(
            'id', i.id,
            'url', i.url,
            'alt_text', i.alt_text,
            'sort_order', i.sort_order
          ) ORDER BY i.sort_order ASC)
          FROM hotspot_images i WHERE i.hotspot_id = h.id
        ) AS images
      FROM hotspots h
      JOIN buildings b ON b.id = h.building_id
      WHERE ${whereClause}
      ORDER BY h.floor ASC, h.name ASC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/hotspots/:id
const getById = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        h.*,
        b.name AS building_name, b.code AS building_code, b.floor_count,
        (
          SELECT json_agg(json_build_object(
            'id', i.id, 'url', i.url, 'alt_text', i.alt_text, 'sort_order', i.sort_order
          ) ORDER BY i.sort_order ASC)
          FROM hotspot_images i WHERE i.hotspot_id = h.id
        ) AS images
      FROM hotspots h
      JOIN buildings b ON b.id = h.building_id
      WHERE h.id = $1
    `, [req.params.id]);

    if (!result.rows.length) throw createError('Hotspot no encontrado', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/hotspots  (protegido)
const create = async (req, res, next) => {
  try {
    const { building_id, name, description, type, floor, pos_x, pos_y, pos_z, schedule, equipment } = req.body;
    const result = await query(`
      INSERT INTO hotspots
        (building_id, created_by, name, description, type, floor, pos_x, pos_y, pos_z, schedule, equipment)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [building_id, req.admin?.id || null, name, description, type || 'lab',
        floor || 1, pos_x || 0, pos_y || 0, pos_z || 0, schedule, equipment]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/hotspots/:id  (protegido)
const update = async (req, res, next) => {
  try {
    const { name, description, type, floor, pos_x, pos_y, pos_z, schedule, equipment, is_active } = req.body;
    const result = await query(`
      UPDATE hotspots SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        type = COALESCE($3, type),
        floor = COALESCE($4, floor),
        pos_x = COALESCE($5, pos_x),
        pos_y = COALESCE($6, pos_y),
        pos_z = COALESCE($7, pos_z),
        schedule = COALESCE($8, schedule),
        equipment = COALESCE($9, equipment),
        is_active = COALESCE($10, is_active)
      WHERE id = $11
      RETURNING *
    `, [name, description, type, floor, pos_x, pos_y, pos_z, schedule, equipment, is_active, req.params.id]);

    if (!result.rows.length) throw createError('Hotspot no encontrado', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/hotspots/:id  (protegido - soft delete)
const remove = async (req, res, next) => {
  try {
    await query(`UPDATE hotspots SET is_active = FALSE WHERE id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Hotspot desactivado correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
