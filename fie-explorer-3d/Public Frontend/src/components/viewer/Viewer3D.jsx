import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader }    from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { disposeObject, computeBoundingSphere } from '../../utils/three.helpers';
import { useViewerStore } from '../../store/viewerStore';
import {
  FIE_BUILDINGS, OTHER_BUILDINGS, GREEN_AREAS,
} from '../../utils/campusData';

export default function Viewer3D({ modelPath, hotspots = [], onHotspotClick, highlightFie = true }) {
  const mountRef    = useRef(null);
  const sceneRef    = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef   = useRef(null);
  const controlsRef = useRef(null);
  const frameRef    = useRef(null);
  const markersRef  = useRef([]);
  const clockRef    = useRef(new THREE.Clock());
  const [webglError, setWebglError] = useState(false);
  const [tooltip, setTooltip]       = useState(null);

  const { setModelLoading, setModelProgress } = useViewerStore();

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch { setWebglError(true); return; }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd8e0ea);
    scene.fog = new THREE.FogExp2(0xd8e0ea, 0.0035);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.position.set(0, 130, 175);
    cameraRef.current = camera;

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const sun = new THREE.DirectionalLight(0xfff8ee, 2.6);
    sun.position.set(80, 150, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 700;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -200;
    sun.shadow.camera.right = sun.shadow.camera.top   =  200;
    sun.shadow.bias = -0.0003;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb0c8e8, 0.6);
    fill.position.set(-60, 40, -80);
    scene.add(fill);

    // Suelo exterior
    const gOutMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200),
      new THREE.MeshStandardMaterial({ color: 0xc5cdd8, roughness: 1 })
    );
    gOutMesh.rotation.x = -Math.PI / 2; gOutMesh.position.y = -0.15; gOutMesh.receiveShadow = true;
    scene.add(gOutMesh);

    // Suelo campus (beige)
    const gCampus = new THREE.Mesh(
      new THREE.PlaneGeometry(215, 190),
      new THREE.MeshStandardMaterial({ color: 0xddd5c0, roughness: 1 })
    );
    gCampus.rotation.x = -Math.PI / 2; gCampus.position.y = -0.05; gCampus.receiveShadow = true;
    scene.add(gCampus);

    const grid = new THREE.GridHelper(220, 44, 0xbbbbbb, 0xcccccc);
    grid.material.opacity = 0.25; grid.material.transparent = true;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05;
    controls.minDistance = 10; controls.maxDistance = 450;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const buildingMeshes = [];
    scene.__buildingMeshes = buildingMeshes;

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / container.clientWidth)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / container.clientHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(buildingMeshes, false);
      if (hits.length && hits[0].object.userData.label) {
        const { label, isFie } = hits[0].object.userData;
        setTooltip({ label, isFie: isFie || false, x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else { setTooltip(null); }
    };
    const onClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / container.clientWidth)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / container.clientHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markersRef.current, false);
      if (hits.length && hits[0].object.userData.hotspot && onHotspotClick) {
        onHotspotClick(hits[0].object.userData.hotspot);
      }
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    if (modelPath) {
      setModelLoading(true); setModelProgress(0);
      const loader = new GLTFLoader();
      loader.load(modelPath,
        (gltf) => {
          const model = gltf.scene;
          model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
          scene.add(model);
          const { center, radius } = computeBoundingSphere(model);
          controls.target.copy(center);
          camera.position.set(center.x + radius * 1.4, center.y + radius * 1.0, center.z + radius * 1.8);
          controls.update();
          setModelLoading(false);
        },
        (xhr) => { if (xhr.total) setModelProgress(Math.round((xhr.loaded / xhr.total) * 100)); },
        (err) => { console.error('[Viewer3D] GLB error:', err); setModelLoading(false); buildCampusMock(scene); }
      );
    } else {
      buildCampusMock(scene);
    }

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const ro = new ResizeObserver(onResize); ro.observe(container);

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

    return () => {
      cancelAnimationFrame(frameRef.current); ro.disconnect();
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose(); renderer.dispose();
      scene.traverse(o => { if (o.isMesh) o.geometry?.dispose(); });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPath]);

  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return;
    markersRef.current.forEach(m => { if (m.userData.ring) scene.remove(m.userData.ring); scene.remove(m); disposeObject(m); });
    markersRef.current = [];
    const typeColors = { lab: 0xBC0613, office: 0xd41a2b, service: 0x16a34a, access: 0xd97706 };
    hotspots.forEach((h, i) => {
      const color = typeColors[h.type] || 0x9a0510;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.1 }));
      mesh.position.set(parseFloat(h.pos_x)||0, parseFloat(h.pos_y)||0, parseFloat(h.pos_z)||0);
      mesh.userData = { hotspot: h, baseY: mesh.position.y };
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 32),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
      ring.position.copy(mesh.position); ring.rotation.x = -Math.PI / 2;
      mesh.userData.ring = ring;
      scene.add(mesh); scene.add(ring); markersRef.current.push(mesh);
    });
  }, [hotspots]);

  if (webglError) return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      background:'var(--color-bg-soft)', gap:'1rem', padding:'2rem', textAlign:'center' }}>
      <span style={{ fontSize:'3rem' }}>⚠️</span>
      <h3>WebGL no disponible</h3>
      <p style={{ maxWidth:400 }}>Tu navegador no soporta WebGL. Intenta con Chrome o Firefox actualizados.</p>
    </div>
  );

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <div ref={mountRef} style={{ width:'100%', height:'100%' }} />

      {tooltip && (
        <div style={{
          position:'absolute', left: tooltip.x + 14, top: tooltip.y - 8,
          background: tooltip.isFie ? 'rgba(188,6,19,0.93)' : 'rgba(25,35,55,0.90)',
          color:'#fff', padding:'5px 11px', borderRadius:7, fontSize:11, fontWeight:600,
          pointerEvents:'none', whiteSpace:'nowrap', boxShadow:'0 2px 12px rgba(0,0,0,0.35)',
          border: tooltip.isFie ? '1px solid rgba(255,180,180,0.4)' : '1px solid rgba(150,200,255,0.3)',
          backdropFilter:'blur(4px)',
        }}>
          {tooltip.isFie ? '🔴 FIE — ' : '🔵 '}{tooltip.label}
        </div>
      )}

      {!modelPath && (
        <div style={{
          position:'absolute', bottom:14, left:14,
          background:'rgba(10,15,25,0.82)', borderRadius:9, padding:'9px 13px',
          fontSize:11, color:'#fff', display:'flex', flexDirection:'column', gap:5,
          pointerEvents:'none', backdropFilter:'blur(6px)',
          border:'1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:2, color:'#f0f4ff' }}>Campus ESPOCH — Modelo mock 3D</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#BC0613', flexShrink:0 }}/>
            <span>FIE — {FIE_BUILDINGS.length} edificios</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#2563EB', flexShrink:0 }}/>
            <span>Otras facultades — {OTHER_BUILDINGS.length} edificios</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#4ade80', flexShrink:0 }}/>
            <span>Áreas verdes / Estadios</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:'#f59e0b', flexShrink:0 }}/>
            <span>Contorno campus</span>
          </div>
          <div style={{ marginTop:3, opacity:0.5, fontSize:10 }}>Pasa el cursor sobre un edificio para ver su nombre</div>
        </div>
      )}
    </div>
  );
}

