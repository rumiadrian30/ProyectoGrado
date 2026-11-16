/**
 * BuildingEntry.jsx — GeoESPOCH 3D
 * ─────────────────────────────────────────────────────────────────────────────
 * Un edificio del campus:
 *   - BuildingModel: el GLB real (texturas con anisotropía, sombras según
 *     calidad, resaltado por selección/hover, informe de bounds para encuadrar
 *     la cámara). Los clics en exterior se resuelven contra un volumen proxy
 *     invisible (raycast barato) y no contra los cientos de miles de
 *     triángulos del modelo; en modo interior se raycastean las mallas reales
 *     para poder identificar hotspots por nombre de malla.
 *   - BuildingFallback: volumen de reserva (edificios sin modelo) o "fantasma"
 *     mientras el GLB se descarga.
 *   - ProximityGate: monta/desmonta el GLB según la distancia a la cámara.
 *   - ModelErrorBoundary: un GLB corrupto no tumba todo el visor.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, {
  Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { BRAND, PROXIMITY } from './constants';
import { toRad, getModelPosition, getModelScale, getModelRotation } from '../../../utils/viewer3DHelpers';

/* ─── Gestión de instancias por URL ─────────────────────────────────────────
   drei cachea un único `scene` por URL. Si dos edificios usaran el mismo GLB,
   el segundo recibe un clon; al liberar al último usuario se descartan los
   recursos de GPU y la caché. */
const sceneUsers = new Map();

function acquireScene(url, scene) {
  const entry = sceneUsers.get(url) || { users: 0 };
  entry.users += 1;
  sceneUsers.set(url, entry);
  return entry.users === 1 ? scene : scene.clone(true);
}

function releaseScene(url, scene) {
  const entry = sceneUsers.get(url);
  if (!entry) return;
  entry.users -= 1;
  if (entry.users > 0) return;

  sceneUsers.delete(url);
  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.geometry?.dispose?.();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m) return;
      Object.values(m).forEach((v) => { if (v?.isTexture) v.dispose(); });
      m.dispose?.();
    });
  });
  useGLTF.clear(url);
}

const noRaycast = () => null;
const meshRaycast = THREE.Mesh.prototype.raycast;

function forEachMaterial(object, fn) {
  object.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => { if (m) fn(m, obj); });
  });
}

/* ─── BuildingModel ─────────────────────────────────────────────────────── */

