import React, { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useViewerStore } from '../../store/viewerStore';
import {
  buildingOffsetToGPS,
  CAMPUS_VIEW,
} from '../../utils/buildingCoords';
import ControlsOverlay from './ControlsOverlay';
import MiniMap         from './MiniMap';
import ViewerControls  from './ViewerControls';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const PAN_SPEED    = 0.0002;
const ROTATE_SPEED = 1.5;
const PITCH_SPEED  = 1.0;
const PITCH_MIN    = 0;
const PITCH_MAX    = 85;

// Conversión metros → grados. El centro del campus fija la latitud de referencia
// para el factor de longitud. Estos valores son constantes durante la sesión.
const DEG_PER_METER_LAT = 1 / 111_320;
const DEG_PER_METER_LNG =
  1 / (111_320 * Math.cos((CAMPUS_VIEW.center[1] * Math.PI) / 180));

const TYPE_COLORS = {
  classroom: '#2563eb',
  lab:       '#7c3aed',
  office:    '#0891b2',
  service:   '#059669',
  access:    '#d97706',
};

const PIN_POST_H = 6;
const PIN_POST_R = 0.22;
const PIN_HEAD_R = 1.8;

const BUILDING_PIN_ELEVATION = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve el par [lng, lat] del centroide geográfico de un edificio.
 *
 * Prioridad:
 *  1. building.longitude / building.latitude  → coordenadas GPS reales de la BD
 *  2. building.offset_x  / building.offset_z  → conversión métrica (fallback)
 *
 * La conversión del eje Z respeta el convenio: Z negativo desplaza hacia el
 * Norte, por eso se resta (en lugar de sumar) al componente de latitud.
 */
function buildingCenter(b) {
  if (!b) return [...CAMPUS_VIEW.center];

  //  conversión de offsets locales a GPS.
  // offset_z negativo → Norte → se resta del componente latitud.
  // offset_x positivo → Este  → se suma al componente longitud.
  const ox = parseFloat(b.offset_x) || 0;
  const oz = parseFloat(b.offset_z) || 0;

  return [
    CAMPUS_VIEW.center[0] + (ox * DEG_PER_METER_LNG),
    CAMPUS_VIEW.center[1] - (oz * DEG_PER_METER_LAT),
  ];
}

/**
 * Parámetros de cámara para el flyTo al seleccionar un edificio.
 *
 * - El center se obtiene EXCLUSIVAMENTE del centroide geográfico del edificio
 *   (coordenadas GPS de la BD o conversión offset→GPS). Nunca se promedian
 *   posiciones locales de hotspots porque son métricas relativas al GLB y
 *   no representan desplazamientos geográficos reales.
 * - zoom/pitch fijos garantizan que el bloque completo quede encuadrado.
 */
function getBuildingFlyTo(building) {
  return {
    center:  buildingCenter(building),
    zoom:    18.8,
    pitch:   60,
    bearing: CAMPUS_VIEW.bearing ?? -15,
    speed:   0.85,
    curve:   1.4,
    essential: true,
  };
}

