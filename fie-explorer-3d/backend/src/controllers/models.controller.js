const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /api/models?building_id=xxx&model_type=exterior&lod_level=0
const getAll = async (req, res, next) => {
  try {
    const { building_id, model_type, lod_level } = req.query;
    const conditions = ['m.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (building_id) { conditions.push(`m.building_id = $${idx++}`); params.push(building_id); }
    if (model_type) { conditions.push(`m.model_type = $${idx++}`); params.push(model_type); }
    if (lod_level !== undefined) { conditions.push(`m.lod_level = $${idx++}`); params.push(parseInt(lod_level)); }

    const result = await query(`
      SELECT m.*, b.name AS building_name, b.code AS building_code
      FROM models_3d m
      JOIN buildings b ON b.id = m.building_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.lod_level ASC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/models  (protegido)
const create = async (req, res, next) => {
  try {
    const { building_id, model_type, file_path, file_size_mb, triangle_count, lod_level, format, version } = req.body;
    const result = await query(`
      INSERT INTO models_3d
        (building_id, model_type, file_path, file_size_mb, triangle_count, lod_level, format, version)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [building_id, model_type, file_path, file_size_mb, triangle_count,
        lod_level || 0, format || 'GLB', version]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create };
