// utils/configCache.js
// Cache en memoria de system_config para no consultar la BD en cada request.
// Se invalida cada 60 segundos o cuando el superadmin guarda un cambio.

const pool = require('../db/pool');

let cache    = null;
let cacheTs  = 0;
const TTL_MS = 60_000; // 60 segundos

async function loadFromDB() {
  const { rows } = await pool.query(
    `SELECT config_key, config_value, value_type FROM system_config`
  );
  const map = {};
  rows.forEach(r => {
    if      (r.value_type === 'integer') map[r.config_key] = parseInt(r.config_value) || 0;
    else if (r.value_type === 'float')   map[r.config_key] = parseFloat(r.config_value) || 0;
    else if (r.value_type === 'boolean') map[r.config_key] = r.config_value === 'true';
    else                                 map[r.config_key] = r.config_value;
  });
  return map;
}

/**
 * Devuelve el valor de una clave de configuración.
 * Usa cache en memoria con TTL de 60s.
 */
async function getConfig(key, fallback = null) {
  const now = Date.now();
  if (!cache || now - cacheTs > TTL_MS) {
    try {
      cache   = await loadFromDB();
      cacheTs = now;
    } catch {
      // Si la tabla aún no existe (primera instalación), devolver fallback
      return fallback;
    }
  }
  return key in cache ? cache[key] : fallback;
}

/** Invalida el cache para que el próximo getConfig lea de BD */
function invalidateCache() {
  cache   = null;
  cacheTs = 0;
}

module.exports = { getConfig, invalidateCache };
