// db/pool.js — Conexión a PostgreSQL usando pg
require('dotenv').config();

const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const basePoolOptions = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  options: '-c search_path=public',
};

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: isProduction
        ? {
            rejectUnauthorized: false,
          }
        : false,
      ...basePoolOptions,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'fie_explorer_3d',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: isProduction
        ? {
            rejectUnauthorized: false,
          }
        : false,
      ...basePoolOptions,
    };

if (process.env.DATABASE_URL) {
  try {
    const parsed = new URL(process.env.DATABASE_URL.trim());

    console.log('[DB DEBUG]', {
      username: parsed.username,
      host: parsed.hostname,
      port: parsed.port,
      database: parsed.pathname,
      search_path: 'public',
    });
  } catch (err) {
    console.error('[DB DEBUG] DATABASE_URL inválida:', err.message);
  }
}

const pool = new Pool(poolConfig);

pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌  Error conectando a PostgreSQL:', err.message);

    if (process.env.DATABASE_URL) {
      console.error('    Verifica DATABASE_URL en las variables de entorno.');
    } else {
      console.error('    Verifica DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD en .env');
    }

    return;
  }

  try {
    const info = await client.query(`
      SELECT 
        current_database() AS database,
        current_schema() AS schema,
        current_user AS user,
        current_setting('search_path') AS search_path,
        to_regclass('public.buildings') AS buildings_table,
        to_regclass('public.hotspots') AS hotspots_table,
        to_regclass('public.error_logs') AS error_logs_table
    `);

    console.log('[DB CHECK]', info.rows[0]);
  } catch (checkErr) {
    console.error('⚠  No se pudo verificar tablas PostgreSQL:', checkErr.message);
  } finally {
    release();
  }

  if (process.env.DATABASE_URL) {
    const safeUrl = process.env.DATABASE_URL
      .trim()
      .replace(/:\/\/.*@/, '://***@');

    console.log(`✅  PostgreSQL conectado → ${safeUrl}`);
  } else {
    console.log(
      `✅  PostgreSQL conectado → ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`
    );
  }
});

module.exports = pool;