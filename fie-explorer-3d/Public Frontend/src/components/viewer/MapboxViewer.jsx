/**
 * MapboxViewer.jsx
 *
 * Visor integrado: Mapbox GL JS Standard (sin objetos 3D nativos para que
 * solo se vean los modelos GLB propios) + Three.js custom layer.
 *
 * Navegación: W/A/S/D o flechas → mover cámara
 *             Q/E               → rotar bearing
 *             R/F               → subir/bajar pitch
 */

import React, { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useViewerStore } from '../../store/viewerStore';
import { getCoords, CAMPUS_VIEW, BUILDING_SIZES } from '../../utils/buildingCoords';

mapboxgl.accessToken =
  'pk.eyJ1IjoicnVtaWFkcmlhbiIsImEiOiJjbW95cnd4OGwwYjViMnJwdWNtbmRvdXA0In0.is21gbSMEJTlU_wQRjgoTQ';

const LAYER_ID = 'fie-model-layer';

// ─── Velocidad de movimiento de teclado ───────────────────────────────────────
const PAN_SPEED    = 0.0002;  // grados por frame (se escala con zoom)
const ROTATE_SPEED = 1.5;     // grados por frame
const PITCH_SPEED  = 1.0;     // grados por frame
const PITCH_MIN    = 0;
const PITCH_MAX    = 85;

// ─── Custom Three.js layer ────────────────────────────────────────────────────
function createModelLayer({ id, modelUrl, lngLat, onProgress, onLoaded }) {
  const state = { scene: null, camera: null, renderer: null, map: null, loaded: false, lngLat };

  return {
    id,
    type: 'custom',
    renderingMode: '3d',

    onAdd(map, gl) {
      state.map    = map;
      state.camera = new THREE.Camera();
      state.scene  = new THREE.Scene();

      state.scene.add(new THREE.AmbientLight(0xffffff, 1.2));

      const sun = new THREE.DirectionalLight(0xfff5e4, 2.5);
      sun.position.set(60, 100, 40);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near   = 0.5;
      sun.shadow.camera.far    = 400;
      sun.shadow.camera.left   = -120;
      sun.shadow.camera.right  =  120;
      sun.shadow.camera.bottom = -120;
      sun.shadow.camera.top    =  120;
      state.scene.add(sun);

      const fill = new THREE.DirectionalLight(0xc9d8ff, 0.6);
      fill.position.set(-40, 20, -60);
      state.scene.add(fill);

      state.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      state.renderer.autoClear           = false;
      state.renderer.shadowMap.enabled   = true;
      state.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
      state.renderer.toneMapping         = THREE.ACESFilmicToneMapping;
      state.renderer.toneMappingExposure = 1.1;
      state.renderer.outputColorSpace    = THREE.SRGBColorSpace;

      if (modelUrl) {
        const loader = new GLTFLoader();
        loader.load(
          modelUrl,
          (gltf) => {
            const model = gltf.scene;
            const box    = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;
            model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            state.scene.add(model);
            state.loaded = true;
            onLoaded?.();
            map.triggerRepaint();
          },
          (xhr) => { if (xhr.total) onProgress?.(Math.round((xhr.loaded / xhr.total) * 100)); },
          (err) => {
            console.error('[MapboxViewer] Error cargando modelo:', err);
            addDemoModel(state.scene);
            state.loaded = true;
            map.triggerRepaint();
          },
        );
      } else {
        addDemoModel(state.scene);
        state.loaded = true;
      }
    },

    render(gl, matrix) {
      if (!state.loaded) return;
      const rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      const mc   = mapboxgl.MercatorCoordinate.fromLngLat(state.lngLat, 0);
      const s    = mc.meterInMercatorCoordinateUnits();
      const modelMatrix = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .scale(new THREE.Vector3(s, -s, s))
        .multiply(rotX);
      state.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(modelMatrix);
      state.renderer.resetState();
      state.renderer.render(state.scene, state.camera);
      state.map.triggerRepaint();
    },

    onRemove() {
      state.scene?.traverse(obj => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (!m) return;
            Object.values(m).forEach(v => { if (v?.isTexture) v.dispose(); });
            m.dispose();
          });
        }
      });
    },
  };
}

