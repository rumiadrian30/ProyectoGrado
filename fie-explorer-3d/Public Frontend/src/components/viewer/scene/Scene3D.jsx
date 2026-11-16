/**
 * Scene3D.jsx — GeoESPOCH 3D
 * Contenido de la escena: cámara, controles, cielo, luces, terreno,
 * edificios, pines, anillo de selección y marcadores interiores.
 */
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html, Preload, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';

import { CAMERA, CAMERA_INITIAL, SKY } from './constants';
import SkyDome from './SkyDome';
import Lighting from './Lighting';
import CampusBase from './CampusBase';
import BuildingEntry from './BuildingEntry';
import SelectionRing from './SelectionRing';
import CameraRig from './CameraRig';
import InteriorMouseLook from './InteriorMouseLook';
import InteriorHotspotMarkers from './InteriorHotspotMarkers';
import KeyboardNavigation3D from '../KeyboardNavigation3D';
import MapPin from '../MapPin';
import { getModelPosition, findBuildingModel } from '../../../utils/viewer3DHelpers';

/* ─── Etiqueta de carga del terreno (dentro del canvas) ─────────────────── */
function CampusLoadingLabel() {
  return (
    <Html center zIndexRange={[5, 0]}>
      <div className="v3d-campus-loading">
        <span className="v3d-spinner" />
        <span>Cargando campus ESPOCH…</span>
      </div>
    </Html>
  );
}

/* ─── Snapshot de cámara para el minimapa ───────────────────────────────── */
function CameraTracker({ orbitRef, onSnapshot }) {
  const { camera } = useThree();
  const lastRef = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    if (now - lastRef.current < 0.2) return;
    lastRef.current = now;

    const target = orbitRef.current?.target;
    onSnapshot?.({
      cameraX: camera.position.x,
      cameraY: camera.position.y,
      cameraZ: camera.position.z,
      targetX: target?.x ?? 0,
      targetY: target?.y ?? 0,
      targetZ: target?.z ?? 0,
    });
  });

  return null;
}

/* ─── Sonda de desarrollo (estado de cámara en data-attributes) ─────────── */
function DebugProbe({ orbitRef }) {
  const { camera, gl, scene } = useThree();
  const frames = useRef(0);

  useEffect(() => {
    gl.domElement.dataset.geo3dMounted = String(scene.children.length);
  });

  useFrame(() => {
    frames.current += 1;
    gl.domElement.dataset.geo3dCam = JSON.stringify({
      frames: frames.current,
      pos: camera.position.toArray().map((v) => +v.toFixed(2)),
    });
    if (frames.current % 10 !== 1) return;

    let casters = 0;
    let receivers = 0;
    let shadowLight = null;
    scene.traverse((o) => {
      if (o.isMesh && o.castShadow) casters += 1;
      if (o.isMesh && o.receiveShadow) receivers += 1;
      if (o.isDirectionalLight && o.castShadow) {
        shadowLight = {
          pos: o.position.toArray().map((v) => +v.toFixed(0)),
          target: o.target.position.toArray().map((v) => +v.toFixed(0)),
          mapSize: [o.shadow.mapSize.x, o.shadow.mapSize.y],
          hasMap: !!o.shadow.map,
        };
      }
    });

    gl.domElement.dataset.geo3d = JSON.stringify({
      frames: frames.current,
      pos: camera.position.toArray().map((v) => +v.toFixed(1)),
      target: orbitRef.current?.target?.toArray().map((v) => +v.toFixed(1)),
      children: scene.children.length,
      shadows: { enabled: gl.shadowMap.enabled, casters, receivers, light: shadowLight },
    });
  });

  return null;
}

/* ─── Cursor según hover ────────────────────────────────────────────────── */
function useHoverCursor(hoveredId, interiorMode) {
  useEffect(() => {
    if (interiorMode) return undefined;
    document.body.style.cursor = hoveredId ? 'pointer' : '';
    return () => { document.body.style.cursor = ''; };
  }, [hoveredId, interiorMode]);
}

