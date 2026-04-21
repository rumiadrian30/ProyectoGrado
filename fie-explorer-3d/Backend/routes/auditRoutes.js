const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const pool    = require('../db/pool');

const ENC_KEY = () => process.env.DB_ENCRYPTION_KEY || 'fie_secret_key_2026_AES256';

// Intenta descifrar una columna BYTEA; devuelve placeholder si la clave no coincide
async function safeDecrypt(col, key) {
  try {
    const { rows } = await pool.query(
      `SELECT pgp_sym_decrypt($1, $2::text) AS val`,
      [col, key]
    );
    return rows[0]?.val ?? null;
  } catch {
    return null; // clave incorrecta o dato corrupto
  }
}

// GET /api/audit-logs?limit=100&action=CREATE
router.get('/', auth, async (req, res, next) => {
  const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
  const action = req.query.action;

  try {
    // Primero traer los datos base sin intentar descifrar
    let sql = `
      SELECT
        al.id,
        au.full_name  AS admin_name,
        au.email      AS admin_email,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.created_at,
        al.ip_address::text     AS ip_address,
        al.user_agent::text     AS user_agent,
        al.ip_encrypted,
        al.agent_encrypted
      FROM  audit_logs   al
      LEFT  JOIN admin_users au ON au.id = al.user_id
    `;
    const vals = [];
    if (action) { sql += ` WHERE al.action = $1`; vals.push(action); }
    sql += ` ORDER BY al.created_at DESC LIMIT $${vals.length + 1}`;
    vals.push(limit);

    const { rows } = await pool.query(sql, vals);

    // Descifrar en Node.js para manejar errores por fila sin romper todo
    const key = ENC_KEY();
    const data = await Promise.all(rows.map(async (row) => {
      let ip_dec    = null;
      let agent_dec = null;
      let ip_raw_hex    = null;
      let agent_raw_hex = null;

      if (row.ip_encrypted) {
        ip_raw_hex = row.ip_encrypted.toString('hex');
        try {
          const r = await pool.query(
            `SELECT pgp_sym_decrypt($1, $2::text) AS v`, [row.ip_encrypted, key]
          );
          ip_dec = r.rows[0]?.v ?? null;
        } catch { ip_dec = null; }
      }

      if (row.agent_encrypted) {
        agent_raw_hex = row.agent_encrypted.toString('hex');
        try {
          const r = await pool.query(
            `SELECT pgp_sym_decrypt($1, $2::text) AS v`, [row.agent_encrypted, key]
          );
          agent_dec = r.rows[0]?.v ?? null;
        } catch { agent_dec = null; }
      }

      return {
        id:           row.id,
        admin_name:   row.admin_name,
        admin_email:  row.admin_email,
        action:       row.action,
        entity_type:  row.entity_type,
        entity_id:    row.entity_id,
        old_values:   row.old_values,
        new_values:   row.new_values,
        created_at:   row.created_at,
        ip_dec,
        agent_dec,
        ip_raw_hex:    ip_raw_hex    ? ip_raw_hex.slice(0, 48) + '…'    : null,
        agent_raw_hex: agent_raw_hex ? agent_raw_hex.slice(0, 48) + '…' : null,
      };
    }));

    console.log(`  [AUDIT] ${data.length} registros devueltos (filtro: ${action || 'ALL'})`);
    res.json({ total: data.length, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
