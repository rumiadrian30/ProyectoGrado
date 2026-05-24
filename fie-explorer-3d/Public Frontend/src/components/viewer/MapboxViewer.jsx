/**
 * MapboxViewer.jsx — VERSIÓN CORREGIDA
 *
 * CORRECCIÓN PRINCIPAL: Hotspot pins
 * ───────────────────────────────────
 * Los pines SVG de hotspots se posicionan con map.project() sobre las
 * coordenadas GPS calculadas como:
 *
 *   world_x = building_offset_x + hotspot.pos_x - pivot.cx
 *   world_z = building_offset_z + hotspot.pos_z - pivot.cz
 *   lngLat  = buildingOffsetToGPS(world_x, world_z)
 *
 * pivot.cx/cz se obtienen del centrado automático del GLB en createModelLayer.
 * Son 0 si el modelo ya tiene el origen en su centroide geométrico.
 *
 * ANTI-PATRÓN CORREGIDO: No se usa building.offset_x + hotspot.building_offset_x
 * (doble conteo). Se usa UNA SOLA FUENTE: hotspot.building_offset_x del JOIN
 * (que es idéntico a building.offset_x pero viene ya pre-parseado del backend).
 *
 * Navegación teclado: W/A/S/D o flechas → mover cámara
 *                     Q/E               → rotar bearing
 *                     R/F               → subir/bajar pitch
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useViewerStore } from '../../store/viewerStore';
import {
  buildingOffsetToGPS,
  hotspotToGPS,
  computeModelPivotShift,
  CAMPUS_VIEW,
  computeBuildingFlyTo,
} from '../../utils/buildingCoords';
import ControlsOverlay from './ControlsOverlay';
import MiniMap         from './MiniMap';
import ViewerControls  from './ViewerControls';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const LAYER_ID = 'fie-model-layer';

const PAN_SPEED    = 0.0002;
const ROTATE_SPEED = 1.5;
const PITCH_SPEED  = 1.0;
const PITCH_MIN    = 0;
const PITCH_MAX    = 85;

// ── Paleta de colores por tipo de hotspot ────────────────────────────────────
const TYPE_COLORS = {
  classroom: '#2563eb',
  lab:       '#7c3aed',
  office:    '#0891b2',
  service:   '#059669',
  access:    '#d97706',
};

// ── Icono SVG inline por tipo (21×21 px, stroke="currentColor") ───────────────
const TYPE_ICONS = {
  classroom: '<path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>',
  lab:       '<path d="M9 3h6m-3 0v5.5L16.5 17H7.5L12 8.5V3"/><path d="M6.5 17.5h11"/>',
  office:    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7M7 16h4"/>',
  service:   '<circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>',
  access:    '<path d="M13 4h6v16h-6"/><path d="M8 16l-4-4 4-4M4 12h10"/>',
};

// ─────────────────────────────────────────────────────────────────────────────
// createModelLayer
// ─────────────────────────────────────────────────────────────────────────────
function createModelLayer({
  id, modelUrl, lngLat, buildingPos, modelScale,
  dracoLoader, onProgress, onLoaded, onError,
  onPivotComputed,   // ← NUEVO: callback({ cx, cz }) al cargar el modelo
}) {
  const state = { scene: null, camera: null, renderer: null, map: null, loaded: false, lngLat };

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

      state.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(), context: gl, antialias: true,
      });
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

            // ── Calcular bbox ANTES de aplicar building offset ──────────────
            const box    = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());

            // ── NOTIFICAR el pivot shift antes de centrar ───────────────────
            // pivot = { cx: center.x, cz: center.z }
            // El viewer usará esto para corregir las coordenadas de hotspots
            // cuando pos_x/z son relativos al origen GLB (no al centroide).
            onPivotComputed?.(computeModelPivotShift(box));

            // ── Centrar el modelo + aplicar offset del building ─────────────
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;
            model.position.x += bx;
            model.position.y += by;
            model.position.z += bz;

            // Floor-clip: garantizar que el modelo no traspase el suelo
            const floorBox = new THREE.Box3().setFromObject(model);
            if (floorBox.min.y < 0) model.position.y -= floorBox.min.y;

            model.traverse(c => {
              if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
            });

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
        // Pivot del demo model es { cx: 0, cz: 0 } (cubo centrado en origen)
        onPivotComputed?.({ cx: 0, cz: 0 });
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
  mesh.position.set(bx, by + 6, bz);
  mesh.castShadow = true;
  scene.add(mesh);
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true }),
  );
  line.position.copy(mesh.position);
  scene.add(line);
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function MapboxViewer({
  allModels = [], buildings = [], building, hotspots = [],
  onBuildingClick, onHotspotClick, isMobile,
}) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const mapReadyRef     = useRef(false);
  const keysRef         = useRef(new Set());
  const rafRef          = useRef(null);
  const dracoLoaderRef  = useRef(null);
  const installedLayers = useRef(new Map());
  const pendingLoadsRef = useRef(0);
  const buildingRef     = useRef(building);

  const allModelsRef = useRef(allModels);
  const hotspotsRef  = useRef(hotspots);

  // ── NUEVO: almacena el pivot shift por building_id ─────────────────────────
  // pivot = { cx, cz } = centroide bbox del GLB antes de centrar.
  // Se usa para corregir las coordenadas GPS de hotspot pins.
  const modelPivotsRef = useRef(new Map()); // Map<string, { cx, cz }>

  // NUEVO: versión para forzar re-render de hotspot pins al recibir el pivot
  const [pivotVersion, setPivotVersion] = useState(0);

  const { setModelLoading, setModelProgress } = useViewerStore();

  const [webglError,       setWebglError]       = useState(false);
  const [pinPositions,     setPinPositions]      = useState([]);  // building pins
  const [hotspotPinPos,    setHotspotPinPos]     = useState([]);  // hotspot pins ← NUEVO
  const [isFlying,         setIsFlying]          = useState(false);
  const [showOverlay,      setShowOverlay]        = useState(
    () => sessionStorage.getItem('fie-overlay-dismissed') !== '1'
  );

  useEffect(() => { allModelsRef.current = allModels; }, [allModels]);
  useEffect(() => { hotspotsRef.current  = hotspots;  }, [hotspots]);
  useEffect(() => { buildingRef.current  = building;  }, [building]);

  // ── Inicializar mapa ───────────────────────────────────────────────────────
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
        style: 'mapbox://styles/mapbox/standard',
        config: { basemap: { show3dObjects: false } },
        antialias: true,
      });
    } catch { setWebglError(true); return; }

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      mapReadyRef.current = true;
      map.setProjection('mercator');
      if (buildingRef.current) {
        const params = computeBuildingFlyTo(buildingRef.current, allModelsRef.current, hotspotsRef.current);
        if (params) map.flyTo({ ...params, speed: 0.85, curve: 1.4, essential: true });
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

  // ── ResizeObserver ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ro = new ResizeObserver(() => { mapRef.current?.resize(); });
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  // ── Teclado: registrar teclas ──────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === 'Shift' && e.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT)
        keysRef.current.add('shiftleft');
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

  // ── Teclado: loop de movimiento ────────────────────────────────────────────
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

      const speedMult  = keys.has('shiftleft') ? 4 : 1;
      const panSpeed   = PAN_SPEED * Math.pow(0.5, zoom - 14) * speedMult;
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

  // ── DRACOLoader compartido ─────────────────────────────────────────────────
  useEffect(() => {
    const dl = new DRACOLoader();
    dl.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dl.preload();
    dracoLoaderRef.current = dl;
    return () => { dl.dispose(); dracoLoaderRef.current = null; };
  }, []);

  // ── Instalar layers de modelos ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dracoLoaderRef.current) return;

    const install = () => {
      const targetIds = new Set(allModels.map(m => `fie-model-${m.building_id}`));

      installedLayers.current.forEach((oldHash, layerId) => {
        if (!targetIds.has(layerId) && map.getLayer(layerId)) {
          map.removeLayer(layerId);
          installedLayers.current.delete(layerId);
        }
      });

      const modelsToInstall = allModels.filter(m => {
        const layerId = `fie-model-${m.building_id}`;
        const newHash = `${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`;
        const oldHash = installedLayers.current.get(layerId);
        if (!oldHash || oldHash !== newHash) {
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

        const onDone = () => {
          pendingLoadsRef.current = Math.max(0, pendingLoadsRef.current - 1);
          if (pendingLoadsRef.current === 0) setModelLoading(false);
        };

        map.addLayer(createModelLayer({
          id:          layerId,
          modelUrl:    m.file_path,
          lngLat:      CAMPUS_VIEW.center,
          buildingPos: {
            x: parseFloat(m.building_offset_x) || 0,
            y: parseFloat(m.building_offset_y) || 0,
            z: parseFloat(m.building_offset_z) || 0,
          },
          modelScale: {
            sx: parseFloat(m.scale_x)  || 1,
            sy: parseFloat(m.scale_y)  || 1,
            sz: parseFloat(m.scale_z)  || 1,
            rx: parseFloat(m.rotate_x) || 0,
            ry: parseFloat(m.rotate_y) || 0,
            rz: parseFloat(m.rotate_z) || 0,
          },
          dracoLoader: dracoLoaderRef.current,
          onProgress:  (p) => setModelProgress(p),
          onLoaded:    onDone,
          onError:     onDone,

          // ── NUEVO: recibe el pivot shift del GLB y activa re-render de hotspot pins
          onPivotComputed: (pivot) => {
            modelPivotsRef.current.set(String(m.building_id), pivot);
            // Incrementa versión → dispara re-cálculo de hotspot pins en el effect de abajo
            setPivotVersion(v => v + 1);
          },
        }));

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allModels.map(m =>
    `${m.building_id}:${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`
  ).join('|')]);

  // ── Volar al edificio seleccionado ─────────────────────────────────────────
  useEffect(() => {
    if (!building || !mapReadyRef.current) return;
    const params = computeBuildingFlyTo(building, allModelsRef.current, hotspotsRef.current);
    if (!params) return;
    mapRef.current?.flyTo({ ...params, speed: 0.85, curve: 1.4, essential: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id]);

  // ── Refinamiento de cámara cuando cargan hotspots (sin modelo) ────────────
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

  // ── Building pins — map.project() ─────────────────────────────────────────
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

  // ── Hotspot pins — CORRECCIÓN DEL OFFSET ──────────────────────────────────
  //
  // REGLA ÚNICA de posicionamiento (una sola fuente de verdad):
  //
  //   GPS = hotspotToGPS(
  //           building_offset_x,   ← del JOIN en hotspot (h.building_offset_x)
  //           building_offset_z,   ← del JOIN en hotspot (h.building_offset_z)
  //           h.pos_x,             ← local al edificio
  //           h.pos_z,             ← local al edificio
  //           pivot,               ← corrección de pivote del GLB (default {0,0})
  //         )
  //
  // NO SE SUMA building.offset_x AQUÍ — ese valor ya está en h.building_offset_x.
  // Sumarlo de nuevo es el bug original (doble conteo).
  //
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !building || !hotspots.length) { setHotspotPinPos([]); return; }

    function updateHotspotPins() {
      // Pivot del GLB del edificio activo (0,0 si no hay modelo o aún no cargó)
      const pivot = modelPivotsRef.current.get(String(building.id)) ?? { cx: 0, cz: 0 };

      setHotspotPinPos(
        hotspots
          .filter(h => h.is_active !== false)
          .map(h => {
            // ── FUENTE ÚNICA de building offset ──────────────────────────────
            // h.building_offset_x/z vienen del JOIN en hotspotController.js.
            // Son idénticos a building.offset_x/z.
            // Usamos h.building_offset_x para no depender del prop `building`
            // y evitar cualquier posibilidad de doble conteo.
            const bx = parseFloat(h.building_offset_x ?? building.offset_x) || 0;
            const bz = parseFloat(h.building_offset_z ?? building.offset_z) || 0;
            const px = parseFloat(h.pos_x) || 0;
            const pz = parseFloat(h.pos_z) || 0;

            // hotspotToGPS: building_offset + local_pos - pivot_shift
            const lngLat = hotspotToGPS(bx, bz, px, pz, pivot);
            const pt = map.project(lngLat);
            return { h, x: pt.x, y: pt.y };
          })
      );
    }

    updateHotspotPins();
    const EVENTS = ['move', 'zoom', 'pitch', 'bearing', 'resize'];
    EVENTS.forEach(e => map.on(e, updateHotspotPins));
    return () => {
      EVENTS.forEach(e => map.off(e, updateHotspotPins));
      setHotspotPinPos([]);
    };
  // pivotVersion se añade para re-ejecutar cuando el modelo carga y el pivot es conocido
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspots, building?.id, pivotVersion]);

  // ── flyToCampus ───────────────────────────────────────────────────────────
  const flyToCampus = useCallback(() => {
    const map = mapRef.current;
    if (!map || isFlying) return;
    setIsFlying(true);
    map.flyTo({ ...CAMPUS_VIEW, duration: 1200, essential: true });
    map.once('moveend', () => setIsFlying(false));
  }, [isFlying]);

  // ── WebGL error ────────────────────────────────────────────────────────────
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

      {/* ── Keyframes ───────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pinPulse {
          0%,100% { transform: scale(1);   opacity: 0.6; }
          50%      { transform: scale(1.4); opacity: 0.15; }
        }
        @keyframes hotspotPop {
          0%   { transform: translate(-50%,-100%) scale(0.6); opacity: 0; }
          70%  { transform: translate(-50%,-100%) scale(1.08); opacity: 1; }
          100% { transform: translate(-50%,-100%) scale(1); }
        }
      `}</style>

      {/* ── Building Pins ───────────────────────────────────────────────── */}
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
              position: 'absolute', left: x, top: y,
              transform: 'translate(-50%, -50%)',
              width: 40, height: 40,
              zIndex: 10, cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isSelected && (
              <div style={{
                position: 'absolute', inset: -7, borderRadius: '50%',
                border: '2px solid rgba(188,6,19,0.45)',
                animation: 'pinPulse 1.8s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
            )}
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: isSelected ? '#BC0613' : '#1f2937',
              border: `${isSelected ? 3 : 2.5}px solid #ffffff`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isSelected ? '0 4px 18px rgba(188,6,19,0.55)' : '0 2px 10px rgba(0,0,0,0.38)',
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
              pointerEvents: 'none',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
              </svg>
            </div>
          </div>
        );
      })}

      {/* ── Hotspot Pins ────────────────────────────────────────────────────
          Posición calculada correctamente como:
            GPS = hotspotToGPS(building_offset_x, building_offset_z, pos_x, pos_z, pivot)
          NO se usa building.offset_x aquí para evitar el doble conteo.
         ─────────────────────────────────────────────────────────────────── */}
      {hotspotPinPos.map(({ h, x, y }) => {
        const isActive  = false; // el estado activo se maneja en el store
        const pinColor  = TYPE_COLORS[h.type] ?? '#6b7280';
        const icon      = TYPE_ICONS[h.type]  ?? TYPE_ICONS.service;
        return (
          <div
            key={h.id}
            onClick={() => onHotspotClick?.(h)}
            onTouchEnd={e => { e.preventDefault(); onHotspotClick?.(h); }}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            title={`${h.name} — Piso ${h.floor}`}
            style={{
              position: 'absolute', left: x, top: y,
              // Offset vertical: el puntero del pin apunta al punto exacto
              transform: 'translate(-50%, -100%)',
              zIndex: 11, cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              animation: 'hotspotPop 0.25s ease-out both',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              pointerEvents: 'auto',
            }}
          >
            {/* Etiqueta de nombre (visible en hover via CSS en :hover) */}
            <HotspotLabel name={h.name} floor={h.floor} color={pinColor} />

            {/* Cuerpo del pin */}
            <div style={{
              width: 32, height: 32,
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              background: pinColor,
              border: '2px solid #fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg
                width="14" height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: 'rotate(45deg)' }}   // contrarrota el rotate(-45deg) del padre
                dangerouslySetInnerHTML={{ __html: icon }}
              />
            </div>
          </div>
        );
      })}

      {/* ── Overlay de instrucciones ──────────────────────────────────── */}
      {showOverlay && (
        <ControlsOverlay
          isMobile={isMobile}
          onDismiss={() => {
            setShowOverlay(false);
            sessionStorage.setItem('fie-overlay-dismissed', '1');
          }}
        />
      )}

      {/* Botón Cámara Inicial */}
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

      <ViewerControls isMobile={isMobile} />
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

// ── HotspotLabel — etiqueta flotante sobre el pin ─────────────────────────────
// Se muestra sólo en hover usando state local (no CSS :hover para compatibilidad SSR).
function HotspotLabel({ name, floor, color }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ position: 'relative', height: 0, width: '100%', display: 'flex', justifyContent: 'center' }}
    >
      {visible && (
        <div style={{
          position: 'absolute', bottom: 4,
          background: 'rgba(15,23,42,0.9)',
          color: '#fff', fontSize: '0.68rem', fontWeight: 600,
          padding: '3px 7px', borderRadius: 4,
          whiteSpace: 'nowrap', pointerEvents: 'none',
          borderLeft: `3px solid ${color}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          fontFamily: 'var(--font-body, system-ui)',
        }}>
          {name}
          <span style={{ opacity: 0.65, fontWeight: 400, marginLeft: 4 }}>P{floor}</span>
        </div>
      )}
    </div>
  );
}