// ── Campus mock builder ──────────────────────────────────────────────────────
function buildCampusMock(scene) {
  const matFie      = new THREE.MeshStandardMaterial({ color: 0xBC0613, roughness: 0.35, metalness: 0.08 });
  const matFieRoof  = new THREE.MeshStandardMaterial({ color: 0x8A0410, roughness: 0.5 });
  const matOther    = new THREE.MeshStandardMaterial({ color: 0x2563EB, roughness: 0.40, metalness: 0.06 });
  const matOtherRf  = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 });
  const matGreen    = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.9 });
  const matRoad     = new THREE.MeshStandardMaterial({ color: 0xb0b8c8, roughness: 1 });
  const edgeFie     = new THREE.LineBasicMaterial({ color: 0xff8888, opacity: 0.3, transparent: true });
  const edgeOther   = new THREE.LineBasicMaterial({ color: 0x93c5fd, opacity: 0.3, transparent: true });

  const buildingMeshes = scene.__buildingMeshes || [];

  function mkBuilding(b, isFie) {
    const wm = isFie ? matFie : matOther;
    const rm = isFie ? matFieRoof : matOtherRf;
    const em = isFie ? edgeFie : edgeOther;

    const wGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const wall = new THREE.Mesh(wGeo, wm);
    wall.position.set(b.x, b.h / 2, b.z);
    wall.castShadow = wall.receiveShadow = true;
    wall.userData = { label: b.label || b.code || '?', isFie };
    scene.add(wall);
    buildingMeshes.push(wall);

    const ln = new THREE.LineSegments(new THREE.EdgesGeometry(wGeo), em);
    ln.position.copy(wall.position);
    scene.add(ln);

    const rh = 0.45;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.4, rh, b.d + 0.4), rm);
    roof.position.set(b.x, b.h + rh / 2, b.z);
    roof.castShadow = true;
    scene.add(roof);
  }

  // Áreas verdes
  GREEN_AREAS.forEach(a => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(a.w, 0.3, a.d), matGreen);
    m.position.set(a.x, 0.15, a.z); m.receiveShadow = true;
    scene.add(m);
  });

  // Ejes viales principales (N-S y E-O)
  const roads = [
    // Longitudinales (N→S)
    { x1:-105, z1:0, x2:105, z2:0, w:5, axis:'x' },  // Longitudinal central
    { x1:-105, z1:-48, x2:105, z2:-48, w:4, axis:'x' },
    { x1:-105, z1: 40, x2:105, z2: 40, w:4, axis:'x' },
    // Transversales (E→O)
    { x1:0, z1:-100, x2:0, z2:100, w:4, axis:'z' },
    { x1:-60, z1:-100, x2:-60, z2:100, w:3.5, axis:'z' },
    { x1: 52, z1:-100, x2: 52, z2:100, w:3.5, axis:'z' },
  ];
  roads.forEach(r => {
    const len = r.axis === 'x' ? Math.abs(r.x2 - r.x1) : Math.abs(r.z2 - r.z1);
    const geo = r.axis === 'x'
      ? new THREE.PlaneGeometry(len, r.w)
      : new THREE.PlaneGeometry(r.w, len);
    const m = new THREE.Mesh(geo, matRoad);
    m.rotation.x = -Math.PI / 2;
    m.position.set(
      r.axis === 'x' ? (r.x1 + r.x2) / 2 : r.x1,
      0.01,
      r.axis === 'z' ? (r.z1 + r.z2) / 2 : r.z1,
    );
    scene.add(m);
  });

  // Diagonal principal del campus
  const diagGeo = new THREE.PlaneGeometry(4, 310);
  const diag = new THREE.Mesh(diagGeo, matRoad);
  diag.rotation.x = -Math.PI / 2;
  diag.rotation.z = Math.atan2(160, 155);
  diag.position.set(-2, 0.02, 0);
  scene.add(diag);

  // Edificios
  FIE_BUILDINGS.forEach(b   => mkBuilding(b, true));
  OTHER_BUILDINGS.forEach(b => mkBuilding(b, false));

  // Contorno amarillo (línea perimetral)
  const boundaryPts = [
    [-100,-85],[-65,-88],[-20,-88],[15,-80],[50,-75],[82,-60],[88,-30],
    [90,5],[85,40],[75,75],[40,82],[0,85],[-30,82],[-60,75],[-85,50],
    [-98,10],[-102,-30],[-100,-60],[-100,-85],
  ].map(([x,z]) => new THREE.Vector3(x, 0.8, z));
  boundaryPts.push(boundaryPts[0].clone());

  const bGeo = new THREE.BufferGeometry().setFromPoints(boundaryPts);
  const bMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 });
  scene.add(new THREE.Line(bGeo, bMat));

  scene.__buildingMeshes = buildingMeshes;
}
