const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const pool    = require('../db/pool');

const ENC_KEY = () => process.env.DB_ENCRYPTION_KEY || 'fie_secret_key_2026_AES256';

async function decryptField(buf, key) {
  if (!buf) return null;
  try {
    const { rows } = await pool.query(
      `SELECT pgp_sym_decrypt($1, $2::text) AS v`, [buf, key]
    );
    return rows[0]?.v ?? null;
  } catch { return null; }
}

function buildWhere(query) {
  const conds = [];
  const vals  = [];
  let   idx   = 1;

  if (query.action && query.action !== 'ALL') {
    conds.push(`al.action = $${idx++}`);
    vals.push(query.action);
  }
  if (query.date_from) {
    conds.push(`al.created_at >= $${idx++}`);
    vals.push(query.date_from);
  }
  if (query.date_to) {
    // inclusive: end of day
    conds.push(`al.created_at < ($${idx++}::date + interval '1 day')`);
    vals.push(query.date_to);
  }
  if (query.entity_type) {
    conds.push(`al.entity_type = $${idx++}`);
    vals.push(query.entity_type);
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  return { where, vals, idx };
}

// ── GET /api/audit-logs ─────────────────────────────────────────────────────
// Query params: action, date_from, date_to, entity_type, page, per_page
router.get('/', auth, async (req, res, next) => {
  const perPage = Math.min(parseInt(req.query.per_page) || 25, 200);
  const page    = Math.max(parseInt(req.query.page) || 1, 1);
  const offset  = (page - 1) * perPage;
  const key     = ENC_KEY();

  try {
    const { where, vals, idx } = buildWhere(req.query);

    // Total count
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs al ${where}`, vals
    );
    const total = countRes.rows[0].total;

    // Data page
    const dataVals = [...vals, perPage, offset];
    const { rows } = await pool.query(`
      SELECT
        al.id, al.action, al.entity_type, al.entity_id,
        al.old_values, al.new_values, al.created_at,
        al.ip_address::text   AS ip_address,
        al.ip_encrypted,
        al.agent_encrypted,
        au.full_name  AS admin_name,
        au.email      AS admin_email
      FROM  audit_logs al
      LEFT  JOIN admin_users au ON au.id = al.user_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, dataVals);

    const data = await Promise.all(rows.map(async (row) => {
      const ip_dec    = await decryptField(row.ip_encrypted,    key);
      const agent_dec = await decryptField(row.agent_encrypted, key);
      return {
        id:          row.id,
        admin_name:  row.admin_name,
        admin_email: row.admin_email,
        action:      row.action,
        entity_type: row.entity_type,
        entity_id:   row.entity_id,
        old_values:  row.old_values,
        new_values:  row.new_values,
        created_at:  row.created_at,
        ip_address:  ip_dec ?? row.ip_address ?? null,
        ip_raw_hex:  row.ip_encrypted
          ? row.ip_encrypted.toString('hex').slice(0, 40) + '…'
          : null,
        agent_dec,
      };
    }));

    res.json({
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
      data,
    });
  } catch (err) { next(err); }
});

// ── GET /api/audit-logs/export  → CSV ──────────────────────────────────────
router.get('/export', auth, async (req, res, next) => {
  const key = ENC_KEY();
  try {
    const { where, vals } = buildWhere(req.query);

    const { rows } = await pool.query(`
      SELECT
        al.id, al.action, al.entity_type, al.entity_id,
        al.old_values, al.new_values, al.created_at,
        al.ip_address::text AS ip_address,
        al.ip_encrypted,
        al.agent_encrypted,
        au.full_name  AS admin_name,
        au.email      AS admin_email
      FROM  audit_logs al
      LEFT  JOIN admin_users au ON au.id = al.user_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT 5000
    `, vals);

    const data = await Promise.all(rows.map(async (row) => {
      const ip    = await decryptField(row.ip_encrypted,    key) ?? row.ip_address ?? '';
      const agent = await decryptField(row.agent_encrypted, key) ?? '';
      return {
        fecha:       new Date(row.created_at).toISOString().replace('T',' ').slice(0,19),
        admin_name:  row.admin_name  ?? '',
        admin_email: row.admin_email ?? '',
        action:      row.action,
        entidad:     row.entity_type ?? 'auth',
        entidad_id:  row.entity_id   ?? '',
        ip,
        agente:      agent.slice(0, 120),
        old_values:  row.old_values  ? JSON.stringify(row.old_values)  : '',
        new_values:  row.new_values  ? JSON.stringify(row.new_values)  : '',
      };
    }));

    const headers = ['fecha','admin_name','admin_email','action','entidad','entidad_id','ip','agente','old_values','new_values'];
    const escape  = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv     = [
      headers.join(','),
      ...data.map(row => headers.map(h => escape(row[h])).join(','))
    ].join('\r\n');

    const ts = new Date().toISOString().slice(0,10);
    res.setHeader('Content-Type',        'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${ts}.csv"`);
    res.send('\uFEFF' + csv); // BOM para Excel
  } catch (err) { next(err); }
});

module.exports = router;
