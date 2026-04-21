const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const pool    = require('../db/pool');

const ENC_KEY = () => process.env.DB_ENCRYPTION_KEY || 'fie_secret_key_2026_AES256';

router.get('/audit-evidence', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id, action, created_at,
        encode(ip_encrypted,    'hex') AS ip_raw_hex,
        encode(agent_encrypted, 'hex') AS agent_raw_hex,
        pgp_sym_decrypt(ip_encrypted,    $1::text) AS ip_dec,
        pgp_sym_decrypt(agent_encrypted, $1::text) AS agent_dec,
        length(ip_encrypted)    AS ip_enc_bytes,
        length(agent_encrypted) AS agent_enc_bytes
      FROM audit_logs
      WHERE ip_encrypted IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `, [ENC_KEY()]);

    res.json({
      table: 'audit_logs',
      encrypted_columns: ['ip_encrypted (BYTEA)', 'agent_encrypted (BYTEA)'],
      algorithm: 'pgp_sym_encrypt / AES-256 (pgcrypto)',
      total: rows.length,
      data: rows,
    });
  } catch (err) { next(err); }
});

router.get('/error-evidence', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id, severity, error_code, error_message, created_at,
        encode(ip_encrypted,      'hex') AS ip_raw_hex,
        encode(message_encrypted, 'hex') AS msg_raw_hex,
        pgp_sym_decrypt(ip_encrypted,      $1::text) AS ip_dec,
        pgp_sym_decrypt(message_encrypted, $1::text) AS message_dec,
        length(ip_encrypted)      AS ip_enc_bytes,
        length(message_encrypted) AS msg_enc_bytes
      FROM error_logs
      WHERE ip_encrypted IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `, [ENC_KEY()]);

    res.json({
      table: 'error_logs',
      encrypted_columns: ['ip_encrypted (BYTEA)', 'message_encrypted (BYTEA)'],
      algorithm: 'pgp_sym_encrypt / AES-256 (pgcrypto)',
      total: rows.length,
      data: rows,
    });
  } catch (err) { next(err); }
});

router.get('/sql-examples', auth, (_req, res) => {
  const key = ENC_KEY();
  res.json({
    description: 'Instrucciones SQL para verificar el cifrado directamente en pgAdmin 4',
    queries: [
      {
        title: '1. SELECT directo — muestra BYTEA cifrado (ilegible)',
        table: 'audit_logs',
        sql: `SELECT id, action, created_at,
       ip_encrypted,
       agent_encrypted
FROM audit_logs
WHERE ip_encrypted IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;`,
        expected: 'ip_encrypted y agent_encrypted aparecen como \\x + bytes hexadecimales (datos ilegibles)',
      },
      {
        title: '2. SELECT con pgp_sym_decrypt — muestra datos descifrados',
        table: 'audit_logs',
        sql: `SELECT id, action, created_at,
       pgp_sym_decrypt(ip_encrypted,    '${key}') AS ip_descifrada,
       pgp_sym_decrypt(agent_encrypted, '${key}') AS agente_descifrado
FROM audit_logs
WHERE ip_encrypted IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;`,
        expected: 'Muestra la IP real (ej. ::1 o 127.0.0.1) y el user-agent del navegador',
      },
      {
        title: '3. SELECT directo en error_logs — BYTEA cifrado',
        table: 'error_logs',
        sql: `SELECT id, severity, error_message,
       ip_encrypted,
       message_encrypted
FROM error_logs
WHERE ip_encrypted IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;`,
        expected: 'error_message = "[CIFRADO]"; ip_encrypted y message_encrypted son BYTEA ilegibles',
      },
      {
        title: '4. SELECT con descifrado en error_logs',
        table: 'error_logs',
        sql: `SELECT id, severity, created_at,
       pgp_sym_decrypt(ip_encrypted,      '${key}') AS ip_descifrada,
       pgp_sym_decrypt(message_encrypted, '${key}') AS mensaje_descifrado
FROM error_logs
WHERE ip_encrypted IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;`,
        expected: 'Muestra la IP real y el mensaje de error original',
      },
      {
        title: '5. Verificar en admin_users — password_hash bcrypt',
        table: 'admin_users',
        sql: `SELECT id, full_name, email,
       password_hash,
       encode(email_encrypted, 'hex') AS email_enc_hex
FROM admin_users;`,
        expected: 'password_hash comienza con $2b$ (bcrypt); email_encrypted es BYTEA',
      },
    ],
  });
});

module.exports = router;