export default function Scene3D({
  allModels,
  buildings,
  selectedBuilding,
  interiorMode,
  proximityEnabled,
  quality,
  isMobile,
  orbitRef,
  cameraCommandRef,
  boundsRef,
  boundsVersion,
  hotspots,
  activeHotspot,
  onBuildingClick,
  onBuildingDoubleClick,
  onMeshClick,
  onHotspotSelect,
  onBounds,
  onCameraSnapshot,
  onBoundsWarning,
  onSceneReady,
  onCameraCommandReady,
  onTourChange,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const { scene } = useThree();

  useHoverCursor(hoveredId, interiorMode);

  useEffect(() => {
    onSceneReady?.(scene);
  }, [scene, onSceneReady]);

  // Al cambiar de edificio o entrar al interior, limpiar hover
  useEffect(() => { setHoveredId(null); }, [selectedBuilding?.id, interiorMode]);

  const selectedId = selectedBuilding?.id != null ? String(selectedBuilding.id) : null;

  // Posición y radio del anillo de selección
  const ring = useMemo(() => {
    if (!selectedBuilding) return null;
    const model = findBuildingModel(allModels, selectedBuilding);
    const pos   = getModelPosition(model, selectedBuilding);
    const box   = boundsRef.current?.get(selectedId);

    let radius = 16;
    let center = [pos.x, pos.y, pos.z];

    if (box && !box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const c    = box.getCenter(new THREE.Vector3());
      radius = Math.max(8, Math.hypot(size.x, size.z) * 0.5 * 1.04);
      center = [c.x, box.min.y, c.z];
    }

    return { position: center, radius };
    // boundsVersion fuerza recálculo cuando llegan los bounds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuilding, allModels, boundsRef, selectedId, boundsVersion]);

  return (
    <>
      <color attach="background" args={[SKY.horizon]} />

      <PerspectiveCamera
        makeDefault
        fov={CAMERA.fov}
        near={CAMERA.near}
        far={CAMERA.far}
        position={CAMERA_INITIAL.position}
      />

      <SkyDome />
      <Lighting shadows={quality.shadows} orbitRef={orbitRef} />

      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={!interiorMode}
        maxPolarAngle={CAMERA.maxPolar}
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={1.1}
        panSpeed={0.85}
        enablePan
        screenSpacePanning={false}
        target={CAMERA_INITIAL.target}
        regress={isMobile}
        mouseButtons={{
          LEFT:   THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT:  THREE.MOUSE.ROTATE,
        }}
        touches={{
          ONE: THREE.TOUCH.PAN,
          TWO: THREE.TOUCH.DOLLY_ROTATE,
        }}
        onStart={() => {
          if (interiorMode) return;
          cameraCommandRef.current?.cancelAnimation?.();
        }}
      />

      {isMobile && <AdaptiveDpr pixelated />}

      <CameraRig
        orbitRef={orbitRef}
        cameraCommandRef={cameraCommandRef}
        onCameraCommandReady={onCameraCommandReady}
        selectedBuilding={selectedBuilding}
        allModels={allModels}
        buildings={buildings}
        boundsRef={boundsRef}
        boundsVersion={boundsVersion}
        interiorMode={interiorMode}
        onTourChange={onTourChange}
      />

      <KeyboardNavigation3D
        orbitRef={orbitRef}
        cameraCommandRef={cameraCommandRef}
        mode={interiorMode ? 'walk' : 'orbit'}
        onBoundsWarning={onBoundsWarning}
      />

      <CameraTracker orbitRef={orbitRef} onSnapshot={onCameraSnapshot} />
      {import.meta.env.DEV && <DebugProbe orbitRef={orbitRef} />}

      <InteriorMouseLook
        active={interiorMode}
        isMobile={isMobile}
        cameraCommandRef={cameraCommandRef}
      />

      <Suspense fallback={<CampusLoadingLabel />}>
        <CampusBase
          shadows={quality.shadows}
          onFocusPoint={(point) => {
            if (interiorMode) return;
            cameraCommandRef.current?.lookAtPoint?.(point);
          }}
        />
      </Suspense>

      {buildings.map((building) => {
        const id    = String(building.id);
        const model = findBuildingModel(allModels, building);
        const isSelected = id === selectedId;
        // Al pasar el ratón por un pin se atenúan los demás; con solo un
        // edificio seleccionado, los otros se muestran discretos pero legibles.
        const isDimmed = hoveredId !== null && hoveredId !== id;
        const isMuted  = hoveredId === null && selectedId !== null && !isSelected;

        return (
          <React.Fragment key={id}>
            <BuildingEntry
              model={model}
              building={building}
              quality={quality}
              isSelected={isSelected}
              isHovered={hoveredId === id}
              interiorMode={interiorMode && isSelected}
              proximityEnabled={proximityEnabled}
              onClick={onBuildingClick}
              onDoubleClick={onBuildingDoubleClick}
              onMeshClick={onMeshClick}
              onHover={(hid) => setHoveredId(hid != null ? String(hid) : null)}
              onBounds={onBounds}
            />

            {!interiorMode && (
              <MapPin
                building={building}
                hasModel={!!model?.file_path}
                isSelected={isSelected}
                isDimmed={isDimmed}
                isMuted={isMuted}
                onHoverChange={(hid) => setHoveredId(hid != null ? String(hid) : null)}
                onClick={onBuildingClick}
                onDoubleClick={onBuildingDoubleClick}
              />
            )}
          </React.Fragment>
        );
      })}

      {ring && !interiorMode && (
        <SelectionRing
          position={ring.position}
          radius={ring.radius}
          activeKey={selectedId}
        />
      )}

      {interiorMode && (
        <InteriorHotspotMarkers
          hotspots={hotspots}
          activeHotspot={activeHotspot}
          onSelect={onHotspotSelect}
          sceneVersion={boundsVersion}
        />
      )}

      <Preload all />
    </>
  );
}
