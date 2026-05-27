/**
 * MapboxViewer.jsx — VERSIÓN CON RAYCASTING 3D
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { useViewerStore } from '../../store/viewerStore';
import { CAMPUS_VIEW }    from '../../utils/buildingCoords';
import {
  storeEmissiveState,
  buildRayFromMouse,
  applyHoverToMesh,
  clearHoverFromMesh,
  applyHoverToGroup,
  clearHoverFromGroup,
} from '../../utils/mapboxRaycaster';
import ControlsOverlay from './ControlsOverlay';
import MiniMap         from './MiniMap';
import ViewerControls  from './ViewerControls';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const PAN_SPEED    = 0.0002;
const ROTATE_SPEED = 1.5;
const PITCH_SPEED  = 1.0;
const PITCH_MIN    = 0;
const PITCH_MAX    = 85;

const DEG_PER_METER_LAT = 1 / 111_320;
const DEG_PER_METER_LNG =
  1 / (111_320 * Math.cos((CAMPUS_VIEW.center[1] * Math.PI) / 180));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de coordenadas y cámara
// ─────────────────────────────────────────────────────────────────────────────

function buildingCenter(b) {
  if (!b) return [...CAMPUS_VIEW.center];
  const ox = parseFloat(b.offset_x) || 0;
  const oz = parseFloat(b.offset_z) || 0;
  return [
    CAMPUS_VIEW.center[0] + (ox * DEG_PER_METER_LNG),
    CAMPUS_VIEW.center[1] - (oz * DEG_PER_METER_LAT),
  ];
}

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

// ─────────────────────────────────────────────────────────────────────────────
// addDemoModel — modelo de caja para edificios sin GLB
// ─────────────────────────────────────────────────────────────────────────────

function addDemoModel(group) {
  const geo  = new THREE.BoxGeometry(10, 12, 8);
  const mat  = new THREE.MeshStandardMaterial({
    color: 0xBC0613, roughness: 0.5, metalness: 0.1,
    emissive: new THREE.Color(0x000000), emissiveIntensity: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name        = 'demo_building';
  mesh.position.y  = 6;
  mesh.castShadow  = true;
  group.add(mesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true }),
  );
  edges.position.copy(mesh.position);
  group.add(edges);
}

// ─────────────────────────────────────────────────────────────────────────────
// createModelLayer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea y devuelve un custom layer de Mapbox que renderiza un GLB con Three.js.
 *
 * @param {object}  opts
 * @param {string}  opts.id               ID único de la capa
 * @param {string}  opts.modelUrl         URL del archivo .glb
 * @param {object}  opts.lngLat           { lng, lat } o [lng, lat] del ancla GPS
 * @param {object}  opts.buildingPos      { x, y, z } offset métrico del edificio
 * @param {object}  opts.modelScale       { sx, sy, sz, rx, ry, rz }
 * @param {object}  opts.dracoLoader      Instancia de DRACOLoader compartida
 * @param {boolean} opts.isDetailed       true = FIE: hover/click por sub-malla
 *                                        false = genérico: hover/click por bloque
 * @param {Function} opts.onProgress      (percent: number) => void
 * @param {Function} opts.onLoaded        () => void
 * @param {Function} opts.onError         () => void
 */
