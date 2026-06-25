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
  Html,
  PerspectiveCamera,
} from '@react-three/drei';

import * as THREE from 'three';
import { useViewerStore } from '../../store/viewerStore';
import ControlsOverlay from './ControlsOverlay';
import KeyboardNavigation3D from './KeyboardNavigation3D';
import MiniMap3D from '../minimap/MiniMap';
import {
  toRad,
  getModelPosition,
  getModelScale,
  getModelRotation,
  findBuildingModel,
  getFocusKey,
} from '../../utils/viewer3DHelpers';
import MouseNavigation3D from './MouseNavigation3D';
import MapPin from './MapPin';

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
  position: [0, 320, 180],
  target: [0, 0, 0],
};

const MAX_POLAR = Math.PI / 2.1;

// Optimización: carga de modelos por proximidad a la cámara
const LOAD_RADIUS   = 80;  // metros — distancia a la que el GLB se carga
const UNLOAD_RADIUS = 110; // metros — distancia a la que se descarga (histéresis)
const PROXIMITY_CHECK_INTERVAL = 0.4; // segundos entre chequeos


/* ─────────────────────────────────────────────────────────────────────────────
   CampusBase
───────────────────────────────────────────────────────────────────────────── */

function CampusBase() {
  const { scene } = useGLTF(CAMPUS_URL);

  useMemo(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      // El terreno/campus base solo recibe sombra del sol; no proyecta sombra propia.
      obj.receiveShadow = true;
      obj.castShadow = false;
    });
  }, [scene]);

  return <primitive object={scene} position={[0, 0, 0]} />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ProximityGate — monta/desmonta el GLB de un edificio según distancia a cámara
───────────────────────────────────────────────────────────────────────────── */

