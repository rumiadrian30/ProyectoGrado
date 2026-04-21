const pool = require('../db/pool');
const { writeAudit } = require('./authController');
const log = (msg) => console.log(`  \x1b[33m[IMAGE]\x1b[0m ${msg}`);

async function listByHotspot(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM hotspot_images WHERE hotspot_id = $1 ORDER BY sort_order ASC`,
      [req.params.hotspotId]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  const { hotspot_id, url, alt_text, sort_order } = req.body;
  if (!hotspot_id || !url?.trim()) {
    const e = new Error('hotspot_id y url son obligatorios.'); e.status = 400; return next(e);
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO hotspot_images (hotspot_id, url, alt_text, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [hotspot_id, url.trim(), alt_text||null, sort_order??0]
    );
    await writeAudit({
      user_id: req.admin.id, action: 'CREATE', entity_type: 'hotspot_images', entity_id: rows[0].id,
      new_values: { hotspot_id, url: rows[0].url },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`✅ AGREGADA — imagen para hotspot ${hotspot_id}`);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  const { id } = req.params;
  const { url, alt_text, sort_order } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE hotspot_images SET
        url        = COALESCE($1, url),
        alt_text   = COALESCE($2, alt_text),
        sort_order = COALESCE($3, sort_order)
      WHERE id = $4 RETURNING *
    `, [url, alt_text, sort_order, id]);
    if (!rows[0]) { const e = new Error('Imagen no encontrada.'); e.status = 404; return next(e); }
    log(`✏️  ACTUALIZADA — imagen ${id}`);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  const { id } = req.params;
  try {
    const before = await pool.query(`SELECT * FROM hotspot_images WHERE id = $1`, [id]);
    if (!before.rows[0]) { const e = new Error('Imagen no encontrada.'); e.status = 404; return next(e); }
    await pool.query(`DELETE FROM hotspot_images WHERE id = $1`, [id]);
    await writeAudit({
      user_id: req.admin.id, action: 'DELETE', entity_type: 'hotspot_images', entity_id: id,
      old_values: { url: before.rows[0].url, hotspot_id: before.rows[0].hotspot_id },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`🗑️  ELIMINADA — imagen ${before.rows[0].url}`);
    res.json({ message: 'Imagen eliminada correctamente.' });
  } catch (err) { next(err); }
}

module.exports = { listByHotspot, create, update, remove };
