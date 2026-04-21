// db/pool.js — Conexión a PostgreSQL usando pg
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'fie_explorer_3d',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Máximo 10 clientes simultáneos en el pool
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Error conectando a PostgreSQL:', err.message);
    console.error('    Verifica DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD en .env');
    return;
  }
  release();
  console.log(`✅  PostgreSQL conectado → ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
});

module.exports = pool;