function ProximityGate({ position, forceLoad, children, fallback }) {
  const { camera, invalidate } = useThree();
  const [inRange, setInRange] = useState(forceLoad);
  const elapsedRef = useRef(0);
  const posVec = useRef(new THREE.Vector3(...position));

  useEffect(() => {
    posVec.current.set(position[0], position[1], position[2]);
  }, [position]);

  useFrame((_, delta) => {
    if (forceLoad) {
      if (!inRange) { setInRange(true); invalidate(); }
      return;
    }

    elapsedRef.current += delta;
    if (elapsedRef.current < PROXIMITY_CHECK_INTERVAL) return;
    elapsedRef.current = 0;

    const dist = camera.position.distanceTo(posVec.current);

    if (!inRange && dist < LOAD_RADIUS) { setInRange(true); invalidate(); }
    else if (inRange && dist > UNLOAD_RADIUS) { setInRange(false); invalidate(); }
  });

  return inRange ? children : fallback;
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
  onMeshClick,
  interiorMode = false,
}) {
  const { scene } = useGLTF(url);

  // Liberar memoria al desmontar: dispose de geometrías/texturas/materiales
  // y limpiar el caché de drei para esta URL.
  useEffect(() => {
    return () => {
      scene.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((mat) => {
          if (!mat) return;
          Object.values(mat).forEach((value) => {
            if (value?.isTexture) value.dispose();
          });
          mat.dispose?.();
        });
      });
      useGLTF.clear(url);
    };
  }, [url, scene]);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((obj) => {
      if (!obj.isMesh) return;

      // Optimización: sombras dinámicas solo en modo interior, donde el
      // usuario está cerca y la diferencia visual se nota. En exterior
      // se desactivan para reducir el costo cuando hay varios edificios
      // visibles simultáneamente.
      obj.castShadow    = interiorMode;
      obj.receiveShadow = interiorMode;

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
  }, [scene, isSelected, interiorMode]);

  return (
    <group
      position={[offsetX, offsetY, offsetZ]}
      rotation={[toRad(rotateX), toRad(rotateY), toRad(rotateZ)]}
      scale={[scaleX, scaleY, scaleZ]}
      onClick={(e) => {
        e.stopPropagation();
        if (interiorMode && onMeshClick && e.object?.name) {
          onMeshClick(e.object.name);
        } else {
          onClick?.(buildingId);
        }
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
      <mesh receiveShadow>
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

function BuildingEntry({ model, building, isSelected, onClick, onMeshClick, interiorMode, proximityEnabled = true }) {
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

  // El edificio seleccionado o en modo interior siempre debe estar cargado,
  // sin importar la distancia de la cámara. Si la optimización por
  // proximidad está desactivada, todo carga siempre (comportamiento clásico).
  const forceLoad = !proximityEnabled || isSelected || interiorMode;

  const fallback = (
    <BuildingFallback
      offsetX={pos.x}
      offsetY={pos.y}
      offsetZ={pos.z}
      buildingId={building?.id}
      isSelected={isSelected}
      onClick={onClick}
    />
  );

  return (
    <ProximityGate position={[pos.x, pos.y, pos.z]} forceLoad={forceLoad} fallback={fallback}>
      <Suspense fallback={fallback}>
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
          onMeshClick={onMeshClick}
          interiorMode={interiorMode}
        />
      </Suspense>
    </ProximityGate>
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
  onCameraCommandReady,
  interiorMode,
}) {
  const { camera, invalidate } = useThree();

  const targetRef = useRef(new THREE.Vector3(...CAMERA_INITIAL.target));
  const cameraTargetRef = useRef(new THREE.Vector3(...CAMERA_INITIAL.position));
  const animatingRef = useRef(false);
  const targetQuatRef = useRef(null); // null = no animar quaternion
  const lastFocusKeyRef = useRef(null);

  // Refs para que top() lea siempre el valor actual sin depender del useEffect
  const selectedBuildingRef = useRef(selectedBuilding);
  const allModelsRef = useRef(allModels);
  useEffect(() => { selectedBuildingRef.current = selectedBuilding; }, [selectedBuilding]);
  useEffect(() => { allModelsRef.current = allModels; }, [allModels]);

  const moveTo = useCallback((position, target, quaternion = null) => {
    cameraTargetRef.current.set(position[0], position[1], position[2]);
    targetRef.current.set(target[0], target[1], target[2]);
    targetQuatRef.current = quaternion ? quaternion.clone() : null;
    animatingRef.current = true;
    invalidate(); // frameloop="demand": forzar el primer frame de la animación
  }, [invalidate]);

  const cancelAnimation = useCallback(() => {
    animatingRef.current = false;

    const controls = orbitRef.current;
    if (controls) {
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0;
      controls.enableDamping = !interiorMode;
      controls.enabled = !interiorMode;
    }
  }, [orbitRef, interiorMode]);

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
      moveTo,

      reset() {
        lastFocusKeyRef.current = null;
        moveTo(CAMERA_INITIAL.position, CAMERA_INITIAL.target);
      },

      top() {
        const controls = orbitRef.current;

        if (controls) {
          controls.autoRotate = false;
          controls.autoRotateSpeed = 0;
          controls.enableDamping = true;
        }

        // Leer siempre el valor actual via ref (evita closure stale del useEffect)
        const currentBuilding = selectedBuildingRef.current;
        const currentModels   = allModelsRef.current;

        if (currentBuilding) {
          const model = findBuildingModel(currentModels, currentBuilding);
          const pos   = getModelPosition(model, currentBuilding);

          // Altura proporcional al edificio: 120m da una vista aérea clara
          moveTo(
            [pos.x, pos.y + 120, pos.z + 0.01],
            [pos.x, pos.y, pos.z]
          );
        } else {
          moveTo(CAMERA_TOP.position, CAMERA_TOP.target);

          window.setTimeout(() => {
            const currentControls = orbitRef.current;
            if (!currentControls) return;

            currentControls.autoRotate = true;
            currentControls.autoRotateSpeed = 0.8;
            invalidate();
          }, 900);
        }
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
    onCameraCommandReady?.(cameraCommandRef.current);
  }, [
    camera,
    orbitRef,
    cameraCommandRef,
    moveTo,
    focusBuilding,
    cancelAnimation,
    interiorMode,
    invalidate,
  ]);

  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) return;

    if (interiorMode) {
      controls.enabled = false;
      controls.enableDamping = false;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0;
      return;
    }

    controls.enabled = true;
    controls.enableDamping = true;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;
    controls.update();
  }, [interiorMode, orbitRef]);


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

    const hasQuaternionTarget = !!targetQuatRef.current;

    // En modo interior, OrbitControls no debe tocar la cámara.
    // Se mantiene deshabilitado durante toda la estancia interior.
    if (interiorMode) {
      controls.enabled = false;
      controls.enableDamping = false;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0;
    } else {
      controls.enabled = true;
    }

    camera.position.lerp(cameraTargetRef.current, 0.07);

    if (!interiorMode) {
      controls.target.lerp(targetRef.current, 0.07);
    }

    if (hasQuaternionTarget) {
      camera.quaternion.slerp(targetQuatRef.current, 0.07);
    } else {
      camera.lookAt(targetRef.current);
    }

    camera.updateMatrixWorld(true);

    // Solo actualizar OrbitControls cuando no estamos en interior.
    // En interior, update() puede sobrescribir la rotación exacta de Blender.
    if (!interiorMode) {
      controls.update();
    }

    const cameraDone = camera.position.distanceTo(cameraTargetRef.current) < 0.5;
    const targetDone = interiorMode
      ? true
      : controls.target.distanceTo(targetRef.current) < 0.2;

    if (cameraDone && targetDone) {
      camera.position.copy(cameraTargetRef.current);

      if (hasQuaternionTarget) {
        camera.quaternion.copy(targetQuatRef.current);
        targetQuatRef.current = null;
      } else {
        camera.lookAt(targetRef.current);
      }

      camera.updateMatrixWorld(true);

      if (!interiorMode) {
        controls.target.copy(targetRef.current);
        controls.enabled = true;
        controls.enableDamping = true;
        controls.update();
      } else {
        controls.enabled = false;
        controls.enableDamping = false;
      }

      animatingRef.current = false;
    } else {
      // Animación en curso: pedir el siguiente frame bajo frameloop="demand"
      invalidate();
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
        position={[1600, 2200, -1800]}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-near={0.5}
        shadow-camera-far={1500}
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


function InteriorMouseNavigation({ active, isMobile = false }) {
  const { camera, gl, invalidate } = useThree();

  const draggingRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  const syncRotationFromCamera = useCallback(() => {
    const euler = new THREE.Euler().setFromQuaternion(
      camera.quaternion,
      'YXZ'
    );

    yawRef.current = euler.y;
    pitchRef.current = THREE.MathUtils.clamp(
      euler.x,
      -Math.PI / 2 + 0.05,
      Math.PI / 2 - 0.05
    );
  }, [camera]);

  useEffect(() => {
    if (!active) return;

    syncRotationFromCamera();
  }, [active, syncRotationFromCamera]);

  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;
    const previousCursor = canvas.style.cursor;
    const previousTouchAction = canvas.style.touchAction;
    const previousUserSelect = canvas.style.userSelect;

    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';

    const applyRotation = () => {
      camera.rotation.order = 'YXZ';
      camera.rotation.set(
        pitchRef.current,
        yawRef.current,
        0
      );
      camera.updateMatrixWorld(true);
      invalidate(); // frameloop="demand": la rotación manual necesita render
    };

    const handlePointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      draggingRef.current = true;
      activePointerIdRef.current = event.pointerId;
      canvas.style.cursor = 'grabbing';
      syncRotationFromCamera();

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Algunos navegadores móviles pueden no permitir capture aquí.
      }

      event.preventDefault();
    };

    const handlePointerMove = (event) => {
      if (!draggingRef.current) return;

      if (
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      const sensitivity = isMobile ? 0.003 : 0.0022;

      yawRef.current -= event.movementX * sensitivity;
      pitchRef.current -= event.movementY * sensitivity;

      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05
      );

      applyRotation();
      event.preventDefault();
    };

    const stopDragging = (event) => {
      if (
        event?.pointerId &&
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      draggingRef.current = false;
      activePointerIdRef.current = null;
      canvas.style.cursor = 'grab';

      if (event?.pointerId) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Sin acción.
        }
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', stopDragging);
    canvas.addEventListener('pointercancel', stopDragging);
    canvas.addEventListener('lostpointercapture', stopDragging);

    return () => {
      draggingRef.current = false;
      activePointerIdRef.current = null;

      canvas.style.cursor = previousCursor;
      canvas.style.touchAction = previousTouchAction;
      canvas.style.userSelect = previousUserSelect;

      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', stopDragging);
      canvas.removeEventListener('pointercancel', stopDragging);
      canvas.removeEventListener('lostpointercapture', stopDragging);
    };
  }, [
    active,
    camera,
    gl,
    isMobile,
    syncRotationFromCamera,
    invalidate,
  ]);

  return null;
}

