const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB       || 'fie_explorer_3d',
  user:     process.env.POSTGRES_USER     || 'fie_user',
  password: process.env.POSTGRES_PASSWORD || 'fie_secret',
  max:      10,          // máximo de conexiones en el pool
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Error inesperado en cliente inactivo:', err.message);
});

// Verifica la conexión al iniciar
async function testConnection() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() AS tiempo, current_database() AS db');
    console.log(`[DB] Conectado a "${res.rows[0].db}" — ${res.rows[0].tiempo}`);
    client.release();
  } catch (err) {
    console.error('[DB] Error de conexión:', err.message);
    console.error('[DB] Verifica que el servicio "db" de Docker esté corriendo.');
  }
}

testConnection();

module.exports = pool;
