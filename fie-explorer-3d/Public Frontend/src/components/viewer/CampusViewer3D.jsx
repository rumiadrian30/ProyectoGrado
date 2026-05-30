/**
 * CampusViewer3D.jsx — GeoESPOCH 3D
 */

import React, {
  Suspense,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { Canvas, useThree, useFrame } from '@react-three/fiber';

import {
  OrbitControls,
  useGLTF,
  Sky,
  Html,
  PerspectiveCamera,
} from '@react-three/drei';

import * as THREE from 'three';
import { useViewerStore } from '../../store/viewerStore';
import ControlsOverlay from './ControlsOverlay';
import KeyboardNavigation3D from './KeyboardNavigation3D';

/* ─────────────────────────────────────────────────────────────────────────────
   Constantes de entorno
───────────────────────────────────────────────────────────────────────────── */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CAMPUS_URL = `${API_BASE}/models/mapa-espoch.glb`;

const CAMERA_INITIAL = {
  position: [0, 180, 280],
  target: [0, 0, 0],
  fov: 45,
};

const CAMERA_TOP = {
  position: [0, 380, 0.1],
  target: [0, 0, 0],
};

const MAX_POLAR = Math.PI / 2.1;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function toRad(deg) {
  return (parseFloat(deg) || 0) * (Math.PI / 180);
}

function readNumber(...values) {
  for (const value of values) {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function getModelPosition(model, building) {
  return {
    x: readNumber(
      model?.building_offset_x,
      model?.offset_x,
      building?.offset_x
    ),
    y: readNumber(
      model?.building_offset_y,
      model?.offset_y,
      building?.offset_y
    ),
    z: readNumber(
      model?.building_offset_z,
      model?.offset_z,
      building?.offset_z
    ),
  };
}

function getModelScale(model) {
  return {
    x: readNumber(model?.scale_x, model?.scale) || 1,
    y: readNumber(model?.scale_y, model?.scale) || 1,
    z: readNumber(model?.scale_z, model?.scale) || 1,
  };
}

function getModelRotation(model) {
  return {
    x: parseFloat(model?.rotate_x) || 0,
    y: parseFloat(model?.rotate_y) || 0,
    z: parseFloat(model?.rotate_z) || 0,
  };
}

function findBuildingModel(allModels, building) {
  if (!building) return null;

  return allModels.find(
    (m) =>
      String(m.building_id) === String(building.id) &&
      (m.is_active === true || m.is_active === 1 || m.is_active === '1')
  ) ?? allModels.find(
    (m) => String(m.building_id) === String(building.id)
  ) ?? null;
}

function getFocusKey(building, model) {
  if (!building) return 'campus';

  const pos = getModelPosition(model, building);

  return [
    building.id,
    pos.x.toFixed(3),
    pos.y.toFixed(3),
    pos.z.toFixed(3),
  ].join(':');
}
/* ─────────────────────────────────────────────────────────────────────────────
   CampusBase
───────────────────────────────────────────────────────────────────────────── */

function CampusBase() {
  const { scene } = useGLTF(CAMPUS_URL);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.receiveShadow = true;
      obj.castShadow = false;
    });

    return cloned;
  }, [scene]);

  return <primitive object={clonedScene} position={[0, 0, 0]} />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   BuildingModel
───────────────────────────────────────────────────────────────────────────── */

