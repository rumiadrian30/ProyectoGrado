import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { disposeObject, computeBoundingSphere } from '../../utils/three.helpers';
import { useViewerStore } from '../../store/viewerStore';

const MAX_RETRIES = 2;       // intentos automáticos antes de mostrar error
const RETRY_DELAY_MS = 1500; // ms entre reintentos

/**
 * Visor 3D principal.
 * Props:
 *   modelPath       – ruta al archivo .glb (o null para usar la escena demo)
 *   hotspots        – array de hotspot objects con pos_x, pos_y, pos_z
 *   onHotspotClick  – callback (hotspot) => void
 */
export default function Viewer3D({ modelPath, hotspots = [], onHotspotClick }) {
  const mountRef    = useRef(null);
  const sceneRef    = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef   = useRef(null);
  const controlsRef = useRef(null);
  const frameRef    = useRef(null);
  const markersRef  = useRef([]);
  const clockRef    = useRef(new THREE.Clock());
  const retryRef    = useRef(0);         // contador de reintentos actuales
  const mountedRef  = useRef(true);      // flag para evitar setState post-unmount

  // webglError: el renderer no pudo crearse (fallback de seguridad; main.jsx ya detectó antes)
  const [webglError,   setWebglError]   = useState(false);
  // networkError: el modelo falló tras MAX_RETRIES intentos
  const [networkError, setNetworkError] = useState(false);
  // retrying: se está esperando para reintentar
  const [retrying,     setRetrying]     = useState(false);
  const [retryCount,   setRetryCount]   = useState(0);

  const { setModelLoading, setModelProgress } = useViewerStore();

  /* ─── Setup escena ─────────────────────────────────── */
  useEffect(() => {
    mountedRef.current = true;
    const container = mountRef.current;
    if (!container) return;

    // ── Renderer ────────────────────────────────────────
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true, alpha: false, powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace  = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Escena ───────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f8fa);
    scene.fog = new THREE.FogExp2(0xf7f8fa, 0.008);
    sceneRef.current = scene;

    // ── Cámara ───────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      50, container.clientWidth / container.clientHeight, 0.1, 1000
    );
    camera.position.set(0, 30, 80);
    cameraRef.current = camera;

    // ── Luces ────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const sun = new THREE.DirectionalLight(0xfff5e4, 2.5);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far  = 400;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -120;
    sun.shadow.camera.right = sun.shadow.camera.top   =  120;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xc9d8ff, 0.6);
    fill.position.set(-40, 20, -60);
    scene.add(fill);

    // ── Suelo ────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 1, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.1;
    scene.add(ground);

    const grid = new THREE.GridHelper(300, 60, 0xcccccc, 0xdddddd);
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    scene.add(grid);

    // ── Controles ────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.minDistance    = 5;
    controls.maxDistance    = 300;
    controls.maxPolarAngle  = Math.PI / 2.05;
    controls.autoRotate     = !modelPath;
    controls.autoRotateSpeed = 0.6;
    controlsRef.current = controls;

    // ── Carga del modelo con reintentos ──────────────────
    if (modelPath) {
      retryRef.current = 0;
      if (mountedRef.current) {
        setModelLoading(true);
        setModelProgress(0);
        setNetworkError(false);
        setRetrying(false);
        setRetryCount(0);
      }

      /**
       * Intenta cargar el modelo GLB. Si falla:
       *   - reintenta hasta MAX_RETRIES veces con un delay de RETRY_DELAY_MS
       *   - tras agotar los intentos muestra el error amigable al usuario
       */
      function tryLoad() {
        const loader = new GLTFLoader();
        loader.load(
          modelPath,
          // ── Éxito ─────────────────────────────────────
          (gltf) => {
            if (!mountedRef.current) return;
            retryRef.current = 0;

            const model = gltf.scene;
            model.traverse(child => {
              if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
            });
            scene.add(model);

            const { center, radius } = computeBoundingSphere(model);
            controls.target.copy(center);
            camera.position.set(
              center.x + radius * 1.5,
              center.y + radius * 1.0,
              center.z + radius * 2.0
            );
            controls.update();

            setModelLoading(false);
            setNetworkError(false);
            setRetrying(false);
          },
          // ── Progreso ───────────────────────────────────
          (xhr) => {
            if (xhr.total && mountedRef.current) {
              setModelProgress(Math.round((xhr.loaded / xhr.total) * 100));
            }
          },
          // ── Error → reintentos automáticos ────────────
          (err) => {
            if (!mountedRef.current) return;
            console.error('[Viewer3D] Error cargando modelo:', err);

            if (retryRef.current < MAX_RETRIES) {
              retryRef.current += 1;
              console.log(`[Viewer3D] Reintento ${retryRef.current}/${MAX_RETRIES} en ${RETRY_DELAY_MS}ms…`);
              setRetrying(true);
              setRetryCount(retryRef.current);

              setTimeout(() => {
                if (mountedRef.current) tryLoad();
              }, RETRY_DELAY_MS);
            } else {
              // Agotados los reintentos → mostrar error visible al usuario
              console.error('[Viewer3D] Falló tras', MAX_RETRIES, 'reintentos.');
              setModelLoading(false);
              setRetrying(false);
              setNetworkError(true);
              addDemoBuildings(scene); // mostrar escena demo de fondo
            }
          }
        );
      }

      tryLoad();
    } else {
      addDemoBuildings(scene);
    }

    // ── Raycaster para hotspots ───────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / container.clientWidth)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / container.clientHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markersRef.current, false);
      if (hits.length > 0) {
        const marker = hits[0].object;
        if (marker.userData.hotspot && onHotspotClick) onHotspotClick(marker.userData.hotspot);
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // ── Resize ───────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // ── Loop de render ────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      controls.update();
      markersRef.current.forEach((m, i) => {
        m.position.y = m.userData.baseY + Math.sin(Date.now() * 0.002 + i) * 0.3;
        m.rotation.y += delta * 0.8;
        if (m.userData.ring) {
          m.userData.ring.scale.setScalar(1 + 0.3 * Math.abs(Math.sin(Date.now() * 0.0015 + i)));
          m.userData.ring.material.opacity = 0.4 - 0.3 * Math.abs(Math.sin(Date.now() * 0.0015 + i));
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      scene.traverse(o => {
        if (o.isMesh) {
          o.geometry?.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => {
            if (!m) return;
            Object.values(m).forEach(v => { if (v?.isTexture) v.dispose(); });
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPath]);

  /* ─── Actualizar marcadores cuando cambian hotspots ── */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    markersRef.current.forEach(m => {
      if (m.userData.ring) scene.remove(m.userData.ring);
      scene.remove(m);
      disposeObject(m);
    });
    markersRef.current = [];

    const typeColors = { lab: 0xBC0613, office: 0xd41a2b, service: 0x16a34a, access: 0xd97706 };

    hotspots.forEach((h) => {
      const color = typeColors[h.type] || 0x003087;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 16, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.1 })
      );
      mesh.position.set(parseFloat(h.pos_x)||0, parseFloat(h.pos_y)||0, parseFloat(h.pos_z)||0);
      mesh.userData.hotspot = h;
      mesh.userData.baseY = mesh.position.y;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.1, 32),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.3 })
      );
      ring.position.copy(mesh.position);
      ring.rotation.x = -Math.PI / 2;
      mesh.userData.ring = ring;

      scene.add(mesh);
      scene.add(ring);
      markersRef.current.push(mesh);
    });
  }, [hotspots]);

  /* ─── Callback manual de reintento ──────────────────── */
  const handleRetry = useCallback(() => {
    setNetworkError(false);
    setRetrying(false);
    setRetryCount(0);
    retryRef.current = 0;
    // Forzar re-mount cambiando la key del componente → el padre debe gestionar esto.
    // Como alternativa simple: recargar la página (siempre disponible).
    window.location.reload();
  }, []);

  /* ─── Pantalla: WebGL no disponible ────────────────── */
  if (webglError) {
    return (
      <ErrorScreen
        icon="⚠️"
        title="WebGL no disponible"
        message="Tu navegador no pudo inicializar el renderizado 3D. Prueba con Chrome o Firefox actualizados."
        links={[
          { href: 'https://www.google.com/chrome',    label: '🌐 Chrome' },
          { href: 'https://www.mozilla.org/firefox', label: '🦊 Firefox' },
        ]}
      />
    );
  }

  /* ─── Pantalla: error de red tras reintentos ─────────── */
  if (networkError) {
    return (
      <ErrorScreen
        icon="📡"
        title="No se pudo cargar el modelo 3D"
        message={`La descarga falló después de ${MAX_RETRIES} reintentos automáticos. Verifica tu conexión a internet e inténtalo de nuevo.`}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Badge de reintento en curso */}
      {retrying && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
          color: '#fff', padding: '0.5rem 1.2rem', borderRadius: 999,
          fontSize: '0.8rem', fontWeight: 500, display: 'flex', gap: '0.5rem',
          alignItems: 'center', zIndex: 20,
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          Reintento {retryCount}/{MAX_RETRIES}… verifica tu conexión
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}

/* ─── Pantalla de error reutilizable ─────────────────────── */
function ErrorScreen({ icon, title, message, links = [], onRetry }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg-soft)', gap: '1rem',
      padding: '2rem', textAlign: 'center',
    }}>
      <span style={{ fontSize: '3rem' }}>{icon}</span>
      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', margin: 0 }}>
        {title}
      </h3>
      <p style={{ maxWidth: 380, color: 'var(--color-text-3)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
        {message}
      </p>
      {links.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
          {links.map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer"
              style={{
                padding: '0.45rem 1rem', borderRadius: 8, fontWeight: 600,
                background: 'var(--color-primary)', color: '#fff',
                textDecoration: 'none', fontSize: '0.85rem',
              }}>
              {l.label}
            </a>
          ))}
        </div>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: '0.5rem', padding: '0.5rem 1.4rem', borderRadius: 8,
            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            background: 'var(--color-primary)', color: '#fff', border: 'none',
            fontFamily: 'var(--font-body)',
          }}
        >
          🔄 Reintentar
        </button>
      )}
    </div>
  );
}

