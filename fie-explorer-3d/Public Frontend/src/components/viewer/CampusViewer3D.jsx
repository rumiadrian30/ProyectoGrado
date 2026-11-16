/**
 * CampusViewer3D.jsx — GeoESPOCH 3D
 * ─────────────────────────────────────────────────────────────────────────────
 * Contenedor del visor 3D: canvas, calidad según dispositivo, modo interior,
 * carga por proximidad, recorrido automático y HUD.
 *
 * Estructura:
 *   scene/Scene3D        contenido de la escena (cielo, luces, terreno,
 *                        edificios, pines, cámara, navegación)
 *   hud/*                controles e indicadores sobre el canvas
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import Scene3D from './scene/Scene3D';
import { findMarkerObject } from './scene/InteriorHotspotMarkers';
import { SKY } from './scene/constants';
import ControlsOverlay from './ControlsOverlay';
import MiniMap3D from '../minimap/MiniMap';
import ViewerLoading from './hud/ViewerLoading';
import ViewerControls3D from './hud/ViewerControls3D';
import {
  BuildingBadge,
  ChangeBuildingFloatingButton,
  ControlsHelpButton,
  InteriorToggleButton,
  InteriorHint,
  BoundsWarningToast,
  ProximityConfirmDialog,
  WebGLErrorFallback,
} from './hud/ViewerOverlays';

const INTERIOR_BASE_CAMERA = 'Cam_Interior_FIE_CentroBajo';
const CAMERA_PREFIX = 'Cam_Interior_';

/* ─── Calidad según dispositivo ─────────────────────────────────────────── */
function detectQuality(isMobile) {
  const cores  = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const memory = typeof navigator !== 'undefined' ? navigator.deviceMemory || 4 : 4;

  // ?calidad=alta | baja permite forzar el perfil (útil para pruebas)
  let forced = null;
  try {
    forced = new URLSearchParams(window.location.search).get('calidad');
  } catch { /* SSR / entornos sin location */ }

  const low = forced === 'alta' ? false
    : forced === 'baja' ? true
    : (isMobile || cores <= 2 || memory <= 2);

  return {
    low,
    shadows:    !low,
    dpr:        low ? [1, 1.5] : [1, 2],
    anisotropy: low ? 2 : 8,
  };
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/* ─── Cámara base del interior ──────────────────────────────────────────── */
function findInteriorBaseCamera(scene, building) {
  if (!scene) return null;

  const preferred = [
    building?.interior_camera_reference,
    INTERIOR_BASE_CAMERA,
  ].filter(Boolean);

  for (const name of preferred) {
    const obj = findMarkerObject(scene, name);
    if (obj) return obj;
  }

  let fallback = null;
  scene.traverse((obj) => {
    if (fallback) return;
    if (obj.name?.startsWith(CAMERA_PREFIX) && /entrada|centro|base/i.test(obj.name)) fallback = obj;
  });
  if (fallback) return fallback;

  scene.traverse((obj) => {
    if (!fallback && obj.name?.startsWith(CAMERA_PREFIX)) fallback = obj;
  });
  return fallback;
}

function setExteriorVisible(scene, groupName, visible) {
  if (!scene) return;
  scene.traverse((obj) => {
    if (obj.name === groupName || obj.parent?.name === groupName) {
      obj.visible = visible;
    }
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function CampusViewer3D({
  allModels = [],
  buildings = [],
  building,
  hotspots = [],
  activeHotspot = null,
  onBuildingClick,
  onMeshClick,
  onHotspotSelect,
  onInteriorModeChange,
  onSceneReady,
  onCameraCommandReady,
  isMobile = false,
  sidebarOpen = true,
  onRequestChangeBuilding,
}) {
  const [webglOk] = useState(() => hasWebGL());
  const [showOverlay,    setShowOverlay]    = useState(false);
  const [showMiniMap,    setShowMiniMap]    = useState(false);
  const [miniMapExpanded, setMiniMapExpanded] = useState(false);
  const [cameraSnapshot, setCameraSnapshot] = useState(null);
  const [interiorMode,   setInteriorMode]   = useState(false);
  const [proximityEnabled, setProximityEnabled] = useState(() => isMobile);
  const [showProximityConfirm, setShowProximityConfirm] = useState(false);
  const [tourActive,     setTourActive]     = useState(false);
  const [boundsWarning,  setBoundsWarning]  = useState(false);
  const [boundsVersion,  setBoundsVersion]  = useState(0);

  const orbitRef         = useRef(null);
  const cameraCommandRef = useRef(null);
  const sceneRef         = useRef(null);
  const boundsRef        = useRef(new Map());
  const warningTimerRef  = useRef(null);
  const exteriorTimerRef = useRef(null);

  const quality = useMemo(() => detectQuality(isMobile), [isMobile]);

  /* ── Precarga: sin proximidad, descargar todos los modelos en paralelo ── */
  useEffect(() => {
    if (proximityEnabled) return;
    allModels.forEach((m) => { if (m?.file_path) useGLTF.preload(m.file_path); });
  }, [allModels, proximityEnabled]);

  /* ── Bounds de modelos cargados ───────────────────────────────────────── */
  const handleBounds = useCallback((id, box) => {
    boundsRef.current.set(String(id), box);
    setBoundsVersion((v) => v + 1);
  }, []);

  /* ── Modo interior ────────────────────────────────────────────────────── */
  const exitInterior = useCallback(() => {
    if (!building) return;
    window.clearTimeout(exteriorTimerRef.current);
    setExteriorVisible(sceneRef.current, building.exterior_group_name || 'Exterior', true);
    setInteriorMode(false);
    onInteriorModeChange?.(false);
    cameraCommandRef.current?.focusBuilding?.(building);
  }, [building, onInteriorModeChange]);

  const enterInterior = useCallback(() => {
    if (!building) return;
    const cmd = cameraCommandRef.current;

    setInteriorMode(true);
    onInteriorModeChange?.(true);

    const markerCam = findInteriorBaseCamera(sceneRef.current, building);

    if (markerCam) {
      const worldPos  = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      markerCam.getWorldPosition(worldPos);
      markerCam.getWorldQuaternion(worldQuat);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat);
      cmd?.moveTo?.(worldPos.toArray(), worldPos.clone().add(forward).toArray(), worldQuat);
    } else {
      const ox = parseFloat(building.offset_x) || 0;
      const oz = parseFloat(building.offset_z) || 0;
      const cx = parseFloat(building.interior_cam_x) || 0;
      const cy = parseFloat(building.interior_cam_y) || 8;
      const cz = parseFloat(building.interior_cam_z) || 15;
      const tx = parseFloat(building.interior_target_x) || 0;
      const ty = parseFloat(building.interior_target_y) || 2;
      const tz = parseFloat(building.interior_target_z) || 0;
      cmd?.moveTo?.([ox + cx, cy, oz + cz], [ox + tx, ty, oz + tz]);
    }

    // Ocultar la envolvente exterior cuando la cámara ya está dentro
    const groupName = building.exterior_group_name || 'Exterior';
    window.clearTimeout(exteriorTimerRef.current);
    exteriorTimerRef.current = window.setTimeout(() => {
      setExteriorVisible(sceneRef.current, groupName, false);
    }, 850);
  }, [building, onInteriorModeChange]);

  const toggleInteriorMode = useCallback(() => {
    if (interiorMode) exitInterior();
    else enterInterior();
  }, [interiorMode, enterInterior, exitInterior]);

  // Cambiar de edificio sale del interior y restaura la envolvente
  useEffect(() => {
    setInteriorMode(false);
    window.clearTimeout(exteriorTimerRef.current);
    setExteriorVisible(sceneRef.current, 'Exterior', true);
    if (building?.exterior_group_name) {
      setExteriorVisible(sceneRef.current, building.exterior_group_name, true);
    }
  }, [building?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape sale del interior
  useEffect(() => {
    if (!interiorMode) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') exitInterior(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interiorMode, exitInterior]);

  /* ── Selección de edificios ───────────────────────────────────────────── */
  const resolveBuilding = useCallback((buildingOrId) => {
    if (buildingOrId && typeof buildingOrId === 'object') return buildingOrId;
    return buildings.find((b) => String(b.id) === String(buildingOrId)) || null;
  }, [buildings]);

  const handleBuildingClick = useCallback((buildingOrId) => {
    const found = resolveBuilding(buildingOrId);
    if (found) onBuildingClick?.(found);
  }, [resolveBuilding, onBuildingClick]);

  const handleBuildingDoubleClick = useCallback((buildingOrId) => {
    const found = resolveBuilding(buildingOrId);
    if (!found) return;
    if (String(found.id) !== String(building?.id)) onBuildingClick?.(found);
    cameraCommandRef.current?.focusBuilding?.(found);
  }, [resolveBuilding, onBuildingClick, building?.id]);

  /* ── Avisos y toggles ─────────────────────────────────────────────────── */
  const showBoundsWarning = useCallback(() => {
    setBoundsWarning(true);
    window.clearTimeout(warningTimerRef.current);
    warningTimerRef.current = window.setTimeout(() => setBoundsWarning(false), 1600);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(warningTimerRef.current);
    window.clearTimeout(exteriorTimerRef.current);
  }, []);

  const handleToggleProximity = useCallback(() => {
    if (proximityEnabled) {
      if (quality.low) setShowProximityConfirm(true);
      else setProximityEnabled(false);
      return;
    }
    setProximityEnabled(true);
    setShowProximityConfirm(false);
  }, [proximityEnabled, quality.low]);

  const toggleControlsOverlay = useCallback(() => {
    setShowOverlay((prev) => {
      const next = !prev;
      if (next) setShowMiniMap(false);
      return next;
    });
  }, []);

  const toggleMiniMap = useCallback(() => {
    setShowMiniMap((prev) => {
      const next = !prev;
      if (next) setShowOverlay(false);
      return next;
    });
  }, []);

  const handleSceneReady = useCallback((scene) => {
    sceneRef.current = scene;
    onSceneReady?.(scene);
  }, [onSceneReady]);

  // Exponer entrar/salir del interior junto con los comandos de cámara
  // (Explorer.jsx los usa para "Ver en 3D" desde el detalle de un hotspot).
  const enterInteriorRef = useRef(enterInterior);
  const exitInteriorRef  = useRef(exitInterior);
  useEffect(() => { enterInteriorRef.current = enterInterior; }, [enterInterior]);
  useEffect(() => { exitInteriorRef.current  = exitInterior;  }, [exitInterior]);

  const handleCameraCommandReady = useCallback((commands) => {
    commands.enterInterior = () => enterInteriorRef.current?.();
    commands.exitInterior  = () => exitInteriorRef.current?.();
    onCameraCommandReady?.(commands);
  }, [onCameraCommandReady]);

  const selectedHasModel = useMemo(
    () => allModels.some((m) => String(m.building_id) === String(building?.id) && m.is_active),
    [allModels, building?.id],
  );

  if (!webglOk) return <WebGLErrorFallback />;

  return (
    <div className="v3d-root" style={{ background: SKY.horizon }}>
      <Canvas
        shadows={quality.shadows}
        frameloop="demand"
        dpr={quality.dpr}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={(state) => {
          state.gl.shadowMap.enabled = quality.shadows;
          state.gl.shadowMap.type = THREE.PCFSoftShadowMap;
          if (import.meta.env.DEV) window.__geo3d = state; // inspección en desarrollo
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene3D
          allModels={allModels}
          buildings={buildings}
          selectedBuilding={building}
          interiorMode={interiorMode}
          proximityEnabled={proximityEnabled}
          quality={quality}
          isMobile={isMobile}
          orbitRef={orbitRef}
          cameraCommandRef={cameraCommandRef}
          boundsRef={boundsRef}
          boundsVersion={boundsVersion}
          hotspots={hotspots}
          activeHotspot={activeHotspot}
          onBuildingClick={handleBuildingClick}
          onBuildingDoubleClick={handleBuildingDoubleClick}
          onMeshClick={onMeshClick}
          onHotspotSelect={onHotspotSelect}
          onBounds={handleBounds}
          onCameraSnapshot={setCameraSnapshot}
          onBoundsWarning={showBoundsWarning}
          onSceneReady={handleSceneReady}
          onCameraCommandReady={handleCameraCommandReady}
          onTourChange={setTourActive}
        />
      </Canvas>

      <ViewerLoading isMobile={isMobile} />

      {boundsWarning && <BoundsWarningToast isMobile={isMobile} />}

      {showOverlay && (
        <ControlsOverlay
          isMobile={isMobile}
          interiorMode={interiorMode}
          onDismiss={() => setShowOverlay(false)}
        />
      )}

      <ControlsHelpButton isMobile={isMobile} onClick={toggleControlsOverlay} active={showOverlay} />

      {!interiorMode && (
        <ViewerControls3D
          isMobile={isMobile}
          cameraCommandRef={cameraCommandRef}
          proximityEnabled={proximityEnabled}
          onToggleProximity={handleToggleProximity}
          tourActive={tourActive}
          onToggleTour={() => cameraCommandRef.current?.toggleTour?.()}
        />
      )}

      <ProximityConfirmDialog
        visible={showProximityConfirm && !interiorMode}
        isMobile={isMobile}
        onCancel={() => setShowProximityConfirm(false)}
        onAccept={() => { setProximityEnabled(false); setShowProximityConfirm(false); }}
      />

      {!interiorMode && (
        <MiniMap3D
          buildings={buildings}
          allModels={allModels}
          selectedBuilding={building}
          onSelectBuilding={handleBuildingClick}
          isMobile={isMobile}
          visible={showMiniMap}
          expanded={miniMapExpanded}
          cameraSnapshot={cameraSnapshot}
          onToggle={toggleMiniMap}
          onToggleSize={() => setMiniMapExpanded((v) => !v)}
        />
      )}

      {interiorMode ? (
        <InteriorHint isMobile={isMobile} />
      ) : sidebarOpen ? (
        <BuildingBadge building={building} hasModel={selectedHasModel} isMobile={isMobile} />
      ) : (
        <ChangeBuildingFloatingButton
          building={building}
          isMobile={isMobile}
          onClick={onRequestChangeBuilding}
        />
      )}

      {building?.has_interior && (
        <InteriorToggleButton
          interiorMode={interiorMode}
          isMobile={isMobile}
          onClick={toggleInteriorMode}
        />
      )}
    </div>
  );
}
