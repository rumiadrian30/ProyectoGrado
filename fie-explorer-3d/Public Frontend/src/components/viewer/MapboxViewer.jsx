/**
 * MapboxViewer.jsx
 *
 * Visor integrado: Mapbox GL JS Standard + Three.js custom layer.
 *
 * CORRECCIONES HU-04:
 *   · Interactividad táctil: marcadores responden a touchend (iOS/Android).
 *   · Herencia de coordenadas: cada marcador se posiciona como
 *       GPS = buildingOffsetToGPS(building.offset_x + hs.pos_x,
 *                                  building.offset_z + hs.pos_z)
 *     en lugar del patrón circular que ignoraba pos_x/pos_z.
 *   · Si todos los hotspots tienen pos_x/pos_z = 0 (sin coordenadas
 *     configuradas) se usa un desplazamiento mínimo para evitar
 *     que los marcadores se apilen exactamente.
 *
 * Navegación: W/A/S/D o flechas → mover cámara
 *             Q/E               → rotar bearing
 *             R/F               → subir/bajar pitch
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useViewerStore } from '../../store/viewerStore';
import {
  buildingOffsetToGPS,
  CAMPUS_VIEW,
  computeBuildingFlyTo,
} from '../../utils/buildingCoords';
import ControlsOverlay from './ControlsOverlay';
import ViewerControls  from './ViewerControls';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const LAYER_ID = 'fie-model-layer';

// ─── Velocidad de movimiento de teclado ───────────────────────────────────────
const PAN_SPEED    = 0.0002;
const ROTATE_SPEED = 1.5;
const PITCH_SPEED  = 1.0;
const PITCH_MIN    = 0;
const PITCH_MAX    = 85;

// ─── Colores e iconos SVG por tipo (sin emojis, paleta corporativa) ───────────
const TYPE_COLORS = {
  classroom: '#6d28d9',
  lab:       '#BC0613',
  office:    '#2563eb',
  service:   '#16a34a',
  access:    '#d97706',
};

/**
 * Genera un SVG compacto como inner HTML del marcador DOM.
 * Cada tipo tiene su propio path reconocible; el fondo usa el color corporativo.
 */
