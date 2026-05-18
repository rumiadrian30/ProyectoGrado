/**
 * GlbPreview — Mini-visor Three.js para archivos .glb dentro del admin.
 * Usa three.js instalado vía npm (sin CDN), compatible con el CSP del proyecto.
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function GlbPreview({ filePath, height = 220 }) {
  const containerRef = useRef(null)
  const cleanupRef   = useRef(null)
  const [status, setStatus] = useState('loading')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (!filePath) return
    setStatus('loading')
    setErrMsg('')

    const container = containerRef.current
    if (!container) return

    const W = container.clientWidth || 400
    const H = height

    // ── Escena ───────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.06)

    // ── Luces ────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 1.4))
    const dir = new THREE.DirectionalLight(0xffffff, 2)
    dir.position.set(5, 10, 7)
    scene.add(dir)
    const fill = new THREE.DirectionalLight(0x8888ff, 0.5)
    fill.position.set(-5, -2, -5)
    scene.add(fill)

    // ── Cámara ───────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 1000)
    camera.position.set(0, 1.2, 3)

    // ── Renderer ─────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // ── OrbitControls ────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    // ── Grid ─────────────────────────────────────────────────────
    scene.add(new THREE.GridHelper(6, 14, 0x333366, 0x222244))

    // ── Cargar GLB ───────────────────────────────────────────────
    const url = filePath.startsWith('http')
      ? filePath
      : `${API_BASE}${filePath}`

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene
        const box    = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size   = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        const scale  = 2 / maxDim

        model.position.sub(center.multiplyScalar(scale))
        model.scale.setScalar(scale)

        const box2 = new THREE.Box3().setFromObject(model)
        model.position.y -= box2.min.y

        scene.add(model)

        camera.position.set(0, size.y * scale * 0.8 + 0.5, maxDim * scale * 2 + 0.5)
        controls.target.set(0, size.y * scale * 0.4, 0)
        controls.update()

        setStatus('ok')
      },
      undefined,
      (err) => {
        console.error('[GlbPreview]', err)
        setErrMsg('No se pudo cargar el preview del modelo.')
        setStatus('error')
      }
    )

    // ── Loop ─────────────────────────────────────────────────────
    let raf
    function animate() {
      raf = requestAnimationFrame(animate)
      controls.update()
      scene.rotation.y += 0.003
      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ───────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      renderer.setSize(w, H)
      camera.aspect = w / H
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    // ── Cleanup ──────────────────────────────────────────────────
    cleanupRef.current = () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      dracoLoader.dispose()
      container.innerHTML = ''
    }

    return () => { cleanupRef.current?.() }
  }, [filePath, height])

  return (
    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#1a1a2e' }}>
      <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />

      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '8px',
        }}>
          <div style={{ fontSize: '22px', animation: 'glb-spin 1s linear infinite' }}>⟳</div>
          <div style={{ fontSize: '11px', color: '#8888cc' }}>Cargando preview…</div>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '6px',
        }}>
          <div style={{ fontSize: '20px' }}>⚠️</div>
          <div style={{ fontSize: '11px', color: '#f87171', textAlign: 'center', padding: '0 16px' }}>{errMsg}</div>
        </div>
      )}

      {status === 'ok' && (
        <div style={{
          position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)',
          color: '#a5b4fc', fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
          backdropFilter: 'blur(4px)',
        }}>
          🔷 Preview 3D · arrastra para rotar
        </div>
      )}

      {status === 'ok' && (
        <div style={{
          position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.45)',
          color: '#6b7280', fontSize: '9px', padding: '2px 7px', borderRadius: '8px',
        }}>
          scroll = zoom
        </div>
      )}

      <style>{`@keyframes glb-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