function BuildingModel({
  url, pos, rot, scl, buildingId,
  isSelected, isHovered, interiorMode, quality,
  onClick, onDoubleClick, onMeshClick, onHover, onBounds,
}) {
  const { scene } = useGLTF(url);
  const { invalidate } = useThree();
  const groupRef = useRef(null);

  const object = useMemo(() => acquireScene(url, scene), [url, scene]);
  useEffect(() => () => releaseScene(url, object), [url, object]);

  // Caja local del modelo (sin la transformación del grupo) → proxy de raycast
  const localBox = useMemo(() => {
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    return box.isEmpty() ? new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 10, 5)) : box;
  }, [object]);

  const proxy = useMemo(() => {
    const size   = localBox.getSize(new THREE.Vector3());
    const center = localBox.getCenter(new THREE.Vector3());
    return { size: [size.x, size.y, size.z], center: [center.x, center.y, center.z] };
  }, [localBox]);

  // Preparación de materiales (una vez por objeto / calidad)
  useLayoutEffect(() => {
    object.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow    = quality.shadows;
      obj.receiveShadow = quality.shadows;
    });

    forEachMaterial(object, (m) => {
      if (!m.userData.__origEmissive && m.emissive) {
        m.userData.__origEmissive          = m.emissive.clone();
        m.userData.__origEmissiveIntensity = m.emissiveIntensity ?? 0;
      }
      ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach((key) => {
        const tex = m[key];
        if (tex && tex.anisotropy !== quality.anisotropy) {
          tex.anisotropy = quality.anisotropy;
          tex.needsUpdate = true;
        }
      });
    });
  }, [object, quality]);

  // Raycast: proxy en exterior, mallas reales en interior
  useEffect(() => {
    object.traverse((obj) => {
      if (obj.isMesh) obj.raycast = interiorMode ? meshRaycast : noRaycast;
    });
  }, [object, interiorMode]);

  // Resaltado (selección / hover) — cambia uniformes, no recompila shaders
  useEffect(() => {
    const tint = isSelected ? 0.12 : isHovered ? 0.06 : 0;
    forEachMaterial(object, (m) => {
      if (!m.emissive) return;
      if (tint > 0) {
        m.emissive.set(BRAND.red);
        m.emissiveIntensity = tint;
      } else if (m.userData.__origEmissive) {
        m.emissive.copy(m.userData.__origEmissive);
        m.emissiveIntensity = m.userData.__origEmissiveIntensity;
      }
    });
    invalidate();
  }, [object, isSelected, isHovered, invalidate]);

  // Bounds en coordenadas de mundo → encuadre de cámara y anillo de selección
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const box = localBox.clone().applyMatrix4(group.matrixWorld);
    onBounds?.(buildingId, box);
    invalidate();
  }, [
    localBox, buildingId, onBounds, invalidate,
    pos.x, pos.y, pos.z, rot.x, rot.y, rot.z, scl.x, scl.y, scl.z,
  ]);

  return (
    <group
      ref={groupRef}
      position={[pos.x, pos.y, pos.z]}
      rotation={[toRad(rot.x), toRad(rot.y), toRad(rot.z)]}
      scale={[scl.x, scl.y, scl.z]}
      onClick={(e) => {
        e.stopPropagation();
        if (interiorMode) {
          if (onMeshClick && e.object?.name) onMeshClick(e.object.name);
          return;
        }
        onClick?.(buildingId);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!interiorMode) onDoubleClick?.(buildingId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (interiorMode) return;
        onHover?.(buildingId);
      }}
      onPointerOut={() => {
        if (interiorMode) return;
        onHover?.(null);
      }}
    >
      <primitive object={object} />

      {/* Volumen proxy para raycast barato en exterior */}
      {!interiorMode && (
        <mesh position={proxy.center}>
          <boxGeometry args={proxy.size} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ─── BuildingFallback ──────────────────────────────────────────────────── */

export function BuildingFallback({
  pos, buildingId, isSelected, isHovered, ghost = false, onClick, onDoubleClick, onHover,
}) {
  // Fantasma (modelo aún no descargado): volumen claro y sólido, con borde,
  // para que se lea como "aquí hay un edificio" sin confundirse con el real.
  const color = isSelected
    ? BRAND.red
    : ghost
      ? (isHovered ? '#e9e2dc' : '#ddd5ce')
      : (isHovered ? '#a9b8c6' : '#8B9EB0');

  return (
    <group
      position={[pos.x, pos.y + 6, pos.z]}
      onClick={(e) => { e.stopPropagation(); onClick?.(buildingId); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(buildingId); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover?.(buildingId); }}
      onPointerOut={() => onHover?.(null)}
    >
      <mesh receiveShadow castShadow={!ghost}>
        <boxGeometry args={[12, 12, 10]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={0}
          transparent={ghost}
          opacity={ghost ? 0.78 : 1}
          emissive={isSelected ? BRAND.red : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
        />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(12, 12, 10)]} />
        <lineBasicMaterial
          color={ghost ? BRAND.red : '#ffffff'}
          opacity={ghost ? 0.55 : 0.25}
          transparent
        />
      </lineSegments>
    </group>
  );
}

/* ─── ProximityGate ─────────────────────────────────────────────────────── */

function ProximityGate({ position, forceLoad, children, fallback }) {
  const { camera, invalidate } = useThree();
  const [inRange, setInRange] = useState(forceLoad);
  const elapsedRef = useRef(PROXIMITY.interval); // evaluar en el primer frame
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
    if (elapsedRef.current < PROXIMITY.interval) return;
    elapsedRef.current = 0;

    const dist = camera.position.distanceTo(posVec.current);

    if (!inRange && dist < PROXIMITY.load)        { setInRange(true);  invalidate(); }
    else if (inRange && dist > PROXIMITY.unload)  { setInRange(false); invalidate(); }
  });

  return inRange ? children : fallback;
}

/* ─── ModelErrorBoundary ────────────────────────────────────────────────── */

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('[CampusViewer3D] No se pudo cargar el modelo:', this.props.url, error);
  }

  componentDidUpdate(prev) {
    if (prev.url !== this.props.url && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ─── BuildingEntry ─────────────────────────────────────────────────────── */

export default function BuildingEntry({
  model, building, quality,
  isSelected, isHovered, interiorMode,
  proximityEnabled = true,
  onClick, onDoubleClick, onMeshClick, onHover, onBounds,
}) {
  const pos = getModelPosition(model, building);
  const rot = getModelRotation(model);
  const scl = getModelScale(model);
  const buildingId = building?.id;

  const commonFallback = {
    pos, buildingId, isSelected, isHovered, onClick, onDoubleClick, onHover,
  };

  if (!model?.file_path) {
    return <BuildingFallback {...commonFallback} />;
  }

  const forceLoad = !proximityEnabled || isSelected || interiorMode;
  const ghost = <BuildingFallback {...commonFallback} ghost />;

  return (
    <ProximityGate position={[pos.x, pos.y, pos.z]} forceLoad={forceLoad} fallback={ghost}>
      <ModelErrorBoundary url={model.file_path} fallback={<BuildingFallback {...commonFallback} />}>
        <Suspense fallback={ghost}>
          <BuildingModel
            url={model.file_path}
            pos={pos}
            rot={rot}
            scl={scl}
            buildingId={buildingId}
            isSelected={isSelected}
            isHovered={isHovered}
            interiorMode={interiorMode}
            quality={quality}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onMeshClick={onMeshClick}
            onHover={onHover}
            onBounds={onBounds}
          />
        </Suspense>
      </ModelErrorBoundary>
    </ProximityGate>
  );
}