function createPin3D(hexColor) {
  const group    = new THREE.Group();
  const pinColor = new THREE.Color(hexColor);

  const postGeo = new THREE.CylinderGeometry(PIN_POST_R, PIN_POST_R, PIN_POST_H, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.55 });
  const post    = new THREE.Mesh(postGeo, postMat);
  post.position.y = PIN_POST_H * 0.5;
  post.castShadow = true;
  group.add(post);

  const headGeo = new THREE.SphereGeometry(PIN_HEAD_R, 14, 14);
  const headMat = new THREE.MeshStandardMaterial({
    color: pinColor, emissive: pinColor, emissiveIntensity: 0.22,
    roughness: 0.18, metalness: 0.06,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = PIN_POST_H + PIN_HEAD_R;
  head.castShadow = true;
  group.add(head);

  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// createModelLayer
// ─────────────────────────────────────────────────────────────────────────────
function createModelLayer({
  id, modelUrl, lngLat, buildingPos, modelScale,
  dracoLoader, onProgress, onLoaded, onError,
  initialHotspots = [],
}) {
  const state = {
    scene: null, camera: null, renderer: null, map: null,
    loaded: false, lngLat,
    buildingGroup: null,
    pivot:      { cx: 0, cz: 0 },
    hotspots:   initialHotspots.filter(h => h.is_active !== false),
    pinData:    [],
    lastMatrix: null,
    modelMatrix: null,
  };

  const bx = parseFloat(buildingPos?.x) || 0;
  const by = parseFloat(buildingPos?.y) || 0;
  const bz = parseFloat(buildingPos?.z) || 0;
  const sx = parseFloat(modelScale?.sx) || 1;
  const sy = parseFloat(modelScale?.sy) || 1;
  const sz = parseFloat(modelScale?.sz) || 1;
  const toRad = deg => (parseFloat(deg) || 0) * Math.PI / 180;
  const rx = toRad(modelScale?.rx);
  const ry = toRad(modelScale?.ry);
  const rz = toRad(modelScale?.rz);

  function rebuildPins() {
    if (!state.buildingGroup) return;
    state.pinData.forEach(({ pinGroup }) => {
      state.buildingGroup.remove(pinGroup);
      pinGroup.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => m?.dispose());
      });
    });
    state.pinData = [];

    state.hotspots.forEach(h => {
      const pinGroup = createPin3D(TYPE_COLORS[h.type] ?? '#6b7280');
      const lx = (parseFloat(h.pos_x) || 0) - state.pivot.cx;
      const ly =  parseFloat(h.pos_y) || 0;
      const lz = (parseFloat(h.pos_z) || 0) - state.pivot.cz;
      pinGroup.position.set(lx, ly, lz);
      pinGroup.userData.hotspot = h;
      state.buildingGroup.add(pinGroup);
      state.pinData.push({ pinGroup, hotspot: h, headLocalY: ly + PIN_POST_H + PIN_HEAD_R });
    });

    state.map?.triggerRepaint();
  }

  function buildMVP() {
    if (!state.lastMatrix || !state.modelMatrix) return null;
    return new THREE.Matrix4().fromArray(state.lastMatrix).multiply(state.modelMatrix);
  }

  function projectToScreen(wx, wy, wz) {
    const mvp = buildMVP();
    if (!mvp) return null;
    const canvas = state.map.getCanvas();
    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.width;
    const H      = canvas.height;
    const clip   = new THREE.Vector4(wx, wy, wz, 1).applyMatrix4(mvp);
    if (clip.w <= 0) return null;
    return {
      x: ((clip.x / clip.w + 1) * 0.5 * W) / dpr,
      y: ((1 - clip.y / clip.w) * 0.5 * H) / dpr,
    };
  }

  const layer = {
    id, type: 'custom', renderingMode: '3d',

    onAdd(map, gl) {
      state.map    = map;
      state.camera = new THREE.Camera();
      state.scene  = new THREE.Scene();

      state.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const sun = new THREE.DirectionalLight(0xfff5e4, 2.5);
      sun.position.set(60, 100, 40);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { near: 0.5, far: 400, left: -120, right: 120, bottom: -120, top: 120 });
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

      state.buildingGroup = new THREE.Group();
      state.buildingGroup.position.set(bx, by, bz);
      state.scene.add(state.buildingGroup);

      if (modelUrl) {
        const loader = new GLTFLoader();
        if (dracoLoader) loader.setDRACOLoader(dracoLoader);
        loader.load(
          modelUrl,
          gltf => {
            const model = gltf.scene;
            model.scale.set(sx, sy, sz);
            model.rotation.set(rx, ry, rz);
            const box    = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            state.pivot  = { cx: center.x, cz: center.z };
            model.position.set(-center.x, -box.min.y, -center.z);
            const fb = new THREE.Box3().setFromObject(model);
            if (fb.min.y < 0) model.position.y -= fb.min.y;
            model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            state.buildingGroup.add(model);
            state.loaded = true;
            rebuildPins();
            onLoaded?.();
            map.triggerRepaint();
          },
          xhr => { if (xhr.total) onProgress?.(Math.round((xhr.loaded / xhr.total) * 100)); },
          err => { console.error(`[MapboxViewer] ${modelUrl}:`, err); onError?.(); },
        );
      } else {
        addDemoModel(state.buildingGroup);
        state.pivot  = { cx: 0, cz: 0 };
        state.loaded = true;
        rebuildPins();
      }
    },

    render(gl, matrix) {
      if (!state.loaded) return;
      state.lastMatrix = matrix;
      const rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      const mc   = mapboxgl.MercatorCoordinate.fromLngLat(state.lngLat, 0);
      const s    = mc.meterInMercatorCoordinateUnits();
      state.modelMatrix = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .scale(new THREE.Vector3(s, -s, s))
        .multiply(rotX);
      state.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(state.modelMatrix);
      state.renderer.resetState();
      state.renderer.render(state.scene, state.camera);
    },

    onRemove() {
      state.scene?.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          if (!m) return;
          Object.values(m).forEach(v => { if (v?.isTexture) v.dispose(); });
          m.dispose();
        });
      });
    },

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Inyecta los hotspots del building_id propio de esta capa.
     * Recibe ÚNICAMENTE la partición ya filtrada (building_id coincidente).
     * Los hotspots inactivos se descartan aquí, no en el caller.
     */
    updateHotspots(newHotspots) {
      state.hotspots = (newHotspots ?? []).filter(h => h.is_active !== false);
      rebuildPins();
    },

    getScreenCenter() {
      const gp = state.buildingGroup?.position;
      if (!gp) return null;
      return projectToScreen(gp.x, gp.y + BUILDING_PIN_ELEVATION, gp.z);
    },

    hitTest(cssX, cssY) {
      if (!state.lastMatrix || !state.modelMatrix || !state.pinData.length) return null;
      const dpr    = window.devicePixelRatio || 1;
      const px     = cssX * dpr;
      const py     = cssY * dpr;
      const canvas = state.map.getCanvas();
      const W      = canvas.width;
      const H      = canvas.height;
      const mvp    = buildMVP();
      const gp     = state.buildingGroup.position;
      let closest  = null, closestDist = Infinity;
      const THRESHOLD = 32 * dpr;

      for (const { pinGroup, hotspot, headLocalY } of state.pinData) {
        const clip = new THREE.Vector4(
          gp.x + pinGroup.position.x,
          gp.y + headLocalY,
          gp.z + pinGroup.position.z,
          1,
        ).applyMatrix4(mvp);
        if (clip.w <= 0) continue;
        const sx   = ((clip.x / clip.w + 1) * 0.5 * W);
        const sy   = ((1 - clip.y / clip.w) * 0.5 * H);
        const dist = Math.hypot(sx - px, sy - py);
        if (dist < THRESHOLD && dist < closestDist) { closestDist = dist; closest = hotspot; }
      }
      return closest;
    },
  };

  return layer;
}

