/**
 * useInteriorCameras — extrae los nombres de los objetos cámara
 * (Cam_Interior_*) presentes en un archivo GLB, para poblar el
 * selector de "Referencia de cámara interior" en Hotspots.
 *
 * Cachea resultados por filePath en memoria (módulo) para no
 * recargar el GLB cada vez que se abre el formulario.
 */
import { useEffect, useState, useCallback } from 'react'
import * as THREE        from 'three'
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader }    from 'three/examples/jsm/loaders/DRACOLoader.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
const CAMERA_PREFIX = 'Cam_Interior_'

// Cache módulo: filePath → { cameras: string[] } | { error: string }
const cache = new Map()

function resolveUrl(filePath) {
  return filePath.startsWith('http') ? filePath : `${API_BASE}${filePath}`
}

function loadCameras(filePath) {
  if (cache.has(filePath)) return Promise.resolve(cache.get(filePath))

  return new Promise((resolve) => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH)

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      resolveUrl(filePath),
      (gltf) => {
        const cameras = []
        gltf.scene.traverse(obj => {
          if (obj.isCamera && obj.name?.startsWith(CAMERA_PREFIX)) {
            cameras.push(obj.name)
          }
        })
        dracoLoader.dispose()
        const result = { cameras, error: null }
        cache.set(filePath, result)
        resolve(result)
      },
      undefined,
      (err) => {
        dracoLoader.dispose()
        console.error('[useInteriorCameras]', err)
        const result = { cameras: [], error: 'No se pudo leer el modelo GLB.' }
        cache.set(filePath, result)
        resolve(result)
      }
    )
  })
}

export function useInteriorCameras(filePath) {
  const [state, setState] = useState({ cameras: [], loading: !!filePath, error: null })

  useEffect(() => {
    if (!filePath) {
      setState({ cameras: [], loading: false, error: null })
      return
    }
    let cancelled = false
    setState({ cameras: [], loading: true, error: null })

    loadCameras(filePath).then(result => {
      if (cancelled) return
      setState({ cameras: result.cameras, loading: false, error: result.error })
    })

    return () => { cancelled = true }
  }, [filePath])

  const reload = useCallback(() => {
    if (!filePath) return
    cache.delete(filePath)
    setState({ cameras: [], loading: true, error: null })
    loadCameras(filePath).then(result => {
      setState({ cameras: result.cameras, loading: false, error: result.error })
    })
  }, [filePath])

  return { ...state, reload }
}