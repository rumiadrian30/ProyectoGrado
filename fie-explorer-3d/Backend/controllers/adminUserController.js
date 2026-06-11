// Backend/controllers/adminUserController.js

const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { writeAudit } = require('./authController');
const { validatePassword } = require('../utils/passwordValidator');

const {
  notifyPasswordReset,
  notifyAccountDeactivated,
  notifyAccountActivated,
  notifyAccountDeleted,
} = require('../utils/emailService');

const log = (msg) => {
  console.log(`  \x1b[35m[USER]\x1b[0m ${msg}`);
};

// ─────────────────────────────────────────────────────────────
// Utilidad para interpretar la opción de notificación
// ─────────────────────────────────────────────────────────────

function parseNotifyOption(value, defaultValue = true) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return String(value).toLowerCase() === 'true';
}

// ─────────────────────────────────────────────────────────────
// Listar usuarios administradores
// ─────────────────────────────────────────────────────────────

async function list(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error(
      'Acceso restringido a superadministradores.'
    );

    e.status = 403;
    return next(e);
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        role,
        is_active,
        failed_attempts,
        last_login,
        created_at
      FROM admin_users
      ORDER BY created_at ASC
    `);

    log(`Listado: ${rows.length} usuarios`);

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Crear usuario administrador
// ─────────────────────────────────────────────────────────────

async function create(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error(
      'Acceso restringido a superadministradores.'
    );

    e.status = 403;
    return next(e);
  }

  const {
    full_name,
    email,
    password,
    role,
  } = req.body;

  if (
    !full_name?.trim() ||
    !email?.trim() ||
    !password
  ) {
    const e = new Error(
      'full_name, email y password son obligatorios.'
    );

    e.status = 400;
    return next(e);
  }

  if (!['admin', 'superadmin'].includes(role)) {
    const e = new Error(
      'Rol inválido. Usar: admin o superadmin.'
    );

    e.status = 400;
    return next(e);
  }

  const {
    valid,
    errors,
  } = validatePassword(password);

  if (!valid) {
    const e = new Error(
      'La contraseña no cumple los requisitos de seguridad:\n• ' +
      errors.join('\n• ')
    );

    e.status = 422;
    e.passwordErrors = errors;

    return next(e);
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `
        INSERT INTO admin_users (
          full_name,
          email,
          password_hash,
          role
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          full_name,
          email,
          role,
          is_active,
          created_at
      `,
      [
        full_name.trim(),
        email.toLowerCase().trim(),
        hash,
        role,
      ]
    );

    await writeAudit({
      user_id: req.admin.id,
      action: 'CREATE',
      entity_type: 'admin_users',
      entity_id: rows[0].id,

      new_values: {
        full_name: rows[0].full_name,
        email: rows[0].email,
        role: rows[0].role,
      },

      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    log(
      `CREADO — ${rows[0].email} (${rows[0].role}) ` +
      `por ${req.admin.email}`
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error(
        'Ya existe un usuario con ese correo.'
      );

      e.status = 409;
      return next(e);
    }

    if (err.code === 'P0001') {
      const e = new Error(err.message);

      e.status = 409;
      return next(e);
    }

    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Activar o desactivar usuario
// ─────────────────────────────────────────────────────────────

async function toggleActive(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error(
      'Acceso restringido a superadministradores.'
    );

    e.status = 403;
    return next(e);
  }

  const { id } = req.params;

  const notify = parseNotifyOption(
    req.body?.notify,
    true
  );

  if (String(id) === String(req.admin.id)) {
    const e = new Error(
      'No puedes desactivar tu propia cuenta.'
    );

    e.status = 400;
    return next(e);
  }

  try {
    const { rows } = await pool.query(
      `
        UPDATE admin_users
        SET
          is_active = NOT is_active,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          full_name,
          email,
          role,
          is_active
      `,
      [id]
    );

    if (!rows[0]) {
      const e = new Error(
        'Usuario no encontrado.'
      );

      e.status = 404;
      return next(e);
    }

    const targetUser = rows[0];

    const action = targetUser.is_active
      ? 'ACTIVATE'
      : 'DEACTIVATE';

    await writeAudit({
      user_id: req.admin.id,
      action,
      entity_type: 'admin_users',
      entity_id: id,

      new_values: {
        is_active: targetUser.is_active,
        notification_requested: notify,
      },

      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    if (notify) {
      if (targetUser.is_active) {
        void notifyAccountActivated({
          targetUser,
          changedBy: req.admin,
          ip: req.ip,
        });
      } else {
        void notifyAccountDeactivated({
          targetUser,
          changedBy: req.admin,
          ip: req.ip,
        });
      }
    }

    log(
      `${targetUser.is_active ? 'ACTIVADO' : 'DESACTIVADO'} — ` +
      `${targetUser.email} — ` +
      `notificación solicitada: ${notify ? 'sí' : 'no'}`
    );

    res.json({
      ...targetUser,
      notificationRequested: notify,
    });
  } catch (err) {
    if (err.code === 'P0001') {
      const e = new Error(err.message);

      e.status = 409;
      return next(e);
    }

    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Restablecer contraseña
// ─────────────────────────────────────────────────────────────

async function resetPassword(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error(
      'Acceso restringido a superadministradores.'
    );

    e.status = 403;
    return next(e);
  }

  const { id } = req.params;
  const { new_password } = req.body;

  const notify = parseNotifyOption(
    req.body?.notify,
    true
  );

  const {
    valid,
    errors,
  } = validatePassword(new_password || '');

  if (!valid) {
    const e = new Error(
      'La contraseña no cumple los requisitos:\n• ' +
      errors.join('\n• ')
    );

    e.status = 422;
    e.passwordErrors = errors;

    return next(e);
  }

  try {
    const hash = await bcrypt.hash(
      new_password,
      12
    );

    const { rows: updated } = await pool.query(
      `
        UPDATE admin_users
        SET
          password_hash = $1,
          failed_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
        WHERE id = $2
        RETURNING
          id,
          full_name,
          email
      `,
      [
        hash,
        id,
      ]
    );

    if (!updated[0]) {
      const e = new Error(
        'Usuario no encontrado.'
      );

      e.status = 404;
      return next(e);
    }

    await writeAudit({
      user_id: req.admin.id,
      action: 'UPDATE',
      entity_type: 'admin_users',
      entity_id: id,

      new_values: {
        password_reset: true,
        notification_requested: notify,
      },

      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    if (notify) {
      void notifyPasswordReset({
        targetUser: updated[0],
        changedBy: req.admin,
        ip: req.ip,
      });
    }

    log(
      `PASSWORD RESET — usuario ${id} ` +
      `por ${req.admin.email} — ` +
      `notificación solicitada: ${notify ? 'sí' : 'no'}`
    );

    res.json({
      message:
        'Contraseña actualizada correctamente.',

      notificationRequested: notify,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// Eliminar usuario permanentemente
// ─────────────────────────────────────────────────────────────

/**
 * DELETE /api/admin-users/:id
 *
 * Ejemplo con notificación:
 * DELETE /api/admin-users/10?notify=true
 *
 * Ejemplo sin notificación:
 * DELETE /api/admin-users/10?notify=false
 */
async function remove(req, res, next) {
  if (req.admin.role !== 'superadmin') {
    const e = new Error(
      'Acceso restringido a superadministradores.'
    );

    e.status = 403;
    return next(e);
  }

  const { id } = req.params;

  const notify = parseNotifyOption(
    req.query?.notify,
    true
  );

  if (String(id) === String(req.admin.id)) {
    const e = new Error(
      'No puedes eliminar tu propia cuenta.'
    );

    e.status = 400;
    return next(e);
  }

  const client = await pool.connect();

  let target = null;
  let transactionFinished = false;

  try {
    await client.query('BEGIN');

    const { rows: found } = await client.query(
      `
        SELECT
          id,
          full_name,
          email,
          role,
          is_active
        FROM admin_users
        WHERE id = $1
      `,
      [id]
    );

    if (!found[0]) {
      await client.query('ROLLBACK');

      transactionFinished = true;

      const e = new Error(
        'Usuario no encontrado.'
      );

      e.status = 404;
      return next(e);
    }

    target = found[0];

    if (target.role === 'superadmin') {
      const { rows: superCount } =
        await client.query(`
          SELECT COUNT(*)::int AS cnt
          FROM admin_users
          WHERE role = 'superadmin'
            AND is_active = true
        `);

      if (superCount[0].cnt <= 1) {
        await client.query('ROLLBACK');

        transactionFinished = true;

        const e = new Error(
          'No se puede eliminar al único ' +
          'superadministrador activo del sistema.'
        );

        e.status = 409;
        return next(e);
      }
    }

    await writeAudit({
      user_id: req.admin.id,
      action: 'DELETE',
      entity_type: 'admin_users',
      entity_id: id,

      old_values: {
        full_name: target.full_name,
        email: target.email,
        role: target.role,
      },

      new_values: {
        notification_requested: notify,
      },

      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    await client.query(
      `
        DELETE FROM admin_users
        WHERE id = $1
      `,
      [id]
    );

    await client.query('COMMIT');

    transactionFinished = true;

    if (notify) {
      void notifyAccountDeleted({
        targetUser: target,
        changedBy: req.admin,
        ip: req.ip,
      });
    }

    log(
      `HARD DELETE — ${target.email} (${target.role}) ` +
      `eliminado por ${req.admin.email} — ` +
      `notificación solicitada: ${notify ? 'sí' : 'no'}`
    );

    res.json({
      message:
        `Usuario "${target.full_name}" ` +
        'eliminado permanentemente.',

      notificationRequested: notify,
    });
  } catch (err) {
    if (!transactionFinished) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        log(
          `Error al revertir transacción: ` +
          rollbackError.message
        );
      }
    }

    next(err);
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// Exportaciones
// ─────────────────────────────────────────────────────────────

module.exports = {
  list,
  create,
  toggleActive,
  resetPassword,
  remove,
};