function addDemoModel(group) {
  const geo  = new THREE.BoxGeometry(10, 12, 8);
  const mat  = new THREE.MeshStandardMaterial({ color: 0xBC0613, roughness: 0.5, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, 6, 0);
  mesh.castShadow = true;
  group.add(mesh);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true }),
  );
  edges.position.copy(mesh.position);
  group.add(edges);
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function MapboxViewer({
  allModels    = [],
  buildings    = [],
  building,
  hotspots     = [],
  allHotspots  = [],
  onBuildingClick,
  onHotspotClick,
  isMobile,
}) {
  const containerRef      = useRef(null);
  const mapRef            = useRef(null);
  const mapReadyRef       = useRef(false);
  const keysRef           = useRef(new Set());
  const rafRef            = useRef(null);
  const dracoLoaderRef    = useRef(null);
  const installedLayers   = useRef(new Map());
  const layerRefs         = useRef(new Map());
  const pendingLoadsRef   = useRef(0);
  const buildingRef       = useRef(building);
  const allModelsRef      = useRef(allModels);
  const allHotspotsRef    = useRef(allHotspots);
  const onHotspotClickRef = useRef(onHotspotClick);

  const { setModelLoading, setModelProgress } = useViewerStore();

  const [webglError,    setWebglError]    = useState(false);
  const [pinPositions,  setPinPositions]  = useState([]);
  const [isFlying,      setIsFlying]      = useState(false);
  const [layersVersion, setLayersVersion] = useState(0);
  const [showOverlay,   setShowOverlay]   = useState(
    () => sessionStorage.getItem('fie-overlay-dismissed') !== '1'
  );

  useEffect(() => { allModelsRef.current      = allModels;     }, [allModels]);
  useEffect(() => { allHotspotsRef.current    = allHotspots;   }, [allHotspots]);
  useEffect(() => { buildingRef.current       = building;      }, [building]);
  useEffect(() => { onHotspotClickRef.current = onHotspotClick; }, [onHotspotClick]);

  // ── Mapa init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;
    if (!mapboxgl.supported()) { setWebglError(true); return; }
    let map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        attributionControl: false,
        zoom:    CAMPUS_VIEW.zoom,
        pitch:   CAMPUS_VIEW.pitch,
        bearing: CAMPUS_VIEW.bearing ?? -15,
        center:  CAMPUS_VIEW.center,
        projection: 'mercator',
        style:   'mapbox://styles/mapbox/standard',
        config:  { basemap: { show3dObjects: false } },
        antialias: true,
      });
    } catch { setWebglError(true); return; }

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      mapReadyRef.current = true;
      map.setProjection('mercator');
      const curr = buildingRef.current;
      if (curr) {
        const params = getBuildingFlyTo(curr);
        console.log('[flyTo:load] building:', curr.id, '| center:', params.center);
        map.flyTo(params);
      }
    });

    mapRef.current = map;
    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null; mapReadyRef.current = false;
    };
  }, []);

  // ── ResizeObserver ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  // ── Teclado ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = e => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === 'Shift' && e.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT)
        keysRef.current.add('shiftleft');
    };
    const up = e => {
      keysRef.current.delete(e.key.toLowerCase());
      if (e.key === 'Shift') keysRef.current.delete('shiftleft');
    };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  // ── Loop de movimiento ─────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const map = mapRef.current; const keys = keysRef.current;
      if (!map || keys.size === 0) return;
      const zoom = map.getZoom(), bearing = map.getBearing(),
            pitch = map.getPitch(), center = map.getCenter();
      const sm = keys.has('shiftleft') ? 4 : 1;
      const ps = PAN_SPEED * Math.pow(0.5, zoom - 14) * sm;
      const br = (bearing * Math.PI) / 180;
      const sB = Math.sin(br), cB = Math.cos(br);
      let dLng=0, dLat=0, dB=0, dP=0;
      if (keys.has('w')||keys.has('arrowup'))    { dLng -= sB*ps; dLat += cB*ps; }
      if (keys.has('s')||keys.has('arrowdown'))  { dLng += sB*ps; dLat -= cB*ps; }
      if (keys.has('a')||keys.has('arrowleft'))  { dLng -= cB*ps; dLat -= sB*ps; }
      if (keys.has('d')||keys.has('arrowright')) { dLng += cB*ps; dLat += sB*ps; }
      if (keys.has('q')) dB -= ROTATE_SPEED*sm;
      if (keys.has('e')) dB += ROTATE_SPEED*sm;
      if (keys.has('r')) dP  = -PITCH_SPEED*sm;
      if (keys.has('f')) dP  =  PITCH_SPEED*sm;
      if (dLng||dLat) map.setCenter([center.lng+dLng, center.lat+dLat]);
      if (dB)  map.setBearing(bearing+dB);
      if (dP)  map.setPitch(Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch+dP)));
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── DRACOLoader ────────────────────────────────────────────────────────────
  useEffect(() => {
    const dl = new DRACOLoader();
    dl.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dl.preload();
    dracoLoaderRef.current = dl;
    return () => { dl.dispose(); dracoLoaderRef.current = null; };
  }, []);

  // ── Instalar layers ────────────────────────────────────────────────────────
  // Cada modelo recibe los hotspots filtrados por su propio building_id.
  // Todos los pines 3D son visibles simultáneamente en el campus.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dracoLoaderRef.current) return;

    const install = () => {
      const targetIds = new Set(allModels.map(m => `fie-model-${m.building_id}`));

      installedLayers.current.forEach((_, lid) => {
        if (!targetIds.has(lid) && map.getLayer(lid)) {
          map.removeLayer(lid);
          installedLayers.current.delete(lid);
          layerRefs.current.delete(lid);
        }
      });

      const toInstall = allModels.filter(m => {
        const lid  = `fie-model-${m.building_id}`;
        const hash = `${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`;
        const old  = installedLayers.current.get(lid);
        if (!old || old !== hash) {
          if (old && map.getLayer(lid)) { map.removeLayer(lid); installedLayers.current.delete(lid); layerRefs.current.delete(lid); }
          return true;
        }
        return false;
      });

      if (!toInstall.length) return;

      pendingLoadsRef.current += toInstall.length;
      setModelLoading(true); setModelProgress(0);

      toInstall.forEach(m => {
        const lid    = `fie-model-${m.building_id}`;
        const onDone = () => {
          pendingLoadsRef.current = Math.max(0, pendingLoadsRef.current - 1);
          if (pendingLoadsRef.current === 0) setModelLoading(false);
        };

        // Cada capa recibe exclusivamente los hotspots de su building_id.
        // Se filtra sobre la colección global sin restricción de edificio activo
        // para que todos los pines sean visibles al mismo tiempo.
        const initHotspots = allHotspotsRef.current.filter(
          h => String(h.building_id) === String(m.building_id)
        );

        const layer = createModelLayer({
          id: lid, modelUrl: m.file_path, lngLat: CAMPUS_VIEW.center,
          buildingPos: {
            x: parseFloat(m.building_offset_x) || 0,
            y: parseFloat(m.building_offset_y) || 0,
            z: parseFloat(m.building_offset_z) || 0,
          },
          modelScale: {
            sx: parseFloat(m.scale_x)  || 1, sy: parseFloat(m.scale_y)  || 1, sz: parseFloat(m.scale_z)  || 1,
            rx: parseFloat(m.rotate_x) || 0, ry: parseFloat(m.rotate_y) || 0, rz: parseFloat(m.rotate_z) || 0,
          },
          dracoLoader:     dracoLoaderRef.current,
          onProgress:      p => setModelProgress(p),
          onLoaded:        onDone,
          onError:         onDone,
          initialHotspots: initHotspots,
        });

        layerRefs.current.set(lid, layer);
        map.addLayer(layer);
        const hash = `${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`;
        installedLayers.current.set(lid, hash);
      });

      setLayersVersion(v => v + 1);
    };

    if (mapReadyRef.current) install();
    else map.once('load', install);

    return () => {
      installedLayers.current.forEach((_, lid) => {
        if (mapRef.current?.getLayer(lid)) mapRef.current.removeLayer(lid);
      });
      installedLayers.current.clear(); layerRefs.current.clear(); pendingLoadsRef.current = 0;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allModels.map(m => `${m.building_id}:${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`).join('|')]);

  // ── Sincronización global de hotspots → todas las capas ───────────────────
  // Cuando cambia allHotspots o se instalan nuevas capas, cada layer recibe
  // su partición filtrada. No existe restricción por edificio activo.
  useEffect(() => {
    layerRefs.current.forEach((layer, lid) => {
      const bid       = lid.replace('fie-model-', '');
      const bHotspots = allHotspots.filter(h => String(h.building_id) === bid);
      layer.updateHotspots(bHotspots);
    });
  }, [allHotspots, layersVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clic en mapa → hit-test ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    const onClick = e => {
      const curr = buildingRef.current;
      if (!curr) return;
      const layer = layerRefs.current.get(`fie-model-${curr.id}`);
      if (!layer) return;
      const hit = layer.hitTest(e.point.x, e.point.y);
      if (hit) { e.originalEvent?.stopPropagation(); onHotspotClickRef.current?.(hit); }
    };
    const register = () => { if (!cancelled) map.on('click', onClick); };
    if (mapReadyRef.current) register(); else map.once('load', register);
    return () => { cancelled = true; map.off('click', onClick); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── FlyTo al seleccionar edificio ─────────────────────────────────────────
  // Usa EXCLUSIVAMENTE buildingCenter(building): coordenadas GPS de la BD o
  // conversión offset→GPS con el signo correcto en Z (Z− → Norte).
  // No se promedian posiciones locales de hotspots.
  useEffect(() => {
    const map = mapRef.current;
    if (!building || !map) return;

    const fly = () => {
      const params = getBuildingFlyTo(building);
      console.log('[flyTo:select] building:', building.id, '| center:', params.center);
      map.flyTo(params);
    };

    if (mapReadyRef.current) fly();
    else map.once('load', fly);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id]);

  // ── FlyTo en campus ────────────────────────────────────────────────────────
  // Proyección de pines DOM: getScreenCenter() del layer 3D como fuente
  // primaria; fallback a buildingCenter() → map.project() como segundo plano.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !buildings.length) { setPinPositions([]); return; }

    function update() {
      setPinPositions(buildings.map(b => {
        const layer = layerRefs.current.get(`fie-model-${b.id}`);
        const sc    = layer?.getScreenCenter();
        if (sc) return { b, x: sc.x, y: sc.y };

        const lngLat = buildingCenter(b);
        const pt     = map.project(lngLat);
        return { b, x: pt.x, y: pt.y };
      }));
    }

    update();
    const EVENTS = ['move', 'zoom', 'pitch', 'bearing', 'resize', 'render'];
    EVENTS.forEach(ev => map.on(ev, update));
    return () => { EVENTS.forEach(ev => map.off(ev, update)); setPinPositions([]); };
  }, [buildings, layersVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── flyToCampus ───────────────────────────────────────────────────────────
  const flyToCampus = useCallback(() => {
    const map = mapRef.current;
    if (!map || isFlying) return;
    setIsFlying(true);
    map.flyTo({ ...CAMPUS_VIEW, duration: 1200, essential: true });
    map.once('moveend', () => setIsFlying(false));
  }, [isFlying]);

  // ── Error WebGL ────────────────────────────────────────────────────────────
  if (webglError) {
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--color-bg-soft,#f8fafc)', gap:'1rem', padding:'2rem', textAlign:'center' }}>
        <span style={{ fontSize:'3rem' }}>⚠️</span>
        <h3 style={{ margin:0, color:'var(--color-text,#111827)', fontSize:'1.15rem', fontWeight:700 }}>WebGL no disponible</h3>
        <p style={{ maxWidth:380, margin:0, color:'var(--color-text-3,#6b7280)', fontSize:'0.88rem', lineHeight:1.6 }}>
          Tu navegador no puede inicializar WebGL. Actualiza tu navegador o descarga uno compatible:
        </p>
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', justifyContent:'center' }}>
          <a href="https://www.google.com/chrome" target="_blank" rel="noreferrer" style={{ padding:'0.5rem 1.1rem', borderRadius:8, fontWeight:600, background:'#1967D2', color:'#fff', textDecoration:'none', fontSize:'0.85rem' }}>🌐 Chrome</a>
          <a href="https://www.mozilla.org/firefox" target="_blank" rel="noreferrer" style={{ padding:'0.5rem 1.1rem', borderRadius:8, fontWeight:600, background:'#FF7139', color:'#fff', textDecoration:'none', fontSize:'0.85rem' }}>🦊 Firefox</a>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <div ref={containerRef} style={{ width:'100%', height:'100%' }} />

      <style>{`
        @keyframes pinPulse {
          0%,100% { transform:scale(1);   opacity:0.6; }
          50%      { transform:scale(1.4); opacity:0.15; }
        }
      `}</style>

      {/* ── Building Pins (DOM) ─────────────────────────────────────────── */}
      {pinPositions.map(({ b, x, y }) => {
        const isSel = building && String(b.id) === String(building.id);
        return (
          <div key={b.id}
            onClick={() => onBuildingClick?.(b)}
            onTouchEnd={e => { e.preventDefault(); onBuildingClick?.(b); }}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            style={{ position:'absolute', left:x, top:y, transform:'translate(-50%,-50%)', width:40, height:40, zIndex:10, cursor:'pointer', touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}
          >
            {isSel && (
              <div style={{ position:'absolute', inset:-7, borderRadius:'50%', border:'2px solid rgba(188,6,19,0.45)', animation:'pinPulse 1.8s ease-in-out infinite', pointerEvents:'none' }} />
            )}
            <div style={{ width:40, height:40, borderRadius:'50%', background: isSel ? '#BC0613' : '#1f2937', border:`${isSel?3:2.5}px solid #fff`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow: isSel ? '0 4px 18px rgba(188,6,19,0.55)' : '0 2px 10px rgba(0,0,0,0.38)', transition:'background .2s,box-shadow .2s', pointerEvents:'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
              </svg>
            </div>
          </div>
        );
      })}

      {showOverlay && (
        <ControlsOverlay isMobile={isMobile} onDismiss={() => { setShowOverlay(false); sessionStorage.setItem('fie-overlay-dismissed','1'); }} />
      )}

      {building && (
        <button onClick={flyToCampus} disabled={isFlying}
          title={isFlying ? 'Animando…' : 'Cámara Inicial'}
          aria-label="Volver a vista inicial del campus"
          style={{ position:'absolute', top:12, right:12, zIndex:20, width:36, height:36, background: isFlying ? 'var(--color-bg-soft)' : 'var(--color-bg)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor: isFlying ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--shadow-sm)', color: isFlying ? 'var(--color-text-4)' : 'var(--color-text-2)', opacity: isFlying ? 0.6 : 1, transition:'all var(--transition)' }}
          onMouseEnter={e => { if (!isFlying) e.currentTarget.style.background='var(--color-bg-soft)'; }}
          onMouseLeave={e => { if (!isFlying) e.currentTarget.style.background='var(--color-bg)'; }}
        >
          {isFlying
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
          }
        </button>
      )}

      <ViewerControls isMobile={isMobile} />
      <MiniMap mainMap={mapRef.current} isMobile={isMobile} />

      {building ? (
        <div style={{ position:'absolute', bottom:48, left:'50%', transform:'translateX(-50%)', zIndex:20, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(8px)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', padding:'0.4rem 1rem', display:'flex', alignItems:'center', gap:8, boxShadow:'var(--shadow-md)', fontSize:'0.75rem', fontWeight:700, color:'var(--color-text)', whiteSpace:'nowrap' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--color-primary)', flexShrink:0 }}/>
          {building.name}
          {allModels.some(m => m.building_id === building.id)
            ? <span style={{ color:'var(--color-success)', fontWeight:400, fontSize:'0.68rem' }}>· modelo 3D</span>
            : <span style={{ color:'var(--color-warning)', fontWeight:400, fontSize:'0.68rem' }}>· demo</span>
          }
        </div>
      ) : (
        <div style={{ position:'absolute', bottom:48, left:'50%', transform:'translateX(-50%)', zIndex:20, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(8px)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', padding:'0.5rem 1.2rem', color:'var(--color-text-3)', fontSize:'0.78rem', boxShadow:'var(--shadow-sm)', whiteSpace:'nowrap' }}>
          Selecciona un edificio en el panel
        </div>
      )}
    </div>
  );
}