function BuildingModel({
  url,
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  scaleX = 1,
  scaleY = 1,
  scaleZ = 1,
  buildingId,
  isSelected,
  onClick,
}) {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((obj) => {
      if (!obj.isMesh) return;

      obj.castShadow = true;
      obj.receiveShadow = true;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];

      mats.forEach((mat) => {
        if (!mat) return;

        if (!mat.__originalEmissive) {
          mat.__originalEmissive = mat.emissive?.clone?.() ?? new THREE.Color(0x000000);
          mat.__originalEmissiveIntensity = mat.emissiveIntensity ?? 0;
        }

        if (isSelected) {
          mat.emissive = new THREE.Color(0xbc0613);
          mat.emissiveIntensity = 0.18;
        } else {
          mat.emissive = mat.__originalEmissive.clone();
          mat.emissiveIntensity = mat.__originalEmissiveIntensity;
        }
      });
    });

    return cloned;
  }, [scene, isSelected]);

  return (
    <group
      position={[offsetX, offsetY, offsetZ]}
      rotation={[toRad(rotateX), toRad(rotateY), toRad(rotateZ)]}
      scale={[scaleX, scaleY, scaleZ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(buildingId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BuildingFallback
───────────────────────────────────────────────────────────────────────────── */

function BuildingFallback({
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0,
  buildingId,
  isSelected,
  onClick,
}) {
  return (
    <group
      position={[offsetX, offsetY + 6, offsetZ]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(buildingId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[10, 12, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#BC0613' : '#8B9EB0'}
          roughness={0.5}
          metalness={0.1}
          emissive={isSelected ? '#BC0613' : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
        />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(10, 12, 8)]} />
        <lineBasicMaterial color="#ffffff" opacity={0.2} transparent />
      </lineSegments>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BuildingEntry
───────────────────────────────────────────────────────────────────────────── */

function BuildingEntry({ model, building, isSelected, onClick }) {
  const pos = getModelPosition(model, building);
  const rot = getModelRotation(model);
  const scl = getModelScale(model);

  if (!model?.file_path) {
    return (
      <BuildingFallback
        offsetX={pos.x}
        offsetY={pos.y}
        offsetZ={pos.z}
        buildingId={building?.id}
        isSelected={isSelected}
        onClick={onClick}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <BuildingModel
        url={model.file_path}
        offsetX={pos.x}
        offsetY={pos.y}
        offsetZ={pos.z}
        rotateX={rot.x}
        rotateY={rot.y}
        rotateZ={rot.z}
        scaleX={scl.x}
        scaleY={scl.y}
        scaleZ={scl.z}
        buildingId={building?.id}
        isSelected={isSelected}
        onClick={onClick}
      />
    </Suspense>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CameraController
───────────────────────────────────────────────────────────────────────────── */

function CameraController({
  selectedBuilding,
  allModels,
  orbitRef,
  cameraCommandRef,
}) {
  const { camera } = useThree();

  const targetRef = useRef(new THREE.Vector3(...CAMERA_INITIAL.target));
  const cameraTargetRef = useRef(new THREE.Vector3(...CAMERA_INITIAL.position));
  const animatingRef = useRef(false);
  const lastFocusKeyRef = useRef(null);

  const moveTo = useCallback((position, target) => {
    cameraTargetRef.current.set(position[0], position[1], position[2]);
    targetRef.current.set(target[0], target[1], target[2]);
    animatingRef.current = true;
  }, []);

  const cancelAnimation = useCallback(() => {
    animatingRef.current = false;
  }, []);

  const focusBuilding = useCallback((building) => {
    if (!building) {
      moveTo(CAMERA_INITIAL.position, CAMERA_INITIAL.target);
      return;
    }

    const model = findBuildingModel(allModels, building);
    const pos = getModelPosition(model, building);

    moveTo(
      [pos.x + 45, Math.max(pos.y + 55, 55), pos.z + 75],
      [pos.x, pos.y, pos.z]
    );
  }, [allModels, moveTo]);

  useEffect(() => {
    cameraCommandRef.current = {
      cancelAnimation,

      reset() {
        lastFocusKeyRef.current = null;
        moveTo(CAMERA_INITIAL.position, CAMERA_INITIAL.target);
      },

      top() {
        moveTo(CAMERA_TOP.position, CAMERA_TOP.target);
      },

      focusBuilding(building) {
        if (!building) return;

        const model = findBuildingModel(allModels, building);
        lastFocusKeyRef.current = getFocusKey(building, model);

        focusBuilding(building);
      },

      zoomIn() {
        cancelAnimation();

        const controls = orbitRef.current;
        if (!controls) return;

        const direction = new THREE.Vector3()
          .subVectors(camera.position, controls.target)
          .normalize();

        const distance = camera.position.distanceTo(controls.target);
        const nextDistance = Math.max(20, distance * 0.78);

        const nextPosition = new THREE.Vector3()
          .copy(controls.target)
          .add(direction.multiplyScalar(nextDistance));

        moveTo(nextPosition.toArray(), controls.target.toArray());
      },

      zoomOut() {
        cancelAnimation();

        const controls = orbitRef.current;
        if (!controls) return;

        const direction = new THREE.Vector3()
          .subVectors(camera.position, controls.target)
          .normalize();

        const distance = camera.position.distanceTo(controls.target);
        const nextDistance = Math.min(800, distance * 1.28);

        const nextPosition = new THREE.Vector3()
          .copy(controls.target)
          .add(direction.multiplyScalar(nextDistance));

        moveTo(nextPosition.toArray(), controls.target.toArray());
      },

      rotateLeft() {
        cancelAnimation();

        const controls = orbitRef.current;
        if (!controls) return;

        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(18));

        const nextPosition = new THREE.Vector3().copy(controls.target).add(offset);
        moveTo(nextPosition.toArray(), controls.target.toArray());
      },

      rotateRight() {
        cancelAnimation();

        const controls = orbitRef.current;
        if (!controls) return;

        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-18));

        const nextPosition = new THREE.Vector3().copy(controls.target).add(offset);
        moveTo(nextPosition.toArray(), controls.target.toArray());
      },
    };
  }, [
    camera,
    orbitRef,
    cameraCommandRef,
    moveTo,
    focusBuilding,
    cancelAnimation,
  ]);

  useEffect(() => {
    if (!selectedBuilding) {
      if (lastFocusKeyRef.current !== null) {
        lastFocusKeyRef.current = null;
        focusBuilding(null);
      }

      return;
    }

    const model = findBuildingModel(allModels, selectedBuilding);
    const focusKey = getFocusKey(selectedBuilding, model);

    if (lastFocusKeyRef.current === focusKey) return;

    lastFocusKeyRef.current = focusKey;
    focusBuilding(selectedBuilding);
  }, [selectedBuilding, allModels, focusBuilding]);

  useFrame(() => {
    const controls = orbitRef.current;
    if (!animatingRef.current || !controls) return;

    camera.position.lerp(cameraTargetRef.current, 0.07);
    controls.target.lerp(targetRef.current, 0.07);
    controls.update();

    const cameraDone = camera.position.distanceTo(cameraTargetRef.current) < 0.5;
    const targetDone = controls.target.distanceTo(targetRef.current) < 0.2;

    if (cameraDone && targetDone) {
      camera.position.copy(cameraTargetRef.current);
      controls.target.copy(targetRef.current);
      controls.update();
      animatingRef.current = false;
    }
  });

  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Lighting
───────────────────────────────────────────────────────────────────────────── */

function Lighting() {
  return (
    <>
      <ambientLight color="#e8f0ff" intensity={0.55} />

      <directionalLight
        color="#fff8e7"
        intensity={2.8}
        position={[120, 200, 80]}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={800}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
        shadow-bias={-0.001}
      />

      <directionalLight
        color="#c8d8ff"
        intensity={0.45}
        position={[-80, 60, -100]}
      />

      <hemisphereLight
        skyColor="#b1d0ff"
        groundColor="#4a6632"
        intensity={0.3}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LoadingOverlay
───────────────────────────────────────────────────────────────────────────── */

function LoadingOverlay() {
  return (
    <Html center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        color: '#BC0613',
        fontFamily: 'var(--font-body, system-ui)',
        userSelect: 'none',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(188,6,19,.15)',
          borderTop: '3px solid #BC0613',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <span style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          opacity: 0.7,
        }}>
          Cargando campus ESPOCH…
        </span>
      </div>
    </Html>
  );
}

function CameraTracker({ orbitRef, onSnapshot }) {
  const { camera } = useThree();
  const lastUpdateRef = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();

    // No actualizar cada frame para no causar renders excesivos
    if (now - lastUpdateRef.current < 0.08) return;
    lastUpdateRef.current = now;

    const controls = orbitRef.current;

    onSnapshot?.({
      cameraX: camera.position.x,
      cameraY: camera.position.y,
      cameraZ: camera.position.z,
      targetX: controls?.target?.x ?? 0,
      targetY: controls?.target?.y ?? 0,
      targetZ: controls?.target?.z ?? 0,
    });
  });

  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Scene
───────────────────────────────────────────────────────────────────────────── */

function Scene({
  allModels,
  buildings,
  selectedBuilding,
  onBuildingClick,
  orbitRef,
  cameraCommandRef,
  onCameraSnapshot,
}) {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={CAMERA_INITIAL.fov}
        position={CAMERA_INITIAL.position}
        near={0.5}
        far={5000}
      />

      <Sky
        distance={3000}
        sunPosition={[120, 200, 80]}
        inclination={0.49}
        azimuth={0.25}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
        rayleigh={1}
        turbidity={8}
      />

      <Lighting />

      <OrbitControls
        ref={orbitRef}
        makeDefault
        maxPolarAngle={MAX_POLAR}
        minDistance={20}
        maxDistance={800}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={1.1}
        panSpeed={0.8}
        screenSpacePanning={false}
        target={CAMERA_INITIAL.target}
        onStart={() => {
          cameraCommandRef.current?.cancelAnimation?.();
        }}
      />

      <CameraController
        selectedBuilding={selectedBuilding}
        allModels={allModels}
        orbitRef={orbitRef}
        cameraCommandRef={cameraCommandRef}
      />

      <KeyboardNavigation3D
        orbitRef={orbitRef}
        cameraCommandRef={cameraCommandRef}
      />

      <CameraTracker
        orbitRef={orbitRef}
        onSnapshot={onCameraSnapshot}
      />
    

      <Suspense fallback={<LoadingOverlay />}>
        <CampusBase />
      </Suspense>

      {buildings.map((building) => {
        const model = allModels.find(
          (m) => String(m.building_id) === String(building.id) && m.is_active
        );

        return (
          <BuildingEntry
            key={building.id}
            model={model}
            building={building}
            isSelected={selectedBuilding?.id === building.id}
            onClick={onBuildingClick}
          />
        );
      })}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   WebGLErrorFallback
───────────────────────────────────────────────────────────────────────────── */

function WebGLErrorFallback() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cream, #FDFAF9)',
      gap: '1rem',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h3 style={{
        margin: 0,
        color: 'var(--ink-dark)',
        fontSize: '1.1rem',
        fontWeight: 700,
      }}>
        WebGL no disponible
      </h3>

      <p style={{
        maxWidth: 380,
        margin: 0,
        color: 'var(--ink)',
        fontSize: '0.88rem',
        lineHeight: 1.6,
      }}>
        Tu navegador no puede inicializar el visor 3D. Actualiza Chrome o Firefox para continuar.
      </p>

      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <a
          href="https://www.google.com/chrome"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: 8,
            fontWeight: 600,
            background: '#1967D2',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.85rem',
          }}
        >
          Chrome
        </a>

        <a
          href="https://www.mozilla.org/firefox"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: 8,
            fontWeight: 600,
            background: '#FF7139',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.85rem',
          }}
        >
          Firefox
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ViewerControls3D
───────────────────────────────────────────────────────────────────────────── */

function ViewerControls3D({ isMobile, cameraCommandRef }) {
  const baseButton = {
    width: 36,
    height: 36,
    background: 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    color: '#374151',
    transition: 'background 0.15s, transform 0.15s',
  };

  const hoverIn = (e) => {
    e.currentTarget.style.background = '#f3f4f6';
    e.currentTarget.style.transform = 'translateY(-1px)';
  };

  const hoverOut = (e) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.94)';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  return (
    <div style={{
      position: 'absolute',
      right: isMobile ? 10 : 12,
      top: isMobile ? 58 : 58,
      zIndex: 26,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <button
        title="Vista inicial"
        aria-label="Vista inicial"
        onClick={() => cameraCommandRef.current?.reset?.()}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        style={baseButton}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
        </svg>
      </button>

      <button
        title="Acercar"
        aria-label="Acercar"
        onClick={() => cameraCommandRef.current?.zoomIn?.()}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        style={baseButton}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <button
        title="Alejar"
        aria-label="Alejar"
        onClick={() => cameraCommandRef.current?.zoomOut?.()}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        style={baseButton}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>

      <button
        title="Rotar izquierda"
        aria-label="Rotar izquierda"
        onClick={() => cameraCommandRef.current?.rotateLeft?.()}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        style={baseButton}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 0 1 15.5-6.2" />
          <path d="M18 2v5h-5" />
        </svg>
      </button>

      <button
        title="Rotar derecha"
        aria-label="Rotar derecha"
        onClick={() => cameraCommandRef.current?.rotateRight?.()}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        style={baseButton}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12A9 9 0 0 0 5.5 5.8" />
          <path d="M6 2v5h5" />
        </svg>
      </button>

      <button
        title="Vista superior"
        aria-label="Vista superior"
        onClick={() => cameraCommandRef.current?.top?.()}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        style={baseButton}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 5-8 5-8-5 8-5z" />
          <path d="M4 13l8 5 8-5" />
        </svg>
      </button>


    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MiniMap3D
───────────────────────────────────────────────────────────────────────────── */

function MiniMap3D({
  buildings,
  allModels,
  selectedBuilding,
  onSelectBuilding,
  isMobile,
  visible,
  expanded,
  onToggle,
  onToggleSize,
  cameraSnapshot,
}) {
  const points = useMemo(() => {
    return buildings.map((building) => {
      const model = allModels.find(
        (m) => String(m.building_id) === String(building.id) && m.is_active
      );

      const pos = getModelPosition(model, building);

      return {
        id: building.id,
        name: building.name,
        x: pos.x,
        z: pos.z,
        hasModel: Boolean(model?.file_path),
      };
    });
  }, [buildings, allModels]);

  const bounds = useMemo(() => {
    const xs = points.map((p) => p.x);
    const zs = points.map((p) => p.z);

    if (cameraSnapshot) {
      xs.push(cameraSnapshot.cameraX, cameraSnapshot.targetX);
      zs.push(cameraSnapshot.cameraZ, cameraSnapshot.targetZ);
    }

    if (!xs.length || !zs.length) {
      return {
        minX: -120,
        maxX: 120,
        minZ: -120,
        maxZ: 120,
      };
    }

    const padding = 40;

    return {
      minX: Math.min(...xs, -120) - padding,
      maxX: Math.max(...xs, 120) + padding,
      minZ: Math.min(...zs, -120) - padding,
      maxZ: Math.max(...zs, 120) + padding,
    };
  }, [points, cameraSnapshot]);

  const W = expanded
    ? (isMobile ? 240 : 310)
    : (isMobile ? 148 : 180);

  const H = expanded
    ? (isMobile ? 180 : 230)
    : (isMobile ? 112 : 136);

  const PAD = expanded ? 22 : 16;

  const project = (x, z) => {
    const dx = bounds.maxX - bounds.minX || 1;
    const dz = bounds.maxZ - bounds.minZ || 1;

    return {
      x: PAD + ((x - bounds.minX) / dx) * (W - PAD * 2),
      y: PAD + ((z - bounds.minZ) / dz) * (H - PAD * 2),
    };
  };

  const cameraPoint = cameraSnapshot
    ? project(cameraSnapshot.cameraX, cameraSnapshot.cameraZ)
    : null;

  const targetPoint = cameraSnapshot
    ? project(cameraSnapshot.targetX, cameraSnapshot.targetZ)
    : null;

  return (
    <div style={{
      position: 'absolute',
      right: isMobile ? 10 : 12,
      bottom: isMobile ? 72 : 54,
      zIndex: 30,
    }}>
      {!visible && (
        <button
          onClick={onToggle}
          title="Mostrar minimapa"
          aria-label="Mostrar minimapa"
          style={{
            width: 36,
            height: 36,
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            color: '#374151',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
            <path d="M9 3v15M15 6v15" />
          </svg>
        </button>
      )}

      {visible && (
        <div style={{
          width: W,
          background: 'rgba(255,255,255,.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0,0,0,.12)',
          borderRadius: 12,
          boxShadow: '0 8px 22px rgba(0,0,0,.14)',
          overflow: 'hidden',
          transition: 'width 200ms ease',
        }}>
          <div style={{
            padding: '0.45rem 0.6rem',
            borderBottom: '1px solid rgba(0,0,0,.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <span style={{
              fontSize: '0.64rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 800,
              color: '#6b7280',
            }}>
              Mini mapa
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <button
                onClick={onToggleSize}
                title={expanded ? 'Reducir minimapa' : 'Agrandar minimapa'}
                aria-label={expanded ? 'Reducir minimapa' : 'Agrandar minimapa'}
                style={{
                  width: 22,
                  height: 22,
                  border: 'none',
                  background: 'rgba(15,23,42,.07)',
                  color: '#374151',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {expanded ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
                  </svg>
                )}
              </button>

              <button
                onClick={onToggle}
                title="Ocultar minimapa"
                aria-label="Ocultar minimapa"
                style={{
                  width: 22,
                  height: 22,
                  border: 'none',
                  background: 'rgba(188,6,19,.08)',
                  color: '#BC0613',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            style={{
              display: 'block',
              background: 'linear-gradient(180deg, rgba(248,250,252,.96), rgba(241,245,249,.96))',
            }}
          >
            <defs>
              <pattern id="mini-grid-3d-follow" width="18" height="18" patternUnits="userSpaceOnUse">
                <path
                  d="M 18 0 L 0 0 0 18"
                  fill="none"
                  stroke="rgba(15,23,42,.08)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            <rect x="0" y="0" width={W} height={H} fill="url(#mini-grid-3d-follow)" />

            <path
              d={`M ${PAD} ${H / 2} C ${W * 0.36} ${H * 0.42}, ${W * 0.58} ${H * 0.60}, ${W - PAD} ${H * 0.46}`}
              fill="none"
              stroke="rgba(100,116,139,.28)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {targetPoint && (
              <circle
                cx={targetPoint.x}
                cy={targetPoint.y}
                r={expanded ? 5 : 4}
                fill="#2563eb"
                opacity="0.85"
              />
            )}

            {cameraPoint && targetPoint && (
              <line
                x1={cameraPoint.x}
                y1={cameraPoint.y}
                x2={targetPoint.x}
                y2={targetPoint.y}
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.65"
              />
            )}

            {cameraPoint && (
              <g>
                <circle
                  cx={cameraPoint.x}
                  cy={cameraPoint.y}
                  r={expanded ? 7 : 6}
                  fill="#111827"
                  stroke="#fff"
                  strokeWidth="2"
                />
                <path
                  d={`M ${cameraPoint.x} ${cameraPoint.y - 10} L ${cameraPoint.x - 5} ${cameraPoint.y + 4} L ${cameraPoint.x + 5} ${cameraPoint.y + 4} Z`}
                  fill="#111827"
                  opacity="0.9"
                />
              </g>
            )}

            {points.map((point) => {
              const p = project(point.x, point.z);
              const selected = String(selectedBuilding?.id) === String(point.id);

              return (
                <g
                  key={point.id}
                  onClick={() => onSelectBuilding?.(point.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={selected ? 7 : 5}
                    fill={selected ? '#BC0613' : point.hasModel ? '#334155' : '#94a3b8'}
                    stroke="#fff"
                    strokeWidth="2"
                  />

                  {selected && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={11}
                      fill="none"
                      stroke="#BC0613"
                      strokeWidth="1.5"
                      opacity="0.35"
                    />
                  )}
                </g>
              );
            })}

            <text
              x={W - PAD}
              y={H - 8}
              textAnchor="end"
              fontSize="9"
              fontWeight="700"
              fill="rgba(100,116,139,.65)"
            >
              ESPOCH
            </text>
          </svg>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.35rem 0.55rem',
            borderTop: '1px solid rgba(0,0,0,.08)',
            fontSize: '0.58rem',
            color: '#64748b',
            fontWeight: 700,
          }}>
            <span>Cámara</span>
            <span style={{ color: '#2563eb' }}>Objetivo</span>
            <span style={{ color: '#BC0613' }}>Edificio</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BuildingBadge
───────────────────────────────────────────────────────────────────────────── */

function BuildingBadge({ building, hasModel, isMobile }) {
  const baseStyle = {
    position: 'absolute',
    bottom: isMobile ? 18 : 48,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 24,
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 999,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    whiteSpace: 'nowrap',
  };

  if (!building) {
    return (
      <div style={{
        ...baseStyle,
        padding: '0.5rem 1.2rem',
        color: '#6b7280',
        fontSize: isMobile ? '0.72rem' : '0.78rem',
      }}>
        Haz clic en un edificio para explorarlo
      </div>
    );
  }

  return (
    <div style={{
      ...baseStyle,
      padding: '0.4rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: isMobile ? '0.7rem' : '0.75rem',
      fontWeight: 700,
      color: '#111827',
    }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#BC0613',
        flexShrink: 0,
      }} />

      {building.name}

      {hasModel ? (
        <span style={{
          color: '#16a34a',
          fontWeight: 400,
          fontSize: '0.68rem',
        }}>
          · modelo 3D
        </span>
      ) : (
        <span style={{
          color: '#d97706',
          fontWeight: 400,
          fontSize: '0.68rem',
        }}>
          · demo
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   StatusPill3D
───────────────────────────────────────────────────────────────────────────── */

function StatusPill3D({ isMobile }) {
  if (isMobile) return null;

  return (
    <div style={{
      position: 'absolute',
      right: 12,
      bottom: 12,
      zIndex: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0.42rem 0.7rem',
      background: 'rgba(255,255,255,.9)',
      border: '1px solid rgba(0,0,0,.12)',
      borderRadius: 999,
      boxShadow: '0 2px 8px rgba(0,0,0,.12)',
      color: '#6b7280',
      fontSize: '0.68rem',
      fontWeight: 700,
      backdropFilter: 'blur(8px)',
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: '#22c55e',
      }} />

      Visor Three.js activo
    </div>
  );
}

function ControlsHelpButton({ isMobile, onClick, miniMapVisible, miniMapExpanded }) {
  const miniMapHeight = miniMapExpanded
    ? (isMobile ? 180 : 230)
    : (isMobile ? 112 : 136);

  const bottomOffset = miniMapVisible
    ? miniMapHeight + (isMobile ? 86 : 70)
    : (isMobile ? 18 : 95);
    
  return (
    <button
      onClick={onClick}
      title="Mostrar controles"
      aria-label="Mostrar controles"
      style={{
        position: 'absolute',
        right: isMobile ? 10 : 14,
        bottom: isMobile ? 18 : 95,
        zIndex: 25,
        width: 36,
        height: 36,
        padding: 0,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 8,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        color: '#374151',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 7h16v10H4z" />
        <path d="M8 11h.01M12 11h.01M16 11h.01" />
        <path d="M8 15h8" />
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CampusViewer3D
───────────────────────────────────────────────────────────────────────────── */

export default function CampusViewer3D({
  allModels = [],
  buildings = [],
  building,
  onBuildingClick,
  isMobile = false,
}) {
  const [webglError, setWebglError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(
    () => sessionStorage.getItem('fie-3d-overlay-dismissed') !== '1'
  );
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [miniMapExpanded, setMiniMapExpanded] = useState(false);
  const [cameraSnapshot, setCameraSnapshot] = useState(null);
  const orbitRef = useRef(null);
  const cameraCommandRef = useRef(null);

  const { setModelLoading, setModelProgress } = useViewerStore();

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      if (!gl) setWebglError(true);
    } catch {
      setWebglError(true);
    }
  }, []);

  useEffect(() => {
    setModelLoading(true);
    setModelProgress(0);

    const timer = window.setTimeout(() => {
      setModelProgress(100);
      setModelLoading(false);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [setModelLoading, setModelProgress]);

  const handleBuildingClick = useCallback((buildingId) => {
    const found = buildings.find((b) => String(b.id) === String(buildingId));
    if (found) onBuildingClick?.(found);
  }, [buildings, onBuildingClick]);

  const selectedHasModel = useMemo(() => {
    return allModels.some(
      (m) => String(m.building_id) === String(building?.id) && m.is_active
    );
  }, [allModels, building?.id]);

  if (webglError) return <WebGLErrorFallback />;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: '#a8c8e8',
    }}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        style={{
          width: '100%',
          height: '100%',
          background: '#a8c8e8',
        }}
      >
        <Scene
          allModels={allModels}
          buildings={buildings}
          selectedBuilding={building}
          onBuildingClick={handleBuildingClick}
          orbitRef={orbitRef}
          cameraCommandRef={cameraCommandRef}
          onCameraSnapshot={setCameraSnapshot}
        />
      </Canvas>

      {showOverlay && (
        <ControlsOverlay
          isMobile={isMobile}
          onDismiss={() => {
            setShowOverlay(false);
            sessionStorage.setItem('fie-3d-overlay-dismissed', '1');
          }}
        />
      )}

      <ControlsHelpButton
        isMobile={isMobile}
        onClick={() => setShowOverlay(true)}
      />

      <ViewerControls3D
        isMobile={isMobile}
        cameraCommandRef={cameraCommandRef}
      />

      <MiniMap3D
        buildings={buildings}
        allModels={allModels}
        selectedBuilding={building}
        onSelectBuilding={handleBuildingClick}
        isMobile={isMobile}
        visible={showMiniMap}
        expanded={miniMapExpanded}
        cameraSnapshot={cameraSnapshot}
        onToggle={() => setShowMiniMap((v) => !v)}
        onToggleSize={() => setMiniMapExpanded((v) => !v)}
      />

      <BuildingBadge
        building={building}
        hasModel={selectedHasModel}
        isMobile={isMobile}
      />

      <StatusPill3D isMobile={isMobile} />
    </div>
  );
}