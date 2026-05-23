// controllers/authController.js
// Login/Logout con parámetros de seguridad leídos desde system_config
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { logError }     = require('../middleware/errorMiddleware');
const { getConfig }    = require('../utils/configCache');

const ENC_KEY = () => process.env.DB_ENCRYPTION_KEY || 'fie_secret_key_2026_AES256';

// ── Helper: insertar en audit_logs con cifrado ───────────────
async function writeAudit({ user_id, action, entity_type = null, entity_id = null,
  old_values = null, new_values = null, ip_address, user_agent }) {
  const ip    = ip_address || 'unknown';
  const agent = user_agent || 'unknown';
  await pool.query(
    `INSERT INTO audit_logs
       (user_id, action, entity_type, entity_id,
        old_values, new_values,
        ip_address, user_agent,
        ip_encrypted, agent_encrypted)
     VALUES ($1,$2,$3,$4,$5,$6,NULL,NULL,
       pgp_sym_encrypt($7::text,$8::text),
       pgp_sym_encrypt($9::text,$8::text))`,
    [user_id, action, entity_type, entity_id,
     old_values ? JSON.stringify(old_values) : null,
     new_values ? JSON.stringify(new_values) : null,
     ip, ENC_KEY(), agent]
  );
}

// ── POST /api/auth/login ─────────────────────────────────────
async function login(req, res, next) {
  const ip         = req.ip || req.connection?.remoteAddress;
  const user_agent = req.headers['user-agent'];
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  // ── Leer configuración desde BD (con fallbacks seguros) ────
  const MAX_ATTEMPTS    = await getConfig('login.max_attempts',         5);
  const LOCKOUT_MINUTES = await getConfig('login.lockout_minutes',      30);
  const WARN_FROM       = await getConfig('login.lockout_warning_from', 3);

  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, password_hash, role, is_active,
              failed_attempts, locked_until
       FROM admin_users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    const user         = rows[0];
    const genericError = 'Correo o contraseña incorrectos.';

    if (!user) {
      await logError({ error_code:'401', error_message:'Login fallido: email no encontrado',
        severity:'WARN', endpoint:'/api/auth/login', method:'POST', ip_address:ip });
      return res.status(401).json({ error: genericError });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        error: `Cuenta bloqueada. Intenta en ${remaining} minuto${remaining !== 1 ? 's' : ''}.`
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      const newAttempts = user.failed_attempts + 1;
      const lockUntil   = newAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await pool.query(
        `UPDATE admin_users SET failed_attempts=$1, locked_until=$2, updated_at=NOW() WHERE id=$3`,
        [newAttempts, lockUntil, user.id]
      );
      await logError({
        error_code:'401',
        error_message:`Login fallido para ${email} (intento ${newAttempts}/${MAX_ATTEMPTS})`,
        severity:'WARN', endpoint:'/api/auth/login', method:'POST',
        user_id:user.id, ip_address:ip,
      });

      // Mensaje con advertencia progresiva
      let msg = genericError;
      if (newAttempts >= MAX_ATTEMPTS) {
        msg = `Cuenta bloqueada por ${LOCKOUT_MINUTES} minuto${LOCKOUT_MINUTES !== 1 ? 's' : ''} por exceso de intentos.`;
      } else if (newAttempts >= WARN_FROM) {
        const left = MAX_ATTEMPTS - newAttempts;
        msg = `${genericError} ${left} intento${left !== 1 ? 's' : ''} restante${left !== 1 ? 's' : ''} antes del bloqueo.`;
      }

      return res.status(401).json({ error: msg, attempts: newAttempts, max: MAX_ATTEMPTS });
    }

    // ── Login correcto ────────────────────────────────────────
    const SESSION_MINUTES = await getConfig('session.token_expires_minutes', 30);

    await pool.query(
      `UPDATE admin_users SET failed_attempts=0, locked_until=NULL,
       last_login=NOW(), updated_at=NOW() WHERE id=$1`,
      [user.id]
    );

    const token = jwt.sign(
      { userId:user.id, email:user.email, role:user.role },
      process.env.JWT_SECRET,
      { expiresIn: `${SESSION_MINUTES}m` }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   SESSION_MINUTES * 60 * 1000,
    });

    await writeAudit({ user_id:user.id, action:'LOGIN', ip_address:ip, user_agent });
    console.log(`  \x1b[32m[AUTH]\x1b[0m LOGIN — ${user.email} (${user.role})`);

    res.json({
      message: 'Sesión iniciada correctamente.',
      user: { id:user.id, full_name:user.full_name, email:user.email, role:user.role },
      token,
    });

  } catch (err) { next(err); }
}

// ── POST /api/auth/logout ────────────────────────────────────
async function logout(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress;
  try {
    if (req.admin?.id) {
      await writeAudit({ user_id:req.admin.id, action:'LOGOUT',
        ip_address:ip, user_agent:req.headers['user-agent'] });
    }
    res.clearCookie('token');
    console.log(`  \x1b[33m[AUTH]\x1b[0m LOGOUT — ${req.admin?.email || 'desconocido'}`);
    res.json({ message: 'Sesión cerrada.' });
  } catch (err) { next(err); }
}

// ── GET /api/auth/me ─────────────────────────────────────────
async function me(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, last_login FROM admin_users WHERE id=$1`,
      [req.admin.id]
    );
    if (!rows[0]) return res.status(404).json({ error:'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { login, logout, me, writeAudit };
