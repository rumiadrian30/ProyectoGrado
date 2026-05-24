/**
 * MapboxViewer.jsx
 *
 * Visor integrado: Mapbox GL JS Standard + Three.js custom layer.
 *
 * Navegación: W/A/S/D o flechas → mover cámara
 *             Q/E               → rotar bearing
 *             R/F               → subir/bajar pitch
 *
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useViewerStore } from '../../store/viewerStore';
import {
  buildingOffsetToGPS,
  CAMPUS_VIEW,
  computeBuildingFlyTo,
} from '../../utils/buildingCoords';
import ControlsOverlay from './ControlsOverlay';
import MiniMap         from './MiniMap';
import ViewerControls  from './ViewerControls';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const LAYER_ID = 'fie-model-layer';

// ─── Velocidad de movimiento de teclado ───────────────────────────────────────
const PAN_SPEED    = 0.0002;
const ROTATE_SPEED = 1.5;
const PITCH_SPEED  = 1.0;
const PITCH_MIN    = 0;
const PITCH_MAX    = 85;

// ─── Custom Three.js layer ────────────────────────────────────────────────────
function createModelLayer({ id, modelUrl, lngLat, buildingPos, modelScale, dracoLoader, onProgress, onLoaded, onError }) {
  const state = { scene: null, camera: null, renderer: null, map: null, loaded: false, lngLat };
  // Building position (inherited by all its models)
  const bx = parseFloat(buildingPos?.x) || 0;
  const by = parseFloat(buildingPos?.y) || 0;
  const bz = parseFloat(buildingPos?.z) || 0;
  // Model scale only
  const sx = parseFloat(modelScale?.sx) || 1;
  const sy = parseFloat(modelScale?.sy) || 1;
  const sz = parseFloat(modelScale?.sz) || 1;
  // Model rotation (degrees → radians)
  const toRad = deg => (parseFloat(deg) || 0) * Math.PI / 180;
  const rx = toRad(modelScale?.rx);
  const ry = toRad(modelScale?.ry);
  const rz = toRad(modelScale?.rz);

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
            model.rotation.set(rx, ry, rz);
            const box    = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;
            model.position.x += bx;
            model.position.y += by;
            model.position.z += bz;
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
        addDemoModel(state.scene, bx, by, bz);
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

function addDemoModel(scene, bx = 0, by = 0, bz = 0) {
  const geo  = new THREE.BoxGeometry(10, 12, 8);
  const mat  = new THREE.MeshStandardMaterial({ color: 0xBC0613, roughness: 0.5, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  // Centrar en el suelo (y=0) y aplicar posición del building padre
  mesh.position.set(bx, by + 6, bz); // +6 = mitad de la altura (12/2)
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
export default function MapboxViewer({
  allModels = [], buildings = [], building, hotspots = [],
  onBuildingClick, onHotspotClick, isMobile,
}) {
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

  const [webglError,      setWebglError]      = useState(false);
  const [pinPositions,    setPinPositions]    = useState([]); // píxeles de building pins
  const [isFlying,        setIsFlying]        = useState(false); // HU-05: botón deshabilitado durante animación
  // Overlay de instrucciones: visible una vez por sesión
  const [showOverlay, setShowOverlay] = useState(
    () => sessionStorage.getItem('fie-overlay-dismissed') !== '1'
  );

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

      // Remover layers que ya no están en allModels
      installedLayers.current.forEach((oldHash, layerId) => {
        if (!targetIds.has(layerId) && map.getLayer(layerId)) {
          map.removeLayer(layerId);
          installedLayers.current.delete(layerId);
        }
      });

      // Detectar modelos nuevos O con cambios de transform
      const modelsToInstall = allModels.filter(m => {
        const layerId = `fie-model-${m.building_id}`;
        const newHash = `${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`;
        const oldHash = installedLayers.current.get(layerId);
        
        // Instalar si: no existe el layer O el hash cambió
        if (!oldHash || oldHash !== newHash) {
          // Si el layer existe pero el hash cambió, removerlo primero
          if (oldHash && map.getLayer(layerId)) {
            map.removeLayer(layerId);
            installedLayers.current.delete(layerId);
          }
          return true;
        }
        return false;
      });

      if (!modelsToInstall.length) return;

      pendingLoadsRef.current += modelsToInstall.length;
      setModelLoading(true);
      setModelProgress(0);

      modelsToInstall.forEach(m => {
        const layerId = `fie-model-${m.building_id}`;

        // ── Anchor GPS fijo + posición heredada del building ─────────────────
        // Todos los layers comparten CAMPUS_VIEW.center como anchor GPS.
        // La posición Three.js viene del building padre (offset_x/y/z).
        // El modelo solo aporta su escala (scale_x/y/z).
        const onDone = () => {
          pendingLoadsRef.current = Math.max(0, pendingLoadsRef.current - 1);
          if (pendingLoadsRef.current === 0) setModelLoading(false);
        };

        map.addLayer(createModelLayer({
          id:          layerId,
          modelUrl:    m.file_path,
          lngLat:      CAMPUS_VIEW.center,        // anchor GPS fijo para todos
          buildingPos: {                          // posición heredada del building
            x: parseFloat(m.building_offset_x) || 0,
            y: parseFloat(m.building_offset_y) || 0,
            z: parseFloat(m.building_offset_z) || 0,
          },
          modelScale: {                           // escala y rotación del modelo
            sx: parseFloat(m.scale_x)  || 1,
            sy: parseFloat(m.scale_y)  || 1,
            sz: parseFloat(m.scale_z)  || 1,
            rx: parseFloat(m.rotate_x) || 0,
            ry: parseFloat(m.rotate_y) || 0,
            rz: parseFloat(m.rotate_z) || 0,
          },
          dracoLoader:  dracoLoaderRef.current,
          onProgress:   (p) => setModelProgress(p),
          onLoaded:     onDone,
          onError:      onDone,
        }));
        // Guardar hash del transform para detectar cambios de escala/rotación
        const transformHash = `${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`;
        installedLayers.current.set(layerId, transformHash);
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
  // Incluir hash del transform en las deps para detectar cambios de escala/rotación
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allModels.map(m =>
    `${m.building_id}:${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`
  ).join('|')]);

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
  {/*}
  useEffect(() => {
    const map = mapRef.current;
    if (!building) return;

    const hasRealModel = allModels.some(m => m.building_id === building.id);
    if (hasRealModel) return;

    const demoLayerId = `fie-demo-${building.id}`;

    const install = () => {
      if (map.getLayer(demoLayerId)) return;
      const lngLat = getCoords(building.code);
      map.addLayer(createModelLayer({
        id:             demoLayerId,
        modelUrl:       null,       // → addDemoModel (cubo rojo)
        lngLat,
        modelTransform: {},
        dracoLoader:    null,
      }));
    };

    if (mapReadyRef.current) install();
    else map.once('load', install);

    return () => {
      // Cleanup: al cambiar edificio O al llegar un modelo real
      if (mapRef.current?.getLayer(demoLayerId)) {
        mapRef.current.removeLayer(demoLayerId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id, allModels.map(m => m.building_id).join(',')]); */}

  // ─── Building pins — coordenadas píxel via map.project() ─────────────────
  //
  // Por qué map.project() y no mapboxgl.Marker:
  //   En Mapbox GL JS 3.x los Marker DOM forman parte del árbol CSS 3D del
  //   canvas. Aunque se use pitchAlignment:'viewport', el motor aplica un
  //   factor de escala perspectivo que varía con el zoom/pitch, haciendo que
  //   los pins crezcan al alejar y se encojan al acercar.
  //
  //   map.project(lngLat) devuelve las coordenadas en píxeles del viewport.
  //   Los pins se renderizan como divs React absolutamente posicionados encima
  //   del canvas: son CSS plano, el tamaño es 100% estático (40×40 px siempre).
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !buildings.length) { setPinPositions([]); return; }

    function update() {
      setPinPositions(buildings.map(b => {
        const lngLat = b._lngLat ?? buildingOffsetToGPS(
          parseFloat(b.offset_x) || 0,
          parseFloat(b.offset_z) || 0,
        );
        const pt = map.project(lngLat);
        return { b, x: pt.x, y: pt.y };
      }));
    }

    update();
    const EVENTS = ['move', 'zoom', 'pitch', 'bearing', 'resize'];
    EVENTS.forEach(e => map.on(e, update));
    return () => {
      EVENTS.forEach(e => map.off(e, update));
      setPinPositions([]);
    };
  }, [buildings]);

  // HU-05 — flyToCampus desactiva el botón durante la animación (~1.2 s)
  const flyToCampus = useCallback(() => {
    const map = mapRef.current;
    if (!map || isFlying) return;
    setIsFlying(true);
    map.flyTo({ ...CAMPUS_VIEW, duration: 1200, essential: true });
    map.once('moveend', () => setIsFlying(false));
  }, [isFlying]);

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

      {/* ── Keyframes ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pinPulse {
          0%,100% { transform: scale(1);    opacity: 0.6; }
          50%      { transform: scale(1.4);  opacity: 0.15; }
        }
      `}</style>

      {/* ── Building Pins — divs React posicionados con map.project() ──
          position:absolute sobre el canvas, tamaño fijo 40×40 px.
          Completamente inmunes al zoom/pitch de Mapbox.              */}
      {pinPositions.map(({ b, x, y }) => {
        const isSelected = building && String(b.id) === String(building.id);
        return (
          <div
            key={b.id}
            onClick={() => onBuildingClick?.(b)}
            onTouchEnd={e => { e.preventDefault(); onBuildingClick?.(b); }}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: x,
              top:  y,
              transform: 'translate(-50%, -50%)',
              width: 40,
              height: 40,
              zIndex: 10,
              cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Anillo pulsante — solo edificio activo */}
            {isSelected && (
              <div style={{
                position: 'absolute',
                inset: -7,
                borderRadius: '50%',
                border: '2px solid rgba(188,6,19,0.45)',
                animation: 'pinPulse 1.8s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
            )}
            {/* Círculo principal — 40×40 px fijo siempre */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: isSelected ? '#BC0613' : '#1f2937',
              border: `${isSelected ? 3 : 2.5}px solid #ffffff`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSelected
                ? '0 4px 18px rgba(188,6,19,0.55)'
                : '0 2px 10px rgba(0,0,0,0.38)',
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
              pointerEvents: 'none',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
              </svg>
            </div>
          </div>
        );
      })}

      {/* ── Overlay de instrucciones ─────────────────────────────── */}
      {showOverlay && (
        <ControlsOverlay
          isMobile={isMobile}
          onDismiss={() => {
            setShowOverlay(false);
            sessionStorage.setItem('fie-overlay-dismissed', '1');
          }}
        />
      )}

      {/* Botón Cámara Inicial — HU-05: deshabilitado durante la animación flyTo */}
      {building && (
        <button
          onClick={flyToCampus}
          disabled={isFlying}
          title={isFlying ? 'Animando…' : 'Cámara Inicial'}
          aria-label="Volver a vista inicial del campus"
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 20,
            width: 36, height: 36,
            background: isFlying ? 'var(--color-bg-soft)' : 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: isFlying ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            color: isFlying ? 'var(--color-text-4)' : 'var(--color-text-2)',
            opacity: isFlying ? 0.6 : 1,
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { if (!isFlying) e.currentTarget.style.background = 'var(--color-bg-soft)'; }}
          onMouseLeave={e => { if (!isFlying) e.currentTarget.style.background = 'var(--color-bg)'; }}
        >
          {isFlying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                <animateTransform attributeName="transform" type="rotate"
                  from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
            </svg>
          )}
        </button>
      )}

      {/* Hint de controles colapsable */}
      <ViewerControls isMobile={isMobile} />

      {/* HU-10: Mini-mapa colapsable */}
      <MiniMap mainMap={mapRef.current} isMobile={isMobile} />

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
          Selecciona un edificio en el panel
        </div>
      )}
    </div>
  );
}