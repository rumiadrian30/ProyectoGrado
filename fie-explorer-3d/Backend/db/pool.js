// db/pool.js — Conexión a PostgreSQL usando pg
require('dotenv').config();

const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction
        ? {
            rejectUnauthorized: false,
          }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
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
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Error conectando a PostgreSQL:', err.message);

    if (process.env.DATABASE_URL) {
      console.error('    Verifica DATABASE_URL en las variables de entorno.');
    } else {
      console.error('    Verifica DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD en .env');
    }

    return;
  }

  release();

  if (process.env.DATABASE_URL) {
    const safeUrl = process.env.DATABASE_URL.replace(/:\/\/.*@/, '://***@');
    console.log(`✅  PostgreSQL conectado → ${safeUrl}`);
  } else {
    console.log(
      `✅  PostgreSQL conectado → ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`
    );
  }
});

module.exports = pool;