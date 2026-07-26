/**
 * useCachedQuery.js
 * Hook que envuelve cualquier llamada async con cache automático.
 *
 * Uso básico:
 *   const { data, loading, error, refresh } = useCachedQuery(
 *     'buildings',
 *     () => buildingsService.getAll(),
 *   )
 *
 * Con opciones:
 *   useCachedQuery('hotspots', fetcher, { ttl: 60_000, deps: [buildingId] })
 *
 * Si el dato ya está en cache → loading=false, data disponible inmediatamente.
 * Si hay un fetch en vuelo (prefetch) → se engancha a esa promesa, no lanza otra.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getCached, setCached,
  getInFlight, setInFlight,
  subscribe,
} from './queryCache'

const DEFAULT_TTL = 5 * 60 * 1000

export function useCachedQuery(key, fetcher, {
  ttl  = DEFAULT_TTL,
  deps = [],
  enabled = true,         // permite desactivar el fetch condicionalmente
} = {}) {
  const cached = getCached(key)

  const [data,    setData]    = useState(cached)
  const [loading, setLoading] = useState(enabled && !cached)
  const [error,   setError]   = useState(null)
  const mountedRef = useRef(true)

  const run = useCallback(async (force = false) => {
    if (!enabled) return

    // Si no forzamos y ya hay dato fresco → nada que hacer
    if (!force && getCached(key)) return

    // Si ya hay un fetch en vuelo → engancharse a él
    const inFlight = getInFlight(key)
    if (inFlight) {
      setLoading(true)
      try {
        const result = await inFlight
        if (mountedRef.current) { setData(result); setLoading(false) }
      } catch (err) {
        if (mountedRef.current) { setError(err); setLoading(false) }
      }
      return
    }

    setLoading(true)
    setError(null)

    const promise = fetcher()
    setInFlight(key, promise)

    try {
      const result = await promise
      setCached(key, result, ttl)
      if (mountedRef.current) { setData(result); setLoading(false) }
    } catch (err) {
      if (mountedRef.current) { setError(err); setLoading(false) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ttl, enabled, ...deps])

  useEffect(() => {
    mountedRef.current = true
    run()

    // Suscribirse a actualizaciones externas (ej: otro tab prefetcheó)
    const unsub = subscribe(key, (fresh) => {
      if (mountedRef.current) setData(fresh)
    })

    return () => {
      mountedRef.current = false
      unsub()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ...deps])

  const refresh = useCallback(() => run(true), [run])

  return { data, loading, error, refresh }
}
