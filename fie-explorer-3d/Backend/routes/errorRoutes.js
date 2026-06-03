const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const pool    = require('../db/pool');
const { logError } = require('../middleware/errorMiddleware');

const ENC_KEY = () => process.env.DB_ENCRYPTION_KEY || 'fie_secret_key_2026_AES256';

// GET /api/error-logs?severity=ERROR&limit=100
router.get('/', auth, async (req, res, next) => {
  const limit    = Math.min(parseInt(req.query.limit) || 100, 1000);
  const severity = req.query.severity;

  try {
    let sql = `
      SELECT
        id, error_code, error_message, severity,
        endpoint, method, user_id, created_at,
        ip_address::text AS ip_address,
        ip_encrypted,
        message_encrypted
      FROM error_logs
    `;
    const vals = [];
    if (severity) { sql += ` WHERE severity = $1`; vals.push(severity.toUpperCase()); }
    sql += ` ORDER BY created_at DESC LIMIT $${vals.length + 1}`;
    vals.push(limit);

    const { rows } = await pool.query(sql, vals);

    const key = ENC_KEY();
    const data = await Promise.all(rows.map(async (row) => {
      let ip_dec      = null;
      let message_dec = null;
      let ip_raw_hex  = null;
      let msg_raw_hex = null;

      if (row.ip_encrypted) {
        ip_raw_hex = row.ip_encrypted.toString('hex');
        try {
          const r = await pool.query(
            `SELECT pgp_sym_decrypt($1, $2::text) AS v`, [row.ip_encrypted, key]
          );
          ip_dec = r.rows[0]?.v ?? null;
        } catch { ip_dec = null; }
      }

      if (row.message_encrypted) {
        msg_raw_hex = row.message_encrypted.toString('hex');
        try {
          const r = await pool.query(
            `SELECT pgp_sym_decrypt($1, $2::text) AS v`, [row.message_encrypted, key]
          );
          message_dec = r.rows[0]?.v ?? null;
        } catch { message_dec = null; }
      }

      return {
        id:            row.id,
        error_code:    row.error_code,
        error_message: row.error_message,
        severity:      row.severity,
        endpoint:      row.endpoint,
        method:        row.method,
        user_id:       row.user_id,
        created_at:    row.created_at,
        ip_dec,
        message_dec,
        ip_raw_hex:  ip_raw_hex  ? ip_raw_hex.slice(0, 48)  + '…' : null,
        msg_raw_hex: msg_raw_hex ? msg_raw_hex.slice(0, 48) + '…' : null,
      };
    }));

    console.log(`  [ERRORS] ${data.length} registros devueltos (filtro: ${severity || 'ALL'})`);
    res.json({ total: data.length, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/error-logs/summary
router.get('/summary', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_errors_summary`);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /api/error-logs/test
router.post('/test', auth, async (req, res, next) => {
  const { severity = 'ERROR', message = 'Error de prueba' } = req.body;
  await logError({
    error_code: 'TEST_ERROR', error_message: message, severity,
    endpoint: '/api/error-logs/test', method: 'POST',
    user_id: req.admin.id, ip_address: req.ip,
  });
  console.log(`  [TEST] Error de prueba insertado: "${message}" [${severity}]`);
  res.json({ message: `Registro "${message}" guardado correctamente.` });
});

// Mismos filtros que GET /, sin paginación, devuelve CSV
router.get('/export', auth, async (req, res, next) => {
  const key = ENC_KEY();
  try {
    const { severity, date_from, date_to } = req.query;

    const conditions = [];
    const vals       = [];
    let   idx        = 1;

    if (severity && severity !== 'ALL') {
      conditions.push(`severity = $${idx++}`);
      vals.push(severity.toUpperCase());
    }
    if (date_from) {
      conditions.push(`created_at >= $${idx++}`);
      vals.push(date_from + ' 00:00:00');
    }
    if (date_to) {
      conditions.push(`created_at <= $${idx++}`);
      vals.push(date_to + ' 23:59:59');
    }

    const where = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const { rows } = await pool.query(`
      SELECT
        id, error_code, error_message, severity,
        endpoint, method, user_id, created_at,
        ip_address::text AS ip_address,
        ip_encrypted,
        message_encrypted
      FROM error_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT 5000
    `, vals);

    // Desencriptar campos igual que en GET /
    const data = await Promise.all(rows.map(async (row) => {
      let ip_final  = row.ip_address ?? '';
      let msg_final = row.error_message ?? '';

      if (row.ip_encrypted) {
        try {
          const r = await pool.query(
            `SELECT pgp_sym_decrypt($1, $2::text) AS v`,
            [row.ip_encrypted, key]
          );
          ip_final = r.rows[0]?.v ?? ip_final;
        } catch { /* mantener ip_address plana */ }
      }

      if (row.message_encrypted) {
        try {
          const r = await pool.query(
            `SELECT pgp_sym_decrypt($1, $2::text) AS v`,
            [row.message_encrypted, key]
          );
          msg_final = r.rows[0]?.v ?? msg_final;
        } catch { /* mantener error_message plano */ }
      }

      return {
        fecha:         new Date(row.created_at).toISOString().replace('T', ' ').slice(0, 19),
        severity:      row.severity      ?? '',
        error_code:    row.error_code    ?? '',
        error_message: msg_final,
        ip:            ip_final,
        endpoint:      row.endpoint      ?? '',
        method:        row.method        ?? '',
        user_id:       row.user_id       ?? '',
      };
    }));

    const headers = ['fecha', 'severity', 'error_code', 'error_message', 'ip', 'endpoint', 'method', 'user_id'];
    const escape  = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv     = [
      headers.join(','),
      ...data.map(row => headers.map(h => escape(row[h])).join(',')),
    ].join('\r\n');

    const ts = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type',        'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="error_logs_${ts}.csv"`);
    res.send('\uFEFF' + csv);

  } catch (err) { next(err); }
});

module.exports = router;
