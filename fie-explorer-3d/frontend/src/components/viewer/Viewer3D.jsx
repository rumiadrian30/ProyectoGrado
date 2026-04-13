import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { disposeObject, computeBoundingSphere } from '../../utils/three.helpers';
import { useViewerStore } from '../../store/viewerStore';

/**
 * Visor 3D principal.
 * Props:
 *   modelPath  – ruta al archivo .glb (o null para usar la escena de demo)
 *   hotspots   – array de hotspot objects con pos_x, pos_y, pos_z
 *   onHotspotClick – callback (hotspot) => void
 */
export default function Viewer3D({ modelPath, hotspots = [], onHotspotClick }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);
  const markersRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());
  const [webglError, setWebglError] = useState(false);

  const { setModelLoading, setModelProgress } = useViewerStore();

  /* ─── Setup escena ─────────────────────────────────── */
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f8fa);
    scene.fog = new THREE.FogExp2(0xf7f8fa, 0.008);
    sceneRef.current = scene;

    // Cámara
    const camera = new THREE.PerspectiveCamera(
      50, container.clientWidth / container.clientHeight, 0.1, 1000
    );
    camera.position.set(0, 30, 80);
    cameraRef.current = camera;

    // Luces
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e4, 2.5);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -120;
    sun.shadow.camera.right = sun.shadow.camera.top = 120;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xc9d8ff, 0.6);
    fill.position.set(-40, 20, -60);
    scene.add(fill);

    // Suelo / plano de referencia
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xe8ecf0, roughness: 1, metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.1;
    scene.add(ground);

    // Grid helper sutil
    const grid = new THREE.GridHelper(300, 60, 0xcccccc, 0xdddddd);
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    scene.add(grid);

    // Controles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 300;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.autoRotate = !modelPath; // auto-rotar solo si no hay modelo
    controls.autoRotateSpeed = 0.6;
    controlsRef.current = controls;

    // ─── Modelo / escena demo ───────────────────────────
    if (modelPath) {
      setModelLoading(true);
      setModelProgress(0);
      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          model.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(model);

          // Centrar cámara al modelo
          const { center, radius } = computeBoundingSphere(model);
          controls.target.copy(center);
          camera.position.set(
            center.x + radius * 1.5,
            center.y + radius * 1.0,
            center.z + radius * 2.0
          );
          controls.update();

          setModelLoading(false);
        },
        (xhr) => {
          if (xhr.total) setModelProgress(Math.round((xhr.loaded / xhr.total) * 100));
        },
        (err) => {
          console.error('Error cargando modelo GLB:', err);
          setModelLoading(false);
          addDemoBuildings(scene);
        }
      );
    } else {
      addDemoBuildings(scene);
    }

    // ─── Raycaster para hotspots ─────────────────────────
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
        if (marker.userData.hotspot && onHotspotClick) {
          onHotspotClick(marker.userData.hotspot);
        }
      }
    };

    renderer.domElement.addEventListener('click', onClick);

    // ─── Resize handler ──────────────────────────────────
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // ─── Loop de render ──────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      controls.update();

      // Animar marcadores de hotspots
      markersRef.current.forEach((m, i) => {
        m.position.y = m.userData.baseY + Math.sin(Date.now() * 0.002 + i) * 0.3;
        m.rotation.y += delta * 0.8;
        if (m.userData.ring) {
          m.userData.ring.scale.setScalar(
            1 + 0.3 * Math.abs(Math.sin(Date.now() * 0.0015 + i))
          );
          m.userData.ring.material.opacity =
            0.4 - 0.3 * Math.abs(Math.sin(Date.now() * 0.0015 + i));
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      scene.traverse(o => {
        if (o.isMesh) { o.geometry?.dispose(); }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPath]);

  /* ─── Actualizar marcadores cuando cambian hotspots ── */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => {
      if (m.userData.ring) scene.remove(m.userData.ring);
      scene.remove(m);
      disposeObject(m);
    });
    markersRef.current = [];

    const typeColors = {
      lab:     0x003087,
      office:  0x0369a1,
      service: 0x16a34a,
      access:  0xd97706,
    };

    hotspots.forEach((h) => {
      const color = typeColors[h.type] || 0x003087;

      // Esfera principal
      const geo = new THREE.SphereGeometry(0.7, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5,
        roughness: 0.2, metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        parseFloat(h.pos_x) || 0,
        parseFloat(h.pos_y) || 0,
        parseFloat(h.pos_z) || 0
      );
      mesh.userData.hotspot = h;
      mesh.userData.baseY = mesh.position.y;
      mesh.castShadow = false;

      // Anillo exterior pulsante
      const ringGeo = new THREE.RingGeometry(0.9, 1.1, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color, side: THREE.DoubleSide,
        transparent: true, opacity: 0.3,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(mesh.position);
      ring.rotation.x = -Math.PI / 2;
      mesh.userData.ring = ring;

      scene.add(mesh);
      scene.add(ring);
      markersRef.current.push(mesh);
    });
  }, [hotspots]);

  if (webglError) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg-soft)',
        gap: '1rem', color: 'var(--color-text-3)',
        padding: '2rem', textAlign: 'center',
      }}>
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          WebGL no disponible
        </h3>
        <p style={{ maxWidth: 400 }}>
          Tu navegador o dispositivo no soporta WebGL, que es necesario para la
          visualización 3D. Intenta con Chrome o Firefox actualizados.
        </p>
      </div>
    );
  }

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}

/* ─── Escena de demostración (sin modelo GLB) ─── */
function addDemoBuildings(scene) {
  const palette = [0x003087, 0x1a4faa, 0x0369a1, 0x003087, 0x374151];

  const buildingData = [
    { x: 0, z: 0, w: 14, h: 12, d: 10, label: 'FIE-MAIN' },
    { x: -22, z: 5, w: 10, h: 8, d: 9, label: 'FIE-LAB-EA' },
    { x: 22, z: 5, w: 10, h: 7, d: 9, label: 'FIE-LAB-SW' },
    { x: -12, z: -20, w: 8, h: 5, d: 7, label: 'FIE-LAB-CEM' },
    { x: 15, z: -20, w: 9, h: 6, d: 7, label: 'FIE-ADM' },
  ];

  buildingData.forEach((b, i) => {
    const color = palette[i % palette.length];
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.4, metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Aristas
    const edges = new THREE.EdgesGeometry(geo);
    const line  = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.15, transparent: true })
    );
    line.position.copy(mesh.position);
    scene.add(line);
  });

  // Caminos entre edificios
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 1 });
  [[0,0,0,22,0,-18], [-22,0,5,0,0,0]].forEach(([x1,y1,z1,x2,y2,z2]) => {
    const dir = new THREE.Vector3(x2-x1, 0, z2-z1);
    const len = dir.length();
    const pathGeo = new THREE.PlaneGeometry(2.5, len);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set((x1+x2)/2, 0.01, (z1+z2)/2);
    const angle = Math.atan2(z2-z1, x2-x1);
    path.rotation.z = angle;
    scene.add(path);
  });
}