function createModelLayer({
  id, modelUrl, lngLat, buildingPos, modelScale,
  dracoLoader, isDetailed = false,
  onProgress, onLoaded, onError,
}) {
  // ── Estado interno de la capa ──────────────────────────────────────────────
  const state = {
    scene:         null,
    camera:        null,
    renderer:      null,
    map:           null,
    loaded:        false,
    lngLat,
    buildingGroup: null,
    isDetailed,

    // Matrices necesarias para el raycasting
    lastMatrix:  null,   // array[16] del arg `matrix` de render()
    modelMatrix: null,   // THREE.Matrix4 del ancla Mercator

    // Estado del hover
    hoveredMesh:    null,   // Mesh actualmente brillando (modo detailed)
    isGroupHovered: false,  // true si el grupo completo está brillando (genérico)
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

  // ── MVP helper ────────────────────────────────────────────────────────────
  /**
   * Reconstruye la MVP = mapMatrix × modelMatrix.
   * Devuelve null si aún no tenemos datos del primer render.
   */
  function buildMVP() {
    if (!state.lastMatrix || !state.modelMatrix) return null;
    return new THREE.Matrix4()
      .fromArray(state.lastMatrix)
      .multiply(state.modelMatrix);
  }

  // ── Raycasting interno ────────────────────────────────────────────────────
  /**
   * Realiza la intersección rayo-mallas en las coordenadas CSS dadas.
   * Devuelve el primer intersect de Three.js o null.
   *
   * @param {number} cssX
   * @param {number} cssY
   * @returns {THREE.Intersection|null}
   */
  function castRay(cssX, cssY) {
    const mvp = buildMVP();
    if (!mvp || !state.buildingGroup) return null;

    const canvas    = state.map.getCanvas();
    const raycaster = buildRayFromMouse(cssX, cssY, canvas, mvp);

    // intersectObjects con recursive=true recorre toda la jerarquía del GLB.
    // Los resultados ya vienen ordenados de más cercano a más lejano.
    const hits = raycaster.intersectObjects([state.buildingGroup], true);

    // Filtramos objetos que no son Mesh (e.g. Lines, Points, grupos vacíos)
    return hits.find(h => h.object.isMesh) ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API del layer
  // ─────────────────────────────────────────────────────────────────────────
  const layer = {
    id,
    type:          'custom',
    renderingMode: '3d',

    // ── onAdd ───────────────────────────────────────────────────────────────
    onAdd(map, gl) {
      state.map    = map;
      state.camera = new THREE.Camera();
      state.scene  = new THREE.Scene();

      // Iluminación
      state.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const sun = new THREE.DirectionalLight(0xfff5e4, 2.5);
      sun.position.set(60, 100, 40);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, {
        near: 0.5, far: 400, left: -120, right: 120, bottom: -120, top: 120,
      });
      state.scene.add(sun);
      const fill = new THREE.DirectionalLight(0xc9d8ff, 0.6);
      fill.position.set(-40, 20, -60);
      state.scene.add(fill);

      // Renderer compartido con el canvas de Mapbox
      state.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(), context: gl, antialias: true,
      });
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

            // Centrar el modelo en XZ sobre su bounding box
            const box    = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.set(-center.x, -box.min.y, -center.z);

            // Asegurar que no flote
            const fb = new THREE.Box3().setFromObject(model);
            if (fb.min.y < 0) model.position.y -= fb.min.y;

            model.traverse(c => {
              if (!c.isMesh) return;
              c.castShadow    = true;
              c.receiveShadow = true;
            });

            state.buildingGroup.add(model);

            // ★ CLAVE: guardar emissive original en cada material
            //    ANTES de que cualquier hover lo modifique.
            storeEmissiveState(state.buildingGroup);

            state.loaded = true;
            onLoaded?.();
            map.triggerRepaint();
          },
          xhr => {
            if (xhr.total) onProgress?.(Math.round((xhr.loaded / xhr.total) * 100));
          },
          err => {
            console.error(`[MapboxViewer] ${modelUrl}:`, err);
            onError?.();
          },
        );
      } else {
        // Modelo de demostración (caja simple)
        addDemoModel(state.buildingGroup);
        storeEmissiveState(state.buildingGroup);  // guardar emissive del demo
        state.loaded = true;
        onLoaded?.();
      }
    },

    // ── render ───────────────────────────────────────────────────────────────
    render(gl, matrix) {
      if (!state.loaded) return;

      // Guardar la matriz bruta del frame actual (usada en raycasting)
      state.lastMatrix = matrix;

      // Calcular la modelMatrix: ancla Mercator + rotación Y invertida de Three.js
      const rotX = new THREE.Matrix4()
        .makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      const mc   = mapboxgl.MercatorCoordinate.fromLngLat(state.lngLat, 0);
      const s    = mc.meterInMercatorCoordinateUnits();

      state.modelMatrix = new THREE.Matrix4()
        .makeTranslation(mc.x, mc.y, mc.z)
        .scale(new THREE.Vector3(s, -s, s))
        .multiply(rotX);

      // La projectionMatrix de la cámara ficticia acumula la MVP completa.
      // matrixWorldInverse se deja en identidad (THREE.Camera default).
      state.camera.projectionMatrix = new THREE.Matrix4()
        .fromArray(matrix)
        .multiply(state.modelMatrix);

      state.renderer.resetState();
      state.renderer.render(state.scene, state.camera);
    },

    // ── onRemove ─────────────────────────────────────────────────────────────
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

    // ── API pública de interacción ────────────────────────────────────────────

    /**
     * Aplica el efecto visual de hover en la posición del mouse dada y
     * devuelve información sobre el objeto bajo el cursor.
     *
     * COMPORTAMIENTO DIFERENCIADO:
     *  - isDetailed=false (genérico): brilla todo el buildingGroup.
     *  - isDetailed=true  (FIE):      brilla únicamente la sub-malla intersectada.
     *
     * Internamente gestiona las transiciones entre meshes hover sin necesidad
     * de que el caller llame a clearHover() entre frames.
     *
     * @param {number} cssX  Posición X en CSS pixels (de e.point.x)
     * @param {number} cssY  Posición Y en CSS pixels (de e.point.y)
     * @returns {{ type: 'building'|'hotspot', mesh?: THREE.Mesh, meshName?: string }|null}
     *          null si el rayo no intersecta ninguna malla del modelo.
     */
    hoverAt(cssX, cssY) {
      if (!state.loaded) return null;

      const hit = castRay(cssX, cssY);

      if (!hit) {
        // El rayo no tocó nada de este layer → limpiar cualquier hover previo
        this.clearHover();
        return null;
      }

      const mesh = hit.object;

      if (state.isDetailed) {
        // ── Modo FIE: hover por sub-malla ─────────────────────────────────
        if (state.hoveredMesh && state.hoveredMesh !== mesh) {
          // El cursor se movió a otra sub-malla → restaurar la anterior
          clearHoverFromMesh(state.hoveredMesh);
        }
        state.hoveredMesh = mesh;
        applyHoverToMesh(mesh, true);
        state.map.triggerRepaint();

        return { type: 'hotspot', mesh, meshName: mesh.name };

      } else {
        // ── Modo genérico: hover por bloque completo ───────────────────────
        if (!state.isGroupHovered) {
          applyHoverToGroup(state.buildingGroup);
          state.isGroupHovered = true;
          state.map.triggerRepaint();
        }

        return { type: 'building' };
      }
    },

    /**
     * Elimina todos los efectos visuales de hover de este layer y
     * restaura los colores emissive originales de los materiales.
     *
     * Llamar cuando el cursor sale del modelo o cambia de layer.
     */
    clearHover() {
      if (state.isDetailed) {
        if (state.hoveredMesh) {
          clearHoverFromMesh(state.hoveredMesh);
          state.hoveredMesh = null;
          state.map?.triggerRepaint();
        }
      } else {
        if (state.isGroupHovered) {
          clearHoverFromGroup(state.buildingGroup);
          state.isGroupHovered = false;
          state.map?.triggerRepaint();
        }
      }
    },

    /**
     * Lanza el rayo y devuelve el resultado de hit SIN modificar el estado visual.
     * Útil para el handler de clic (que no necesita re-aplicar hover).
     *
     * @param {number} cssX
     * @param {number} cssY
     * @returns {{ type: 'building'|'hotspot', meshName?: string }|null}
     */
    raycastAt(cssX, cssY) {
      if (!state.loaded) return null;

      const hit = castRay(cssX, cssY);
      if (!hit) return null;

      if (state.isDetailed) {
        return { type: 'hotspot', meshName: hit.object.name };
      }
      return { type: 'building' };
    },

    // ── Accesores de estado (usados por el componente padre) ─────────────────

    get isLoaded()    { return state.loaded; },
    get isDetailedBuilding() { return state.isDetailed; },
  };

  return layer;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function MapboxViewer({
  allModels   = [],
  buildings   = [],
  building,
  onBuildingClick,
  onHotspotClick,   // (meshName: string) => void  — para edificio FIE
  isMobile,
  isPanelOpen = true,   
  onOpenPanel,  

  /**
   * Set<string> con los building_id cuyos modelos tienen sub-mallas nombradas
   * que corresponden 1:1 a los `name` de los hotspots en la BD.
   * Ej: new Set(['3']) si el edificio FIE tiene id=3.
   */
  detailedBuildingIds = new Set(),
}) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const mapReadyRef     = useRef(false);
  const keysRef         = useRef(new Set());
  const rafRef          = useRef(null);
  const dracoLoaderRef  = useRef(null);
  const installedLayers = useRef(new Map());
  const layerRefs       = useRef(new Map());
  const pendingLoadsRef = useRef(0);
  const buildingRef     = useRef(building);
  const allModelsRef    = useRef(allModels);
  const buildingsRef    = useRef(buildings);

  // Ref para el layer actualmente hovered (limpieza cross-layer)
  const hoveredLayerIdRef = useRef(null);

  const onHotspotClickRef  = useRef(onHotspotClick);
  const onBuildingClickRef = useRef(onBuildingClick);

  const { setModelLoading, setModelProgress } = useViewerStore();

  const [webglError,    setWebglError]    = useState(false);
  const [isFlying,      setIsFlying]      = useState(false);
  const [layersVersion, setLayersVersion] = useState(0);
  const [showOverlay,   setShowOverlay]   = useState(
    () => sessionStorage.getItem('fie-overlay-dismissed') !== '1'
  );

  // Mantener refs sincronizados con props
  useEffect(() => { buildingRef.current      = building;       }, [building]);
  useEffect(() => { allModelsRef.current     = allModels;      }, [allModels]);
  useEffect(() => { buildingsRef.current     = buildings;      }, [buildings]);
  useEffect(() => { onHotspotClickRef.current  = onHotspotClick;  }, [onHotspotClick]);
  useEffect(() => { onBuildingClickRef.current = onBuildingClick; }, [onBuildingClick]);

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
      if (curr) map.flyTo(getBuildingFlyTo(curr));
    });

    mapRef.current = map;
    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
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
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === 'Shift' && e.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT)
        keysRef.current.add('shiftleft');
    };
    const up = e => {
      keysRef.current.delete(e.key.toLowerCase());
      if (e.key === 'Shift') keysRef.current.delete('shiftleft');
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ── Loop de movimiento (WASD / flechas) ────────────────────────────────────
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
      const sm      = keys.has('shiftleft') ? 4 : 1;
      const ps      = PAN_SPEED * Math.pow(0.5, zoom - 14) * sm;
      const br      = (bearing * Math.PI) / 180;
      const sB      = Math.sin(br);
      const cB      = Math.cos(br);

      let dLng = 0, dLat = 0, dB = 0, dP = 0;
      if (keys.has('w') || keys.has('arrowup'))    { dLng -= sB * ps; dLat += cB * ps; }
      if (keys.has('s') || keys.has('arrowdown'))  { dLng += sB * ps; dLat -= cB * ps; }
      if (keys.has('a') || keys.has('arrowleft'))  { dLng -= cB * ps; dLat -= sB * ps; }
      if (keys.has('d') || keys.has('arrowright')) { dLng += cB * ps; dLat += sB * ps; }
      if (keys.has('q'))  dB -= ROTATE_SPEED * sm;
      if (keys.has('e'))  dB += ROTATE_SPEED * sm;
      if (keys.has('r'))  dP  = -PITCH_SPEED * sm;
      if (keys.has('f'))  dP  =  PITCH_SPEED * sm;

      if (dLng || dLat) map.setCenter([center.lng + dLng, center.lat + dLat]);
      if (dB)  map.setBearing(bearing + dB);
      if (dP)  map.setPitch(Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch + dP)));
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

  // ── Instalar / actualizar layers ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dracoLoaderRef.current) return;

    const install = () => {
      const targetIds = new Set(allModels.map(m => `fie-model-${m.building_id}`));

      // Eliminar layers que ya no están en el listado de modelos
      installedLayers.current.forEach((_, lid) => {
        if (!targetIds.has(lid) && map.getLayer(lid)) {
          map.removeLayer(lid);
          installedLayers.current.delete(lid);
          layerRefs.current.delete(lid);
        }
      });

      // Determinar qué modelos instalar (nuevos o con hash de escala cambiado)
      const toInstall = allModels.filter(m => {
        const lid  = `fie-model-${m.building_id}`;
        const hash = `${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`;
        const old  = installedLayers.current.get(lid);
        if (!old || old !== hash) {
          if (old && map.getLayer(lid)) {
            map.removeLayer(lid);
            installedLayers.current.delete(lid);
            layerRefs.current.delete(lid);
          }
          return true;
        }
        return false;
      });

      if (!toInstall.length) return;

      pendingLoadsRef.current += toInstall.length;
      setModelLoading(true);
      setModelProgress(0);

      toInstall.forEach(m => {
        const lid    = `fie-model-${m.building_id}`;
        const onDone = () => {
          pendingLoadsRef.current = Math.max(0, pendingLoadsRef.current - 1);
          if (pendingLoadsRef.current === 0) setModelLoading(false);
        };

        const layer = createModelLayer({
          id:  lid,
          modelUrl: m.file_path,
          lngLat:   CAMPUS_VIEW.center,
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

          // ★ Determinar si este edificio tiene interacción a nivel de sub-malla
          isDetailed: detailedBuildingIds.has(String(m.building_id)),

          onProgress: p => setModelProgress(p),
          onLoaded:   onDone,
          onError:    onDone,
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
      installedLayers.current.clear();
      layerRefs.current.clear();
      pendingLoadsRef.current = 0;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allModels.map(m => `${m.building_id}:${m.scale_x},${m.scale_y},${m.scale_z},${m.rotate_x},${m.rotate_y},${m.rotate_z}`).join('|')]);

  // ── HOVER 3D (mousemove) ───────────────────────────────────────────────────
  /**
   * Estrategia:
   *  1. Iteramos todos los layers registrados buscando el primer hit de rayo.
   *  2. Si hay hit en un layer diferente al anterior, limpiamos el hover previo.
   *  3. El layer con hit aplica su propio efecto visual vía hoverAt().
   *  4. Si no hay hit en ninguno, limpiamos todo y restauramos el cursor.
   *
   * Nota de rendimiento: castRay() es CPU-only y O(n_triangles). Para modelos
   * GLB con BVH (via three-mesh-bvh) esto es sub-milisegundo. Sin BVH puede
   * ser costoso en mallas muy densas; en ese caso, considera throttling con
   * requestAnimationFrame o debounce a 30fps.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const onMouseMove = e => {
      const { x, y } = e.point;  // CSS pixels
      let hitLayerId  = null;

      // Buscar el primer layer que tenga un hit bajo el cursor
      for (const [lid, layer] of layerRefs.current) {
        const result = layer.hoverAt(x, y);
        if (result) {
          hitLayerId = lid;
          break;
        }
      }

      // Limpiar el hover del layer anterior si cambió
      if (hoveredLayerIdRef.current && hoveredLayerIdRef.current !== hitLayerId) {
        layerRefs.current.get(hoveredLayerIdRef.current)?.clearHover();
      }
      hoveredLayerIdRef.current = hitLayerId;

      // Cambiar cursor
      map.getCanvas().style.cursor = hitLayerId ? 'pointer' : '';
    };

    const onMouseLeave = () => {
      // El mouse salió del canvas → limpiar todo hover
      if (hoveredLayerIdRef.current) {
        layerRefs.current.get(hoveredLayerIdRef.current)?.clearHover();
        hoveredLayerIdRef.current = null;
      }
      map.getCanvas().style.cursor = '';
    };

    const register = () => {
      if (cancelled) return;
      map.on('mousemove', onMouseMove);
      map.getCanvas?.()?.addEventListener('mouseleave', onMouseLeave);
    };

    if (mapReadyRef.current) register();
    else map.once('load', register);

    return () => {
      cancelled = true;
      map.off('mousemove', onMouseMove);
      // getCanvas() puede ser undefined si Mapbox ya fue destruido (StrictMode / unmount)
      map.getCanvas?.()?.removeEventListener('mouseleave', onMouseLeave);
      if (hoveredLayerIdRef.current) {
        layerRefs.current.get(hoveredLayerIdRef.current)?.clearHover();
        hoveredLayerIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layersVersion]);

  // ── CLIC 3D ────────────────────────────────────────────────────────────────
  /**
   * Dispara el raycaster puro (sin efectos visuales) y llama al callback
   * correspondiente según el tipo de layer:
   *
   *   - Edificio genérico → onBuildingClick(buildingObject)
   *   - Sub-malla FIE     → onHotspotClick(meshName)
   *
   * El callback de hotspot recibe el `mesh.name` del GLB, que debe coincidir
   * con el campo `name` del hotspot en la base de datos. La búsqueda del
   * objeto hotspot completo queda a cargo del componente padre (Explorer.jsx).
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const onClick = e => {
      const { x, y } = e.point;

      for (const [lid, layer] of layerRefs.current) {
        const result = layer.raycastAt(x, y);
        if (!result) continue;

        e.originalEvent?.stopPropagation();

        if (result.type === 'hotspot') {
          // ── Edificio FIE: click en sub-malla → abrir panel lateral ────────
          onHotspotClickRef.current?.(result.meshName);

        } else {
          // ── Edificio genérico: click en bloque → seleccionar edificio ──────
          const buildingId = lid.replace('fie-model-', '');
          const bld = buildingsRef.current.find(
            b => String(b.id) === buildingId,
          );
          onBuildingClickRef.current?.(bld ?? { id: buildingId });
        }

        break; // Primer hit gana
      }
    };

    const register = () => {
      if (cancelled) return;

      // Desktop
      map.on('click', onClick);

      // Mobile
      map.on('touchend', onClick);
    };

    if (mapReadyRef.current) register();
    else map.once('load', register);

    return () => {
      cancelled = true;
      map.off('click', onClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layersVersion]);

  // ── FlyTo al seleccionar edificio ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!building || !map) return;

    const fly = () => map.flyTo(getBuildingFlyTo(building));

    if (mapReadyRef.current) fly();
    else map.once('load', fly);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building?.id]);

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

      {showOverlay && (
        <ControlsOverlay
          isMobile={isMobile}
          onDismiss={() => {
            setShowOverlay(false);
            sessionStorage.setItem('fie-overlay-dismissed', '1');
          }}
        />
      )}

      {/* Botón de vista inicial del campus */}
      {building && (
        <button
          onClick={flyToCampus}
          disabled={isFlying}
          title={isFlying ? 'Animando…' : 'Cámara Inicial'}
          aria-label="Volver a vista inicial del campus"
          style={{ position:'absolute', top:12, right:12, zIndex:20, width:36, height:36, background: isFlying ? 'var(--color-bg-soft)' : 'var(--color-bg)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', cursor: isFlying ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--shadow-sm)', color: isFlying ? 'var(--color-text-4)' : 'var(--color-text-2)', opacity: isFlying ? 0.6 : 1, transition:'all var(--transition)' }}
          onMouseEnter={e => { if (!isFlying) e.currentTarget.style.background = 'var(--color-bg-soft)'; }}
          onMouseLeave={e => { if (!isFlying) e.currentTarget.style.background = 'var(--color-bg)'; }}
        >
          {isFlying
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>
          }
        </button>
      )}

      <ViewerControls isMobile={isMobile} />
      <MiniMap mainMap={mapRef.current} isMobile={isMobile} />

      {/* Badge de edificio seleccionado */}
      {building ? (
        <div style={{ position:'absolute', bottom:48, left:'50%', transform:'translateX(-50%)', zIndex:20, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(8px)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', padding:'0.4rem 1rem', display:'flex', alignItems:'center', gap:8, boxShadow:'var(--shadow-md)', fontSize:'0.75rem', fontWeight:700, color:'var(--color-text)', whiteSpace:'nowrap' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--color-primary)', flexShrink:0 }} />
          {building.name}
          {allModels.some(m => m.building_id === building.id)
            ? <span style={{ color:'var(--color-success)', fontWeight:400, fontSize:'0.68rem' }}>· modelo 3D</span>
            : <span style={{ color:'var(--color-warning)', fontWeight:400, fontSize:'0.68rem' }}>· demo</span>
          }
        </div>
      ) : (
        <div style={{ position:'absolute', bottom:48, left:'50%', transform:'translateX(-50%)', zIndex:20, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(8px)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', padding:'0.5rem 1.2rem', color:'var(--color-text-3)', fontSize:'0.78rem', boxShadow:'var(--shadow-sm)', whiteSpace:'nowrap' }}>
          Haz clic en un edificio para explorar sus espacios
        </div>
      )}
    </div>
  );
}