const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info('Nueva conexión establecida al pool PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Error inesperado en cliente inactivo del pool', { error: err.message });
});

/**
 * Ejecuta una query con parámetros opcionales.
 * @param {string} text  – Sentencia SQL
 * @param {Array}  params – Parámetros posicionales ($1, $2, ...)
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      logger.debug('Consulta ejecutada', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    logger.error('Error en consulta SQL', { text, error: err.message });
    throw err;
  }
};

/**
 * Verifica la conectividad al iniciar la aplicación.
 */
const testConnection = async () => {
  const client = await pool.connect();
  client.release();
  logger.info(`Conexión a PostgreSQL exitosa → ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
};

module.exports = { query, pool, testConnection };
