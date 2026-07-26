/**
 * prefetch.js
 * Dispara en background todos los endpoints que usan las páginas del admin.
 * Se llama UNA VEZ cuando AdminShell monta (después del login).
 *
 * Si el usuario navega a una sección antes de que termine → useCachedQuery
 * se engancha a la promesa en vuelo en lugar de lanzar un segundo fetch.
 */

import { isCached, setInFlight, setCached } from './queryCache'
import { api } from '../api'

/* ── Endpoints a prefetchear ── */
const PREFETCH_ENDPOINTS = [
  { key: 'buildings', path: '/buildings' },
  { key: 'hotspots',  path: '/hotspots'  },
  { key: 'models',    path: '/models'    },
]

// Para endpoints que solo carga superadmin
const PREFETCH_ADMIN = [
  { key: 'users', path: '/auth/users' },
]

const TTL = 5 * 60 * 1000   // 5 min — igual que el hook

/* ── Función principal ── */
export function prefetchAll(isSuperAdmin = false) {
  const targets = isSuperAdmin
    ? [...PREFETCH_ENDPOINTS, ...PREFETCH_ADMIN]
    : PREFETCH_ENDPOINTS

  for (const { key, path } of targets) {
    // Si ya está en cache válido → saltar
    if (isCached(key)) continue

    const promise = api('GET', path)
      .then(data => { setCached(key, data, TTL); return data })
      .catch(() => null)  // prefetch silencioso — no rompe la UI

    setInFlight(key, promise)
  }
}
