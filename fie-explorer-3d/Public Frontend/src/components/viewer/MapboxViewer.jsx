/**
 * MapboxViewer.jsx
 *
 * Visor integrado: Mapbox GL JS Standard (sin objetos 3D nativos para que
 * solo se vean los modelos GLB propios) + Three.js custom layer.
 *
 * Navegación: W/A/S/D o flechas → mover cámara
 *             Q/E               → rotar bearing
 *             R/F               → subir/bajar pitch
 *
 * Centrado dinámico al seleccionar edificio (computeBuildingFlyTo):
 *   1. Si existe modelo 3D → coords del modelo + offsets del admin
 *   2. Si hay hotspots con posición → centroide convertido a GPS
 *   3. Fallback → coordenadas estáticas del campus
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useViewerStore } from '../../store/viewerStore';
import {
  getCoords,
  CAMPUS_VIEW,
  BUILDING_SIZES,
  computeBuildingFlyTo,
} from '../../utils/buildingCoords';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const LAYER_ID = 'fie-model-layer';

// ─── Velocidad de movimiento de teclado ───────────────────────────────────────
const PAN_SPEED    = 0.0002;
const ROTATE_SPEED = 1.5;
const PITCH_SPEED  = 1.0;
const PITCH_MIN    = 0;
const PITCH_MAX    = 85;

// ─── Custom Three.js layer ────────────────────────────────────────────────────
function createModelLayer({ id, modelUrl, lngLat, modelTransform, dracoLoader, onProgress, onLoaded, onError }) {
  const state = { scene: null, camera: null, renderer: null, map: null, loaded: false, lngLat };
  const sx = parseFloat(modelTransform?.scale_x)  || 1;
  const sy = parseFloat(modelTransform?.scale_y)  || 1;
  const sz = parseFloat(modelTransform?.scale_z)  || 1;
  const ox = parseFloat(modelTransform?.offset_x) || 0;
  const oy = parseFloat(modelTransform?.offset_y) || 0;
  const oz = parseFloat(modelTransform?.offset_z) || 0;

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
        if (dracoLoader) loader.setDRACOLoader(dracoLoader);
        loader.load(
          modelUrl,
          (gltf) => {
            const model = gltf.scene;
            model.scale.set(sx, sy, sz);
            const box    = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;
            model.position.x += ox;
            model.position.y += oy;
            model.position.z += oz;
            const floorBox = new THREE.Box3().setFromObject(model);
            if (floorBox.min.y < 0) {
              model.position.y -= floorBox.min.y;
            }
            model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            state.scene.add(model);
            state.loaded = true;
            onLoaded?.();
            map.triggerRepaint();
          },
          (xhr) => { if (xhr.total) onProgress?.(Math.round((xhr.loaded / xhr.total) * 100)); },
          (err) => {
            console.error(`[MapboxViewer] Error cargando ${modelUrl}:`, err);
            onError?.();
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
export default function MapboxViewer({ allModels = [], building, hotspots = [], onHotspotClick, isMobile }) {
  const containerRef     = useRef(null);
  const mapRef           = useRef(null);
  const markersRef       = useRef([]);
  const mapReadyRef      = useRef(false);
  const keysRef          = useRef(new Set());
  const rafRef           = useRef(null);
  const dracoLoaderRef   = useRef(null);
  const installedLayers  = useRef(new Map());
  const pendingLoadsRef  = useRef(0);
  const buildingRef      = useRef(building);

  const allModelsRef = useRef(allModels);
  const hotspotsRef  = useRef(hotspots);

  const { setModelLoading, setModelProgress } = useViewerStore();

  const [webglError, setWebglError] = useState(false);

  useEffect(() => { allModelsRef.current = allModels; }, [allModels]);
  useEffect(() => { hotspotsRef.current  = hotspots;  }, [hotspots]);
  useEffect(() => { buildingRef.current  = building;  }, [building]);

  // ─── Inicializar mapa ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    if (!mapboxgl.supported()) {
      setWebglError(true);
      return;
    }

    let map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        attributionControl: false,
        zoom:      CAMPUS_VIEW.zoom,
        pitch:     CAMPUS_VIEW.pitch,
        bearing:   CAMPUS_VIEW.bearing ?? -15,
        center:    CAMPUS_VIEW.center,
        projection: 'mercator',
        style: 'mapbox://styles/mapbox/standard',
        config: {
          basemap: {
            show3dObjects: false,
          },
        },
        antialias: true,
      });
    } catch {
      setWebglError(true);
      return;
    }

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('load', () => {
      mapReadyRef.current = true;
      map.setProjection('mercator');
      if (buildingRef.current) {
        const params = computeBuildingFlyTo(
          buildingRef.current,
          allModelsRef.current,
          hotspotsRef.current,
        );
        if (params) {
          mapRef.current?.flyTo({ ...params, speed: 0.85, curve: 1.4, essential: true });
        }
      }
    });

    mapRef.current = map;
    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current      = null;
      mapReadyRef.current = false;
    };
  }, []);

  // ─── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    const ro = new ResizeObserver(() => { mapRef.current?.resize(); });
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  // ─── Teclado: registrar teclas ─────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      keysRef.current.add(e.key.toLowerCase());
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

      const speedMult = keys.has('shiftleft') ? 4 : 1;
      const panSpeed  = PAN_SPEED * Math.pow(0.5, zoom - 14) * speedMult;
      const bearingRad = (bearing * Math.PI) / 180;
      const sinB = Math.sin(bearingRad);
      const cosB = Math.cos(bearingRad);

      let dLng = 0, dLat = 0, dBearing = 0, dPitch = 0;

      if (keys.has('w') || keys.has('arrowup'))    { dLng -= sinB * panSpeed; dLat += cosB * panSpeed; }
      if (keys.has('s') || keys.has('arrowdown'))  { dLng += sinB * panSpeed; dLat -= cosB * panSpeed; }
      if (keys.has('a') || keys.has('arrowleft'))  { dLng -= cosB * panSpeed; dLat -= sinB * panSpeed; }
      if (keys.has('d') || keys.has('arrowright')) { dLng += cosB * panSpeed; dLat += sinB * panSpeed; }
      if (keys.has('q')) dBearing -= ROTATE_SPEED * speedMult;
      if (keys.has('e')) dBearing += ROTATE_SPEED * speedMult;
      if (keys.has('r')) dPitch = -PITCH_SPEED * speedMult;
      if (keys.has('f')) dPitch =  PITCH_SPEED * speedMult;

      if (dLng !== 0 || dLat !== 0) map.setCenter([center.lng + dLng, center.lat + dLat]);
      if (dBearing !== 0) map.setBearing(bearing + dBearing);
      if (dPitch !== 0) map.setPitch(Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch + dPitch)));
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ─── DRACOLoader compartido ───────────────────────────────────────────────
  useEffect(() => {
    const dl = new DRACOLoader();
    dl.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dl.preload();
    dracoLoaderRef.current = dl;
    return () => { dl.dispose(); dracoLoaderRef.current = null; };
  }, []);

  // ─── Instalar layers de modelos reales ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dracoLoaderRef.current) return;

    const install = () => {
      const targetIds = new Set(allModels.map(m => `fie-model-${m.building_id}`));

      installedLayers.current.forEach((_, layerId) => {
        if (!targetIds.has(layerId) && map.getLayer(layerId)) {
          map.removeLayer(layerId);
          installedLayers.current.delete(layerId);
        }
      });

      const newModels = allModels.filter(m => !installedLayers.current.has(`fie-model-${m.building_id}`));
      if (!newModels.length) return;

      pendingLoadsRef.current += newModels.length;
      setModelLoading(true);
      setModelProgress(0);

      newModels.forEach(m => {
        const layerId = `fie-model-${m.building_id}`;
        const lngLat  = getCoords(m.building_code);

        const onDone = () => {
          pendingLoadsRef.current = Math.max(0, pendingLoadsRef.current - 1);
          if (pendingLoadsRef.current === 0) setModelLoading(false);
        };

        map.addLayer(createModelLayer({
          id:             layerId,
          modelUrl:       m.file_path,
          lngLat,
          modelTransform: m,
          dracoLoader:    dracoLoaderRef.current,
          onProgress:     (p) => setModelProgress(p),
          onLoaded:       onDone,
          onError:        onDone,
        }));
        installedLayers.current.set(layerId, true);
      });
    };

    if (mapReadyRef.current) install();
    else map.once('load', install);

    return () => {
      installedLayers.current.forEach((_, layerId) => {
        if (mapRef.current?.getLayer(layerId)) mapRef.current.removeLayer(layerId);
      });
      installedLayers.current.clear();
      pendingLoadsRef.current = 0;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allModels.map(m => m.building_id).join(',')]);

  // ─── Volar al edificio seleccionado ───────────────────────────────────────
  useEffect(() => {
    if (!building || !mapReadyRef.current) return;

    const params = computeBuildingFlyTo(
      building,
      allModelsRef.current,
      hotspotsRef.current,
    );
    if (!params) return;

    mapRef.current?.flyTo({ ...params, speed: 0.85, curve: 1.4, essential: true });

    console.debug('[MapboxViewer] flyTo', {
      building: building.code,
      source:   allModelsRef.current.some(m => m.building_id === building.id)
                  ? 'model' : hotspotsRef.current.length ? 'hotspots' : 'fallback',
      ...params,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id]);

  // ─── Refinamiento de cámara cuando cargan hotspots (sin modelo) ───────────
  const hotspotIdsKey = hotspots.map(h => h.id).sort().join(',');
  useEffect(() => {
    const map = mapRef.current;
    if (!building || !hotspots.length || !map || !mapReadyRef.current) return;

    const hasModel = allModelsRef.current.some(m => m.building_id === building.id);
    if (hasModel) return;

    const hasMeaningfulPos = hotspots.some(
      h => Math.abs(parseFloat(h.pos_x) || 0) > 1 || Math.abs(parseFloat(h.pos_z) || 0) > 1,
    );
    if (!hasMeaningfulPos) return;

    const params = computeBuildingFlyTo(building, [], hotspots);
    if (!params) return;

    map.flyTo({ ...params, speed: 0.55, curve: 1.2, essential: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspotIdsKey, building?.id]);

  // ─── Demo model para edificio sin modelo 3D registrado ────────────────────
  // Se instala cuando el edificio seleccionado no tiene modelo real.
  // Se destruye automáticamente cuando allModels cambia e incluye ese edificio
  // (es decir, cuando se sube un modelo real en el admin).
  useEffect(() => {
    const map = mapRef.current;
    if (!building) return;

    const hasRealModel = allModels.some(
      m => String(m.building_id) === String(building.id)
    );

    const demoLayerId = `fie-demo-${building.id}`;

    if (hasRealModel) {
      if (mapRef.current?.getLayer(demoLayerId)) {
        mapRef.current.removeLayer(demoLayerId);
      }
      return;
    }

    // Obtener coordenadas — si el edificio no está en buildingCoords,
    // usar las coordenadas del campus como fallback en lugar de undefined
    const lngLat = getCoords(building.code) ?? CAMPUS_VIEW.center;
    if (!lngLat) return; // seguridad extra

    const install = () => {
      if (map.getLayer(demoLayerId)) return;
      map.addLayer(createModelLayer({
        id:             demoLayerId,
        modelUrl:       null,
        lngLat,
        modelTransform: {},
        dracoLoader:    null,
      }));
    };

    if (mapReadyRef.current) install();
    else map.once('load', install);

    return () => {
      if (mapRef.current?.getLayer(demoLayerId)) {
        mapRef.current.removeLayer(demoLayerId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id, allModels.map(m => m.building_id).join(',')]);

  // ─── Marcadores de hotspots ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!building || !hotspots.length) return;

    const base = getCoords(building.code);
    const TYPE_COLORS = { classroom: '#6d28d9', lab: '#BC0613', office: '#2563eb', service: '#16a34a', access: '#d97706' };
    const TYPE_ICONS  = { classroom: '🏫', lab: '🔬', office: '🏢', service: '⚙️', access: '🚪' };

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

  // ─── Pantalla de error WebGL ──────────────────────────────────────────────
  if (webglError) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg-soft, #f8fafc)',
        gap: '1rem', padding: '2rem', textAlign: 'center',
      }}>
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h3 style={{ margin: 0, color: 'var(--color-text, #111827)', fontSize: '1.15rem', fontWeight: 700 }}>
          WebGL no disponible
        </h3>
        <p style={{
          maxWidth: 380, margin: 0,
          color: 'var(--color-text-3, #6b7280)',
          fontSize: '0.88rem', lineHeight: 1.6,
        }}>
          Tu navegador o dispositivo no puede inicializar WebGL, tecnología necesaria
          para el visor 3D. Actualiza tu navegador o descarga uno compatible:
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="https://www.google.com/chrome" target="_blank" rel="noreferrer"
            style={{ padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 600, background: '#1967D2', color: '#fff', textDecoration: 'none', fontSize: '0.85rem' }}>
            🌐 Descargar Chrome
          </a>
          <a href="https://www.mozilla.org/firefox" target="_blank" rel="noreferrer"
            style={{ padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 600, background: '#FF7139', color: '#fff', textDecoration: 'none', fontSize: '0.85rem' }}>
            🦊 Descargar Firefox
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Botón volver al campus */}
      {building && (
        <button
          onClick={flyToCampus}
          title="Ver campus completo"
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 20,
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
      {!isMobile && (
        <div style={{
          position: 'absolute', top: 54, right: 12, zIndex: 20,
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
      )}

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
          {allModels.some(m => m.building_id === building.id)
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