function markerSVG(type, color) {
  const icons = {
    classroom: '<path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    lab:       '<path d="M9 3h6m-3 0v6l4 8H8L4 9V3m0 6h12" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    office:    '<rect x="4" y="4" width="16" height="16" rx="2" stroke="#fff" stroke-width="1.8" fill="none"/><path d="M8 9h8M8 13h5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none"/>',
    service:   '<circle cx="12" cy="12" r="3" stroke="#fff" stroke-width="1.8" fill="none"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" stroke="#fff" stroke-width="1.8" fill="none"/>',
    access:    '<path d="M13 4h6v16h-6M8 16l-4-4 4-4m-4 4h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  };
  const path = icons[type] || icons.service;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         style="pointer-events:none;display:block">
      ${path}
    </svg>`;
}

// ─── Custom Three.js layer ────────────────────────────────────────────────────
function createModelLayer({
  id, modelUrl, lngLat, buildingPos, modelScale,
  dracoLoader, onProgress, onLoaded, onError,
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
            const box    = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= box.min.y;
            model.position.x += bx;
            model.position.y += by;
            model.position.z += bz;
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
          (xhr) => {
            if (xhr.total) onProgress?.(Math.round((xhr.loaded / xhr.total) * 100));
          },
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
      const rotX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0), Math.PI / 2
      );
      const mc = mapboxgl.MercatorCoordinate.fromLngLat(state.lngLat, 0);
      const s  = mc.meterInMercatorCoordinateUnits();
      const modelMatrix = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .scale(new THREE.Vector3(s, -s, s))
        .multiply(rotX);
      state.camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(matrix)
        .multiply(modelMatrix);
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
  const mat  = new THREE.MeshStandardMaterial({
    color: 0xBC0613, roughness: 0.5, metalness: 0.1,
  });
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

// ─── Componente ───────────────────────────────────────────────────────────────
export default function MapboxViewer({
  allModels = [], building, hotspots = [], onHotspotClick, isMobile,
}) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const markersRef      = useRef([]);
  const mapReadyRef     = useRef(false);
  const keysRef         = useRef(new Set());
  const rafRef          = useRef(null);
  const dracoLoaderRef  = useRef(null);
  const installedLayers = useRef(new Map());
  const pendingLoadsRef = useRef(0);
  const buildingRef     = useRef(building);

  const allModelsRef = useRef(allModels);
  const hotspotsRef  = useRef(hotspots);

  const { setModelLoading, setModelProgress } = useViewerStore();

  const [webglError,  setWebglError]  = useState(false);
  const [showOverlay, setShowOverlay] = useState(
    () => sessionStorage.getItem('fie-overlay-dismissed') !== '1'
  );

  useEffect(() => { allModelsRef.current = allModels; }, [allModels]);
  useEffect(() => { hotspotsRef.current  = hotspots;  }, [hotspots]);
  useEffect(() => { buildingRef.current  = building;  }, [building]);

  // ─── Inicializar mapa ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    if (!mapboxgl.supported()) { setWebglError(true); return; }

    let map;
    try {
      map = new mapboxgl.Map({
        container:         containerRef.current,
        attributionControl: false,
        zoom:      CAMPUS_VIEW.zoom,
        pitch:     CAMPUS_VIEW.pitch,
        bearing:   CAMPUS_VIEW.bearing ?? -15,
        center:    CAMPUS_VIEW.center,
        projection: 'mercator',
        style:     'mapbox://styles/mapbox/standard',
        config:    { basemap: { show3dObjects: false } },
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
          buildingRef.current, allModelsRef.current, hotspotsRef.current,
        );
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

  // ─── Teclado: loop de movimiento ───────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const map  = mapRef.current;
      const keys = keysRef.current;
      if (!map || keys.size === 0) return;

      const zoom      = map.getZoom();
      const bearing   = map.getBearing();
      const pitch     = map.getPitch();
      const center    = map.getCenter();
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

      if (dLng !== 0 || dLat !== 0)
        map.setCenter([center.lng + dLng, center.lat + dLat]);
      if (dBearing !== 0) map.setBearing(bearing + dBearing);
      if (dPitch   !== 0)
        map.setPitch(Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch + dPitch)));
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ─── DRACOLoader compartido ────────────────────────────────────────────────
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
        const onDone  = () => {
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
        }));

        installedLayers.current.set(
          layerId,
          `${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`,
        );
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

  // ─── Volar al edificio seleccionado ───────────────────────────────────────
  useEffect(() => {
    if (!building || !mapReadyRef.current) return;
    const params = computeBuildingFlyTo(
      building, allModelsRef.current, hotspotsRef.current,
    );
    if (!params) return;
    mapRef.current?.flyTo({ ...params, speed: 0.85, curve: 1.4, essential: true });
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

  // ─────────────────────────────────────────────────────────────────────────
  // CORRECCIÓN HU-04 — Marcadores de hotspots
  //
  // Problema anterior:
  //   Los marcadores se colocaban en un patrón circular (angle + r) que
  //   ignoraba completamente pos_x / pos_z, por lo que nunca reflejaban
  //   la posición real del hotspot en el modelo 3D.
  //
  // Solución:
  //   1. Cada marcador hereda las coordenadas del edificio padre
  //      (building.offset_x / offset_z) y suma las del hotspot (pos_x / pos_z).
  //      GPS = buildingOffsetToGPS(building_offset_x + hs.pos_x,
  //                                 building_offset_z + hs.pos_z)
  //   2. Si el hotspot no tiene coordenadas 3D configuradas (pos_x/z ≈ 0),
  //      se aplica un desplazamiento mínimo en abanico para que los
  //      marcadores no se sobrepongan en el centro del edificio.
  //   3. Los eventos click Y touchend disparan onHotspotClick para
  //      garantizar respuesta en dispositivos táctiles (iOS / Android).
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Limpiar marcadores anteriores
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!building || !hotspots.length) return;

    const buildingOffsetX = parseFloat(building.offset_x) || 0;
    const buildingOffsetZ = parseFloat(building.offset_z) || 0;

    // Detectar si algún hotspot tiene posición 3D real configurada
    const anyHasMeaningfulPos = hotspots.some(
      h => Math.abs(parseFloat(h.pos_x) || 0) > 0.5 ||
           Math.abs(parseFloat(h.pos_z) || 0) > 0.5
    );

    hotspots.forEach((hs, i) => {
      const color = TYPE_COLORS[hs.type] || '#BC0613';
      let lngLat;

      const hsX = parseFloat(hs.pos_x) || 0;
      const hsZ = parseFloat(hs.pos_z) || 0;

      if (anyHasMeaningfulPos && (Math.abs(hsX) > 0.5 || Math.abs(hsZ) > 0.5)) {
        // ── CASO A: Hotspot con coordenadas 3D reales ────────────────────────
        // GPS = ancla del campus + offset del edificio + posición local del hotspot
        lngLat = buildingOffsetToGPS(buildingOffsetX + hsX, buildingOffsetZ + hsZ);
      } else {
        // ── CASO B: Sin coordenadas 3D (pos_x/z = 0) ────────────────────────
        // Distribuir en abanico alrededor del centro del edificio para
        // evitar que todos los marcadores se solapen en el mismo punto.
        const FALLBACK_RADIUS = 0.000035; // ~3.5 m en grados
        const angle = (i / Math.max(hotspots.length, 1)) * Math.PI * 2;
        const baseGPS = buildingOffsetToGPS(buildingOffsetX, buildingOffsetZ);
        lngLat = [
          baseGPS[0] + Math.cos(angle) * FALLBACK_RADIUS,
          baseGPS[1] + Math.sin(angle) * FALLBACK_RADIUS * 0.85,
        ];
      }

      // ── Estructura de dos capas ──────────────────────────────────────────
      //
      // RAÍZ DEL BUG: Mapbox GL posiciona cada marcador escribiendo
      // `transform: translate(Xpx, Ypx)` sobre el elemento raíz (el).
      // Si en mouseenter hacemos `el.style.transform = 'scale(1.3)'`
      // sobreescribimos ese translate y el pin salta a (0, 0).
      // En el siguiente frame de render Mapbox restaura el translate
      // correcto → el marcador "vuelve" solo al hacer zoom o pan.
      //
      // SOLUCIÓN: dos capas de DOM.
      //   · el  (capa externa) → Mapbox escribe transform aquí. NUNCA tocar.
      //   · pin (capa interna) → todos los estilos visuales y el scale
      //                          de hover van aquí, sin afectar al padre.
      //
      //   el (wrapper transparente, tamaño igual al pin)
      //   └── pin (círculo visible: color, borde, sombra, ícono SVG)

      // Capa externa: contenedor neutro que Mapbox posiciona
      const el = document.createElement('div');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', hs.name);
      el.style.cssText = [
        'width:32px',
        'height:32px',
        'cursor:pointer',
        '-webkit-tap-highlight-color:transparent',
        'touch-action:manipulation',
        // Sin background, border-radius, box-shadow ni transform:
        // todos los estilos visuales van en el pin interno.
      ].join(';');

      // Capa interna: todo lo visual, animable sin romper el posicionamiento
      const pin = document.createElement('div');
      pin.style.cssText = [
        'width:32px',
        'height:32px',
        `background:${color}`,
        'border:2.5px solid #ffffff',
        'border-radius:50%',
        'box-shadow:0 2px 10px rgba(0,0,0,0.35)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'transition:transform 0.15s ease, box-shadow 0.15s ease',
        'pointer-events:none', // los eventos los captura el padre (el)
      ].join(';');
      pin.innerHTML = markerSVG(hs.type, color);
      el.appendChild(pin);

      // ── Bloquear propagación hacia el canvas de Mapbox ──────────────────
      ['mousedown', 'mousemove', 'pointerdown', 'pointermove',
       'wheel', 'dblclick'].forEach(evtType => {
        el.addEventListener(evtType, (e) => { e.stopPropagation(); });
      });
      el.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      }, { passive: true });

      // ── Hover visual: animar el PIN, nunca el EL ─────────────────────────
      // transform en pin no afecta a la matriz que Mapbox calcula para el.
      el.addEventListener('mouseenter', () => {
        pin.style.transform = 'scale(1.3)';
        pin.style.boxShadow = '0 4px 16px rgba(0,0,0,0.45)';
      });
      el.addEventListener('mouseleave', () => {
        pin.style.transform = 'scale(1)';
        pin.style.boxShadow = '0 2px 10px rgba(0,0,0,0.35)';
      });

      // ── Click (escritorio) ───────────────────────────────────────────────
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onHotspotClick?.(hs);
      });

      // ── Touch (móvil / tablet) ───────────────────────────────────────────
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onHotspotClick?.(hs);
      }, { passive: false });

      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(lngLat)
          .addTo(map),
      );
    });
  }, [hotspots, building, onHotspotClick]);

  // ─── Volver al campus ─────────────────────────────────────────────────────
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
        background: 'var(--color-bg-soft)',
        gap: '1rem', padding: '2rem', textAlign: 'center',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-warning)" strokeWidth="1.5">
          <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        </svg>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', margin: 0 }}>
          WebGL no disponible
        </h3>
        <p style={{
          maxWidth: 380, margin: 0,
          color: 'var(--color-text-3)', fontSize: '0.88rem', lineHeight: 1.6,
        }}>
          Tu navegador o dispositivo no puede inicializar WebGL, tecnología necesaria
          para el visor 3D. Actualiza tu navegador o descarga uno compatible.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="https://www.google.com/chrome" target="_blank" rel="noreferrer"
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 600,
              background: '#1967D2', color: '#fff',
              textDecoration: 'none', fontSize: '0.85rem',
            }}>
            Descargar Chrome
          </a>
          <a href="https://www.mozilla.org/firefox" target="_blank" rel="noreferrer"
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 600,
              background: '#FF7139', color: '#fff',
              textDecoration: 'none', fontSize: '0.85rem',
            }}>
            Descargar Firefox
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* El contenedor del mapa necesita pointer-events activos para recibir
          clicks del usuario; nunca debe bloquearse con overlay opaco superior */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      />

      {showOverlay && (
        <ControlsOverlay
          isMobile={isMobile}
          onDismiss={() => {
            setShowOverlay(false);
            sessionStorage.setItem('fie-overlay-dismissed', '1');
          }}
        />
      )}

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

      <ViewerControls isMobile={isMobile} />

      {/* Badge estado edificio */}
      {building && (
        <div style={{
          position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
          padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: 'var(--shadow-md)', fontSize: '0.75rem', fontWeight: 700,
          color: 'var(--color-text)', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--color-primary)', flexShrink: 0,
          }}/>
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
          pointerEvents: 'none',
        }}>
          Selecciona un edificio en el panel izquierdo
        </div>
      )}
    </div>
  );
}