/* ─── Escena de demostración (sin modelo GLB) ─── */
function addDemoBuildings(scene) {
  const palette = [0xBC0613, 0xd41a2b, 0x9a0510, 0xBC0613, 0x374151];
  const buildingData = [
    { x: 0,   z: 0,   w: 14, h: 12, d: 10 },
    { x: -22, z: 5,   w: 10, h: 8,  d: 9  },
    { x:  22, z: 5,   w: 10, h: 7,  d: 9  },
    { x: -12, z: -20, w: 8,  h: 5,  d: 7  },
    { x:  15, z: -20, w: 9,  h: 6,  d: 7  },
  ];
  buildingData.forEach((b, i) => {
    const color = palette[i % palette.length];
    const geo   = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mesh  = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 }));
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    scene.add(mesh);
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.15, transparent: true })
    );
    line.position.copy(mesh.position);
    scene.add(line);
  });

  const pathMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 1 });
  [[0,0,0,22,0,-18],[-22,0,5,0,0,0]].forEach(([x1,,z1,x2,,z2]) => {
    const dir = new THREE.Vector3(x2-x1,0,z2-z1);
    const len = dir.length();
    const path = new THREE.Mesh(new THREE.PlaneGeometry(2.5, len), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set((x1+x2)/2, 0.01, (z1+z2)/2);
    path.rotation.z = Math.atan2(z2-z1, x2-x1);
    scene.add(path);
  });
}
