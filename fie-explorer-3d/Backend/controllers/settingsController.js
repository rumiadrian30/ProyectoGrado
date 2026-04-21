// controllers/settingsController.js
// Gestión de role_limits y system_config — solo superadmin
const pool = require('../db/pool');
const { writeAudit }       = require('./authController');
const { invalidateCache }  = require('../utils/configCache');
const log = (msg) => console.log(`  \x1b[36m[SETTINGS]\x1b[0m ${msg}`);

// ── GET /api/settings/role-limits ───────────────────────────
async function getRoleLimits(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT rl.*, au.full_name AS updated_by_name
      FROM role_limits rl
      LEFT JOIN admin_users au ON au.id = rl.updated_by
      ORDER BY rl.role_name
    `);
    const { rows: counts } = await pool.query(`
      SELECT role, COUNT(*)::int AS active_count
      FROM admin_users WHERE is_active = TRUE GROUP BY role
    `);
    const cm = {};
    counts.forEach(c => { cm[c.role] = c.active_count; });

    res.json(rows.map(r => ({
      ...r,
      active_count: cm[r.role_name] || 0,
      available:    r.max_count - (cm[r.role_name] || 0),
    })));
  } catch (err) { next(err); }
}

// ── PUT /api/settings/role-limits/:role ─────────────────────
async function updateRoleLimit(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error('Acceso restringido.'); e.status = 403; return next(e);
  }
  const { role }      = req.params;
  const { max_count } = req.body;
  if (!['admin','superadmin'].includes(role)) {
    const e = new Error('Rol inválido.'); e.status = 400; return next(e);
  }
  const parsed = parseInt(max_count);
  if (isNaN(parsed) || parsed < 1 || parsed > 20) {
    const e = new Error('El límite debe estar entre 1 y 20.'); e.status = 400; return next(e);
  }
  const { rows: cur } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM admin_users WHERE role=$1 AND is_active=TRUE`, [role]
  );
  if (parsed < (cur[0]?.cnt || 0)) {
    const e = new Error(
      `No puedes bajar el límite a ${parsed}: hay ${cur[0].cnt} usuario(s) activo(s) con el rol "${role}".`
    ); e.status = 409; return next(e);
  }
  try {
    const before = await pool.query(`SELECT max_count FROM role_limits WHERE role_name=$1`, [role]);
    const { rows } = await pool.query(`
      UPDATE role_limits SET max_count=$1, updated_by=$2, updated_at=NOW()
      WHERE role_name=$3 RETURNING *
    `, [parsed, req.admin.id, role]);
    await writeAudit({
      user_id:req.admin.id, action:'UPDATE', entity_type:'role_limits',
      old_values:{ role, max_count:before.rows[0]?.max_count },
      new_values:{ role, max_count:parsed },
      ip_address:req.ip, user_agent:req.headers['user-agent'],
    });
    log(`✅ role_limits: ${role} → ${parsed} (por ${req.admin.email})`);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

// ── GET /api/settings/config ─────────────────────────────────
// Devuelve todos los parámetros visibles agrupados
async function getAllConfig(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT sc.*, au.full_name AS updated_by_name
      FROM system_config sc
      LEFT JOIN admin_users au ON au.id = sc.updated_by
      WHERE sc.is_visible = TRUE
      ORDER BY sc.group_name, sc.id
    `);

    // Agrupar por group_name
    const groups = {};
    rows.forEach(r => {
      if (!groups[r.group_name]) groups[r.group_name] = [];
      groups[r.group_name].push(r);
    });

    res.json({ groups, flat: rows });
  } catch (err) { next(err); }
}

// ── PUT /api/settings/config/:key ───────────────────────────
async function updateConfig(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error('Acceso restringido a superadministradores.'); e.status = 403; return next(e);
  }

  const { key }         = req.params;
  const { config_value } = req.body;

  if (config_value === undefined || config_value === null) {
    const e = new Error('config_value es requerido.'); e.status = 400; return next(e);
  }

  try {
    // Leer definición actual para validar
    const { rows: def } = await pool.query(
      `SELECT * FROM system_config WHERE config_key=$1`, [key]
    );
    if (!def[0]) {
      const e = new Error(`Clave de configuración "${key}" no encontrada.`); e.status = 404; return next(e);
    }

    const cfg     = def[0];
    const val     = String(config_value).trim();

    // Validar según tipo
    if (cfg.value_type === 'integer') {
      const n = parseInt(val);
      if (isNaN(n)) {
        const e = new Error(`El parámetro "${cfg.label}" debe ser un número entero.`); e.status=400; return next(e);
      }
      if (cfg.min_value !== null && n < cfg.min_value) {
        const e = new Error(`"${cfg.label}" debe ser ≥ ${cfg.min_value}.`); e.status=400; return next(e);
      }
      if (cfg.max_value !== null && n > cfg.max_value) {
        const e = new Error(`"${cfg.label}" debe ser ≤ ${cfg.max_value}.`); e.status=400; return next(e);
      }
    }
    if (cfg.value_type === 'boolean' && !['true','false'].includes(val)) {
      const e = new Error(`"${cfg.label}" debe ser true o false.`); e.status=400; return next(e);
    }

    const { rows } = await pool.query(`
      UPDATE system_config
      SET config_value=$1, updated_by=$2, updated_at=NOW()
      WHERE config_key=$3 RETURNING *
    `, [val, req.admin.id, key]);

    // Invalidar cache para que el próximo request lea el nuevo valor
    invalidateCache();

    await writeAudit({
      user_id:req.admin.id, action:'UPDATE', entity_type:'system_config',
      old_values:{ key, value:cfg.config_value },
      new_values:{ key, value:val },
      ip_address:req.ip, user_agent:req.headers['user-agent'],
    });

    log(`✅ ${key} = "${val}" (por ${req.admin.email})`);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

// ── POST /api/settings/config/:key/reset ────────────────────
async function resetConfig(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error('Acceso restringido.'); e.status = 403; return next(e);
  }
  const { key } = req.params;
  try {
    const { rows } = await pool.query(`
      UPDATE system_config
      SET config_value=default_value, updated_by=$1, updated_at=NOW()
      WHERE config_key=$2 RETURNING *
    `, [req.admin.id, key]);
    if (!rows[0]) {
      const e = new Error(`Clave "${key}" no encontrada.`); e.status=404; return next(e);
    }
    invalidateCache();
    log(`🔄 RESET ${key} → "${rows[0].default_value}" (por ${req.admin.email})`);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { getRoleLimits, updateRoleLimit, getAllConfig, updateConfig, resetConfig };
