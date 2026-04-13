const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /api/buildings
const getAll = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        id, name, code, type, description, floor_count, is_active,
        created_at, updated_at
      FROM buildings
      WHERE is_active = TRUE
      ORDER BY name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/buildings/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT
        b.id, b.name, b.code, b.type, b.description, b.floor_count,
        b.is_active, b.created_at,
        (
          SELECT json_agg(json_build_object(
            'id', m.id,
            'model_type', m.model_type,
            'file_path', m.file_path,
            'lod_level', m.lod_level,
            'format', m.format,
            'file_size_mb', m.file_size_mb,
            'triangle_count', m.triangle_count
          ))
          FROM models_3d m
          WHERE m.building_id = b.id AND m.is_active = TRUE
        ) AS models,
        (
          SELECT COUNT(*)::int
          FROM hotspots h
          WHERE h.building_id = b.id AND h.is_active = TRUE
        ) AS hotspot_count
      FROM buildings b
      WHERE b.id = $1
    `, [id]);

    if (!result.rows.length) throw createError('Edificio no encontrado', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/buildings  (protegido)
const create = async (req, res, next) => {
  try {
    const { name, code, type, description, floor_count } = req.body;
    const result = await query(`
      INSERT INTO buildings (name, code, type, description, floor_count)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, code, type || 'secondary', description, floor_count || 1]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/buildings/:id  (protegido)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, floor_count, is_active } = req.body;
    const result = await query(`
      UPDATE buildings
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          floor_count = COALESCE($3, floor_count),
          is_active = COALESCE($4, is_active)
      WHERE id = $5
      RETURNING *
    `, [name, description, floor_count, is_active, id]);

    if (!result.rows.length) throw createError('Edificio no encontrado', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update };