function CameraTracker({ orbitRef, onSnapshot }) {
  const { camera } = useThree();
  const lastUpdateRef = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();

    // No actualizar cada frame para no causar renders excesivos
    if (now - lastUpdateRef.current < 0.2) return;
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
  onMeshClick,
  interiorMode,
  proximityEnabled,
  orbitRef,
  cameraCommandRef,
  onCameraSnapshot,
  onBoundsWarning,
  onSceneReady,
  onCameraCommandReady,
  isMobile,
}) {
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const { scene } = useThree();

  useEffect(() => {
    onSceneReady?.(scene);
  }, [scene, onSceneReady]);

  return (
    <>
      <color attach="background" args={['#6BB7E8']} />

      <PerspectiveCamera
        makeDefault
        fov={CAMERA_INITIAL.fov}
        position={CAMERA_INITIAL.position}
        near={0.5}
        far={1500}
      />

      <Lighting />

      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={!interiorMode}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={20}
        maxDistance={700}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={1.1}
        panSpeed={0.8}
        enablePan
        screenSpacePanning={false}
        target={CAMERA_INITIAL.target}
        autoRotate={false}
        autoRotateSpeed={0.8}
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
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

      <CameraController
        selectedBuilding={selectedBuilding}
        allModels={allModels}
        orbitRef={orbitRef}
        cameraCommandRef={cameraCommandRef}
        onCameraCommandReady={onCameraCommandReady}
        interiorMode={interiorMode}
      />

      {!interiorMode && (
        <KeyboardNavigation3D
          orbitRef={orbitRef}
          cameraCommandRef={cameraCommandRef}
          onBoundsWarning={onBoundsWarning}
        />
      )}

      <CameraTracker
        orbitRef={orbitRef}
        onSnapshot={onCameraSnapshot}
      />

      <InteriorMouseNavigation active={interiorMode} isMobile={isMobile} />

      <Suspense fallback={<LoadingOverlay />}>
        <CampusBase />
      </Suspense>

      {buildings.map((building) => {
        const model = allModels.find(
          (m) => String(m.building_id) === String(building.id) && m.is_active
        );

        const activeFocusId = hoveredPinId ?? selectedBuilding?.id ?? null;

        const isDimmed =
          activeFocusId !== null &&
          String(activeFocusId) !== String(building.id);

        return (
          <React.Fragment key={building.id}>
            <BuildingEntry
              model={model}
              building={building}
              isSelected={selectedBuilding?.id === building.id}
              onClick={onBuildingClick}
              onMeshClick={onMeshClick}
              interiorMode={interiorMode && selectedBuilding?.id === building.id}
              proximityEnabled={proximityEnabled}
            />

            {!interiorMode && (
              <MapPin
                building={building}
                isSelected={selectedBuilding?.id === building.id}
                isDimmed={isDimmed}
                onHoverChange={setHoveredPinId}
                onClick={onBuildingClick}
              />
            )}
          </React.Fragment>
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

function ViewerControls3D({ isMobile, cameraCommandRef, proximityEnabled, onToggleProximity }) {
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

      <button
        title={proximityEnabled ? 'Desactivar carga por proximidad' : 'Activar carga por proximidad'}
        aria-label="Carga por proximidad"
        aria-pressed={proximityEnabled}
        onClick={onToggleProximity}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        style={{
          ...baseButton,
          color: proximityEnabled ? '#16a34a' : '#9ca3af',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          {!proximityEnabled && <line x1="3" y1="21" x2="21" y2="3" />}
        </svg>
      </button>

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
   ChangeBuildingFloatingButton
───────────────────────────────────────────────────────────────────────────── */

function ChangeBuildingFloatingButton({ building, isMobile, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Cambiar edificio"
      aria-label="Cambiar edificio"
      style={{
        position: 'absolute',
        bottom: isMobile ? 18 : 48,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 24,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: isMobile ? '0.48rem 0.85rem' : '0.55rem 1rem',
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(188,6,19,0.18)',
        borderRadius: 999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        color: '#BC0613',
        fontSize: isMobile ? '0.72rem' : '0.78rem',
        fontWeight: 800,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21h18" />
        <path d="M3 7l9-4 9 4" />
        <path d="M4 7v14" />
        <path d="M20 7v14" />
        <path d="M9 21v-8h6v8" />
      </svg>

      {building ? 'Cambiar edificio' : 'Seleccionar edificio'}
    </button>
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

function ControlsHelpButton({ isMobile, onClick, active = false }) {
  return (
    <button
      onClick={onClick}
      title="Mostrar controles"
      aria-label="Mostrar controles"
      style={{
        position: 'absolute',
        right: isMobile ? 14 : 14,
        bottom: isMobile ? 95 : 95,
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
        color: active ? '#BC0613' : '#374151',
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
  onMeshClick,
  onInteriorModeChange,
  onSceneReady,
  onCameraCommandReady,
  isMobile = false,
  sidebarOpen = true,
  onRequestChangeBuilding,
}) {
  const [webglError, setWebglError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [miniMapExpanded, setMiniMapExpanded] = useState(false);
  const [cameraSnapshot, setCameraSnapshot] = useState(null);
  const [interiorMode, setInteriorMode] = useState(false);
  const [proximityEnabled, setProximityEnabled] = useState(true); // carga por radio (optimización)
  const orbitRef = useRef(null);
  const cameraCommandRef = useRef(null);
  const sceneRef = useRef(null);  // ref para acceder a la escena Three.js
  const [boundsWarning, setBoundsWarning] = useState(false);
  const boundsWarningTimerRef = useRef(null);

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

  // Reset interior mode when building changes
  useEffect(() => { setInteriorMode(false); }, [building?.id]);

  const toggleInteriorMode = useCallback(() => {
    if (!building) return;

    const entering = !interiorMode;
    setInteriorMode(entering);
    onInteriorModeChange?.(entering);

    const cmd = cameraCommandRef.current;

    if (entering) {
      // Buscar cámara marcadora en la escena Three.js (exportada desde Blender)
      const markerCam = sceneRef.current?.getObjectByName('Cam_Interior_FIE_CentroBajo');

      if (markerCam) {
        const worldPos  = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        markerCam.getWorldPosition(worldPos);
        markerCam.getWorldQuaternion(worldQuat);

        // Target: 1 m delante de la cámara marcadora según su orientación
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat);
        const lookTarget = worldPos.clone().add(forward);

        cmd?.moveTo?.(worldPos.toArray(), lookTarget.toArray(), worldQuat);
      } else {
        // Fallback a coordenadas de BD si el GLB no tiene cámara marcadora
        const ox = parseFloat(building.offset_x)          || 0;
        const oz = parseFloat(building.offset_z)          || 0;
        const cx = parseFloat(building.interior_cam_x)    || 0;
        const cy = parseFloat(building.interior_cam_y)    || 8;
        const cz = parseFloat(building.interior_cam_z)    || 15;
        const tx = parseFloat(building.interior_target_x) || 0;
        const ty = parseFloat(building.interior_target_y) || 2;
        const tz = parseFloat(building.interior_target_z) || 0;
        cmd?.moveTo?.([ox + cx, cy, oz + cz], [ox + tx, ty, oz + tz]);
      }

      // Ocultar grupo exterior cuando la cámara haya llegado (~800 ms)
      const groupName = building.exterior_group_name || 'Exterior';
      setTimeout(() => {
        sceneRef.current?.traverse(obj => {
          if (obj.name === groupName || obj.parent?.name === groupName) {
            obj.visible = false;
          }
        });
      }, 800);

    } else {
      // Salir: mostrar inmediatamente y volver al foco del edificio
      const groupName = building.exterior_group_name || 'Exterior';
      sceneRef.current?.traverse(obj => {
        if (obj.name === groupName || obj.parent?.name === groupName) {
          obj.visible = true;
        }
      });
      cmd?.focusBuilding?.(building);
    }
  }, [interiorMode, building]);

  const handleBuildingClick = useCallback((buildingOrId) => {
    if (typeof buildingOrId === 'object' && buildingOrId !== null) {
      onBuildingClick?.(buildingOrId);
      return;
    }

    const found = buildings.find((b) => String(b.id) === String(buildingOrId));
    if (found) onBuildingClick?.(found);
  }, [buildings, onBuildingClick]);

  const showBoundsWarning = useCallback(() => {
    setBoundsWarning(true);

    if (boundsWarningTimerRef.current) {
      window.clearTimeout(boundsWarningTimerRef.current);
    }

    boundsWarningTimerRef.current = window.setTimeout(() => {
      setBoundsWarning(false);
    }, 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (boundsWarningTimerRef.current) {
        window.clearTimeout(boundsWarningTimerRef.current);
      }
    };
  }, []);

  const selectedHasModel = useMemo(() => {
    return allModels.some(
      (m) => String(m.building_id) === String(building?.id) && m.is_active
    );
  }, [allModels, building?.id]);

  if (webglError) return <WebGLErrorFallback />;

  const toggleControlsOverlay = useCallback(() => {
    setShowOverlay((prev) => {
      const next = !prev;
      if (next) {
        setShowMiniMap(false);
      }
      return next;
    });
  }, []);

  const toggleMiniMap = useCallback(() => {
    setShowMiniMap((prev) => {
      const next = !prev;
      if (next) {
        setShowOverlay(false);
      }
      return next;
    });
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#7DB9E8',
    }}>
      <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      style={{
        width: '100%',
        height: '100%',
        background: '#7DB9E8',
      }}
    >
        <Scene
          allModels={allModels}
          buildings={buildings}
          selectedBuilding={building}
          onBuildingClick={handleBuildingClick}
          onMeshClick={onMeshClick}
          interiorMode={interiorMode}
          proximityEnabled={proximityEnabled}
          orbitRef={orbitRef}
          cameraCommandRef={cameraCommandRef}
          onCameraSnapshot={setCameraSnapshot}
          onBoundsWarning={showBoundsWarning}
          onSceneReady={s => {
            sceneRef.current = s;
            onSceneReady?.(s);
          }}
          onCameraCommandReady={onCameraCommandReady}
          isMobile={isMobile}
        />
      </Canvas>

      {boundsWarning && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: isMobile ? 72 : 18,
          transform: 'translateX(-50%)',
          zIndex: 40,
          padding: '0.55rem 0.85rem',
          background: 'rgba(17,24,39,.88)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,.14)',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.22)',
          backdropFilter: 'blur(8px)',
          fontSize: isMobile ? '0.7rem' : '0.76rem',
          fontWeight: 700,
          pointerEvents: 'none',
          animation: 'boundsWarningIn .18s ease',
        }}>
          Estás saliendo de la zona permitida
        </div>
      )}

      {showOverlay && (
        <ControlsOverlay
          isMobile={isMobile}
          onDismiss={() => setShowOverlay(false)}
        />
      )}

      <ControlsHelpButton
        isMobile={isMobile}
        onClick={toggleControlsOverlay}
        active={showOverlay}
      />

      {!interiorMode && (
        <ViewerControls3D
          isMobile={isMobile}
          cameraCommandRef={cameraCommandRef}
          proximityEnabled={proximityEnabled}
          onToggleProximity={() => setProximityEnabled(p => !p)}
        />
      )}

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

      {sidebarOpen ? (
        <BuildingBadge
          building={building}
          hasModel={selectedHasModel}
          isMobile={isMobile}
        />
      ) : (
        <ChangeBuildingFloatingButton
          building={building}
          isMobile={isMobile}
          onClick={onRequestChangeBuilding}
        />
      )}

      {/* ── Botón Modo Interior ─────────────────────────── */}
      {building?.has_interior && (
        <button
          onClick={toggleInteriorMode}
          title={interiorMode ? 'Ver exterior' : 'Ver interior'}
          style={{
            position: 'absolute',
            top: isMobile ? 56 : 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 26,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '0.52rem 1.1rem',
            background: interiorMode ? '#BC0613' : 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(8px)',
            border: interiorMode ? '1.5px solid #a50f09' : '1.5px solid rgba(188,6,19,0.28)',
            borderRadius: 999,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            color: interiorMode ? '#fff' : '#BC0613',
            fontSize: isMobile ? '0.72rem' : '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-body, system-ui)',
            transition: 'background 0.25s, color 0.25s, border-color 0.25s',
            whiteSpace: 'nowrap',
          }}
        >
          {interiorMode ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
              </svg>
              Ver exterior
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
              </svg>
              Ver interior
            </>
          )}
        </button>
      )}

      {interiorMode && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: isMobile ? 18 : 48,
          transform: 'translateX(-50%)',
          zIndex: 25,
          padding: '0.42rem 0.75rem',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          color: '#374151',
          fontSize: isMobile ? '0.68rem' : '0.72rem',
          fontWeight: 700,
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
        }}>
          {isMobile ? 'Arrastra sobre la pantalla para mirar alrededor' : 'Arrastra con clic izquierdo para mirar alrededor'}
        </div>
      )}

      <StatusPill3D isMobile={isMobile} />

      <style>{`
        @keyframes boundsWarningIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}