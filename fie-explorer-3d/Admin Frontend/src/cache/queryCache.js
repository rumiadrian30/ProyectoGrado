/**
 * queryCache.js
 * Cache en memoria con TTL, invalidación y suscripciones de reactividad.
 * Vive como singleton de módulo — persiste mientras la SPA esté montada.
 */

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

const store       = new Map()   // key → { data, expiresAt, promise }
const subscribers = new Map()   // key → Set<callback>

/* ─── Lectura ──────────────────────────────────────────────────────────── */
export function getCached(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { store.delete(key); return null }
  return entry.data
}

export function isCached(key) {
  return getCached(key) !== null
}

/* ─── Escritura ────────────────────────────────────────────────────────── */
export function setCached(key, data, ttl = DEFAULT_TTL) {
  store.set(key, { data, expiresAt: Date.now() + ttl, promise: null })
  notify(key, data)
}

/* ─── Promesa en vuelo (evita race conditions / doble fetch) ────────────── */
export function getInFlight(key) {
  return store.get(key)?.promise ?? null
}

export function setInFlight(key, promise) {
  store.set(key, { data: null, expiresAt: 0, promise })
}

/* ─── Invalidación ─────────────────────────────────────────────────────── */
export function invalidate(key) {
  store.delete(key)
}

export function invalidatePrefix(prefix) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k)
  }
}

export function invalidateAll() {
  store.clear()
}

/* ─── Suscripciones (para reactividad en hooks) ─────────────────────────── */
export function subscribe(key, cb) {
  if (!subscribers.has(key)) subscribers.set(key, new Set())
  subscribers.get(key).add(cb)
  return () => subscribers.get(key)?.delete(cb)
}

function notify(key, data) {
  subscribers.get(key)?.forEach(cb => cb(data))
}