function addDemoModel(scene) {
  const geo  = new THREE.BoxGeometry(10, 12, 8);
  const mat  = new THREE.MeshStandardMaterial({ color: 0xBC0613, roughness: 0.5, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 6;
  mesh.castShadow = true;
  scene.add(mesh);
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true }),
  );
  line.position.copy(mesh.position);
  scene.add(line);
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function MapboxViewer({ modelPath, hotspots = [], building, onHotspotClick }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef([]);
  const mapReadyRef  = useRef(false);
  const keysRef      = useRef(new Set());  // teclas presionadas actualmente
  const rafRef       = useRef(null);       // animación de teclado

  const { setModelLoading, setModelProgress } = useViewerStore();

  // ─── Inicializar mapa ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      zoom:      CAMPUS_VIEW.zoom,
      pitch:     CAMPUS_VIEW.pitch,
      bearing:   CAMPUS_VIEW.bearing ?? -15,
      center:    CAMPUS_VIEW.center,
      // ── Estilo Standard con objetos 3D nativos desactivados ──────────────
      // (solo se verán los modelos GLB propios del proyecto)
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          show3dObjects: false,  // desactiva edificios, árboles y landmarks 3D nativos
        },
      },
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.on('load', () => { mapReadyRef.current = true; });

    mapRef.current = map;
    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current    = null;
      mapReadyRef.current = false;
    };
  }, []);

  // ─── Teclado: registrar teclas ─────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      // Solo si el foco no está en un input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      keysRef.current.add(e.key.toLowerCase());
      // Shift izquierdo identificado por location
      if (e.key === 'Shift' && e.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) {
        keysRef.current.add('shiftleft');
      }
    };
    const onKeyUp = (e) => {
      keysRef.current.delete(e.key.toLowerCase());
      if (e.key === 'Shift') keysRef.current.delete('shiftleft');
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // ─── Teclado: loop de movimiento ───────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const map  = mapRef.current;
      const keys = keysRef.current;
      if (!map || keys.size === 0) return;

      const zoom    = map.getZoom();
      const bearing = map.getBearing();
      const pitch   = map.getPitch();
      const center  = map.getCenter();

      // Shift izquierdo → x4 velocidad
      const speedMult = keys.has('shiftleft') ? 4 : 1;

      // Escalar velocidad de pan con el zoom (más zoom → movimiento más fino)
      const panSpeed = PAN_SPEED * Math.pow(0.5, zoom - 14) * speedMult;

      // Dirección de avance basada en el bearing actual del mapa
      const bearingRad = (bearing * Math.PI) / 180;
      const sinB = Math.sin(bearingRad);
      const cosB = Math.cos(bearingRad);

      let dLng = 0;
      let dLat = 0;
      let dBearing = 0;
      let dPitch   = 0;

      // Avanzar / retroceder (W/S o ↑/↓)
      if (keys.has('w') || keys.has('arrowup')) {
        dLng -= sinB * panSpeed;
        dLat += cosB * panSpeed;
      }
      if (keys.has('s') || keys.has('arrowdown')) {
        dLng += sinB * panSpeed;
        dLat -= cosB * panSpeed;
      }
      // Strafe izquierda / derecha (A/D o ←/→)
      if (keys.has('a') || keys.has('arrowleft')) {
        dLng -= cosB * panSpeed;
        dLat -= sinB * panSpeed;
      }
      if (keys.has('d') || keys.has('arrowright')) {
        dLng += cosB * panSpeed;
        dLat += sinB * panSpeed;
      }
      // Rotar (Q/E)
      if (keys.has('q')) dBearing -= ROTATE_SPEED * speedMult;
      if (keys.has('e')) dBearing += ROTATE_SPEED * speedMult;
      // Pitch (R/F)
      if (keys.has('r')) dPitch = -PITCH_SPEED * speedMult;
      if (keys.has('f')) dPitch =  PITCH_SPEED * speedMult;

      if (dLng !== 0 || dLat !== 0) {
        map.setCenter([center.lng + dLng, center.lat + dLat]);
      }
      if (dBearing !== 0) {
        map.setBearing(bearing + dBearing);
      }
      if (dPitch !== 0) {
        map.setPitch(Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch + dPitch)));
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ─── Cargar modelo cuando cambia edificio ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const install = () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (!building) return;

      const lngLat = getCoords(building.code);
      setModelLoading(true);
      setModelProgress(0);

      map.addLayer(createModelLayer({
        id:         LAYER_ID,
        modelUrl:   modelPath || null,
        lngLat,
        onProgress: (p) => setModelProgress(p),
        onLoaded:   ()  => setModelLoading(false),
      }));

      map.flyTo({ center: lngLat, zoom: 17.2, pitch: 58, bearing: -20, speed: 0.8, essential: true });
    };

    if (mapReadyRef.current) install();
    else map.once('load', install);

    return () => {
      if (mapRef.current?.getLayer(LAYER_ID)) mapRef.current.removeLayer(LAYER_ID);
      setModelLoading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id, modelPath]);

  // ─── Marcadores de hotspots ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!building || !hotspots.length) return;

    const base = getCoords(building.code);
    const TYPE_COLORS = { lab: '#BC0613', office: '#2563eb', service: '#16a34a', access: '#d97706' };
    const TYPE_ICONS  = { lab: '🔬', office: '🏢', service: '⚙️', access: '🚪' };

    hotspots.forEach((hs, i) => {
      const angle  = (i / hotspots.length) * Math.PI * 2;
      const r      = 0.00004;
      const lngLat = [base[0] + Math.cos(angle) * r, base[1] + Math.sin(angle) * r * 0.8];
      const color  = TYPE_COLORS[hs.type] || '#BC0613';

      const el = document.createElement('div');
      el.style.cssText = `
        width:28px;height:28px;background:${color};
        border:2.5px solid #fff;border-radius:50%;
        cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:12px;transition:transform 0.15s;
      `;
      el.innerHTML = `<span>${TYPE_ICONS[hs.type] || '📍'}</span>`;
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.25)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
      el.addEventListener('click', () => onHotspotClick?.(hs));

      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map),
      );
    });
  }, [hotspots, building, onHotspotClick]);

  const flyToCampus = useCallback(() => {
    mapRef.current?.flyTo({ ...CAMPUS_VIEW, duration: 1200, essential: true });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Botón volver al campus */}
      {building && (
        <button
          onClick={flyToCampus}
          title="Ver campus completo"
          style={{
            position: 'absolute', top: 54, left: 12, zIndex: 20,
            width: 36, height: 36,
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)', color: 'var(--color-text-2)',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-soft)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg)'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
          </svg>
        </button>
      )}

      {/* Hint de teclado */}
      <div className="keyboard-hint" style={{
        position: 'absolute', top: building ? 98 : 54, left: 12, zIndex: 20,
        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)', padding: '0.45rem 0.6rem',
        boxShadow: 'var(--shadow-xs)', fontSize: '0.62rem',
        color: 'var(--color-text-3)', lineHeight: 1.7,
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {[
          ['W / ↑', 'Avanzar'],
          ['S / ↓', 'Retroceder'],
          ['A / ←', 'Izquierda'],
          ['D / →', 'Derecha'],
          ['Q / E', 'Rotar'],
          ['R / F', 'Pitch'],
        ].map(([key, label]) => (
          <div key={key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <kbd style={{
              background: 'var(--color-bg-soft)', border: '1px solid var(--color-border)',
              borderRadius: 4, padding: '0 4px', fontSize: '0.6rem',
              fontFamily: 'monospace', color: 'var(--color-text-2)',
              minWidth: 38, textAlign: 'center', flexShrink: 0,
            }}>{key}</kbd>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Badge estado edificio */}
      {building && (
        <div style={{
          position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
          padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: 'var(--shadow-md)', fontSize: '0.75rem', fontWeight: 700,
          color: 'var(--color-text)', whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }}/>
          {building.name}
          {modelPath
            ? <span style={{ color: 'var(--color-success)', fontWeight: 400, fontSize: '0.68rem' }}>· modelo 3D</span>
            : <span style={{ color: 'var(--color-warning)', fontWeight: 400, fontSize: '0.68rem' }}>· demo</span>
          }
        </div>
      )}

      {!building && (
        <div style={{
          position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
          padding: '0.5rem 1.2rem', color: 'var(--color-text-3)', fontSize: '0.78rem',
          boxShadow: 'var(--shadow-sm)', whiteSpace: 'nowrap',
        }}>
          🏛️ Selecciona un edificio en el panel izquierdo
        </div>
      )}
    </div>
  );
}
