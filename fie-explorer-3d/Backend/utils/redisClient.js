// utils/redisClient.js
// Cliente Redis compartido para toda la API.
// Si REDIS_URL no está definido, el módulo devuelve null y la app
// funciona sin caché (degradación elegante).

const Redis = require('ioredis');

let _client = null;

function getClient() {
  if (_client) return _client;

  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn('  \x1b[33m[Redis]\x1b[0m REDIS_URL no definido — caché desactivado.');
    return null;
  }

  const requiresTls =
    url.startsWith('rediss://') ||
    url.includes('upstash.io');

  _client = new Redis(url, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    tls: requiresTls ? {} : undefined,
  });

  _client.on('connect', () => {
    console.log(
      '  \x1b[36m[Redis]\x1b[0m Conectado →',
      url.replace(/:\/\/.*@/, '://***@')
    );
  });

  _client.on('ready', () => {
    console.log('  \x1b[32m[Redis]\x1b[0m Disponible para caché.');
  });

  _client.on('error', (err) => {
    console.warn('  \x1b[33m[Redis]\x1b[0m Error:', err.message);
  });

  return _client;
}

module.exports = { getClient };