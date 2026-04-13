const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const env = require('../config/env');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw createError('Email y contraseña requeridos', 400);

    const result = await query(
      `SELECT * FROM admin_users WHERE email = $1 AND is_active = TRUE`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // Usuario no existe — responder igual para no revelar si existe
    if (!user) {
      logger.warn('Intento de login con email inexistente', { email, ip: req.ip });
      throw createError('Credenciales inválidas', 401);
    }

    // Verificar bloqueo temporal
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
      throw createError(`Cuenta bloqueada. Intenta en ${remaining} min`, 429);
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      const attempts = user.failed_attempts + 1;
      const lockUpdate = attempts >= MAX_ATTEMPTS
        ? `, locked_until = NOW() + INTERVAL '${LOCK_MINUTES} minutes'`
        : '';
      await query(
        `UPDATE admin_users SET failed_attempts = $1${lockUpdate} WHERE id = $2`,
        [attempts, user.id]
      );
      logger.warn('Intento de login fallido', { email, attempts, ip: req.ip });
      throw createError('Credenciales inválidas', 401);
    }

    // Login exitoso — resetear contadores y registrar
    await query(
      `UPDATE admin_users SET failed_attempts=0, locked_until=NULL, last_login=NOW() WHERE id=$1`,
      [user.id]
    );

    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1,'LOGIN',$2)`,
      [user.id, req.ip]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.full_name },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    logger.info('Login exitoso', { email, role: user.role, ip: req.ip });

    res.json({
      success: true,
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  (protegido)
const me = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, full_name, email, role, last_login FROM admin_users WHERE id = $1`,
      [req.admin.id]
    );
    if (!result.rows.length) throw createError('Usuario no encontrado', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout  (protegido)
const logout = async (req, res, next) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1,'LOGOUT',$2)`,
      [req.admin.id, req.ip]
    );
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, me, logout };
