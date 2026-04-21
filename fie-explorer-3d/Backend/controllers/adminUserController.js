const bcrypt = require('bcrypt');
const pool   = require('../db/pool');
const { writeAudit } = require('./authController');
const { validatePassword } = require('../utils/passwordValidator');
const log = (msg) => console.log(`  \x1b[35m[USER]\x1b[0m ${msg}`);

async function list(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error('Acceso restringido a superadministradores.'); e.status = 403; return next(e);
  }
  try {
    const { rows } = await pool.query(`
      SELECT id, full_name, email, role, is_active,
             failed_attempts, last_login, created_at
      FROM admin_users ORDER BY created_at ASC
    `);
    log(`Listado: ${rows.length} usuarios`);
    res.json(rows);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error('Acceso restringido a superadministradores.'); e.status = 403; return next(e);
  }

  const { full_name, email, password, role } = req.body;

  // Validaciones básicas
  if (!full_name?.trim() || !email?.trim() || !password) {
    const e = new Error('full_name, email y password son obligatorios.'); e.status = 400; return next(e);
  }
  if (!['admin', 'superadmin'].includes(role)) {
    const e = new Error('Rol inválido. Usar: admin o superadmin.'); e.status = 400; return next(e);
  }

  // ── Validar fortaleza de contraseña ──────────────────────
  const { valid, errors } = validatePassword(password);
  if (!valid) {
    const e = new Error('La contraseña no cumple los requisitos de seguridad:\n• ' + errors.join('\n• '));
    e.status = 422;
    e.passwordErrors = errors;  // para el frontend
    return next(e);
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    // El trigger fn_check_role_limit en la BD validará el límite de roles.
    // Si se supera, PostgreSQL lanza ERRCODE P0001 que capturamos abajo.
    const { rows } = await pool.query(`
      INSERT INTO admin_users (full_name, email, password_hash, role)
      VALUES ($1,$2,$3,$4)
      RETURNING id, full_name, email, role, is_active, created_at
    `, [full_name.trim(), email.toLowerCase().trim(), hash, role]);

    await writeAudit({
      user_id: req.admin.id, action: 'CREATE',
      entity_type: 'admin_users', entity_id: rows[0].id,
      new_values: { full_name: rows[0].full_name, email: rows[0].email, role: rows[0].role },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    log(`✅ CREADO — ${rows[0].email} (${rows[0].role}) por ${req.admin.email}`);
    res.status(201).json(rows[0]);

  } catch (err) {
    // Email duplicado
    if (err.code === '23505') {
      const e = new Error('Ya existe un usuario con ese correo.'); e.status = 409; return next(e);
    }
    // Trigger de límite de roles (ERRCODE P0001)
    if (err.code === 'P0001') {
      const e = new Error(err.message); e.status = 409; return next(e);
    }
    next(err);
  }
}

async function toggleActive(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error('Acceso restringido a superadministradores.'); e.status = 403; return next(e);
  }
  const { id } = req.params;
  if (id === req.admin.id) {
    const e = new Error('No puedes desactivar tu propia cuenta.'); e.status = 400; return next(e);
  }
  try {
    const { rows } = await pool.query(
      `UPDATE admin_users SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING id, full_name, email, role, is_active`, [id]
    );
    if (!rows[0]) { const e = new Error('Usuario no encontrado.'); e.status = 404; return next(e); }

    const action = rows[0].is_active ? 'ACTIVATE' : 'DEACTIVATE';
    await writeAudit({
      user_id: req.admin.id, action,
      entity_type: 'admin_users', entity_id: id,
      new_values: { is_active: rows[0].is_active },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });

    log(`${rows[0].is_active ? '🟢' : '🔴'} ${action} — ${rows[0].email}`);
    res.json(rows[0]);
  } catch (err) {
    // Trigger límite al reactivar
    if (err.code === 'P0001') {
      const e = new Error(err.message); e.status = 409; return next(e);
    }
    next(err);
  }
}

async function resetPassword(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error('Acceso restringido a superadministradores.'); e.status = 403; return next(e);
  }
  const { id } = req.params;
  const { new_password } = req.body;

  // ── Validar fortaleza de la nueva contraseña ─────────────
  const { valid, errors } = validatePassword(new_password || '');
  if (!valid) {
    const e = new Error('La contraseña no cumple los requisitos:\n• ' + errors.join('\n• '));
    e.status = 422;
    e.passwordErrors = errors;
    return next(e);
  }

  try {
    const hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      `UPDATE admin_users SET password_hash=$1, failed_attempts=0,
       locked_until=NULL, updated_at=NOW() WHERE id=$2`,
      [hash, id]
    );
    await writeAudit({
      user_id: req.admin.id, action: 'UPDATE',
      entity_type: 'admin_users', entity_id: id,
      new_values: { password_reset: true },
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    log(`🔑 PASSWORD RESET — usuario ${id} por ${req.admin.email}`);
    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) { next(err); }
}

module.exports = { list, create, toggleActive, resetPassword };
