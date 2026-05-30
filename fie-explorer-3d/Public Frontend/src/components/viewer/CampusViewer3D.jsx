/**
 * CampusViewer3D.jsx — GeoESPOCH 3D
 *
 * Visor 3D puro basado en @react-three/fiber + @react-three/drei.
 * Reemplaza completamente a MapboxViewer.jsx — sin mapbox-gl, sin coordenadas GPS.
 *
 * ARQUITECTURA DE COORDENADAS:
 *   Todo en metros Three.js (sistema cartesiano local).
 *   building.offset_x → posición X en escena
 *   building.offset_y → posición Y (altura) en escena
 *   building.offset_z → posición Z en escena
 *   rotate_x/y/z      → rotación en grados
 *   scale              → escala uniforme (o scale_x/y/z si el modelo usa los tres)
 *
 * MODELO BASE:
 *   GET /models/mapa-espoch.glb  → topografía, calles, áreas verdes del campus
 *   Posicionado en el origen global (0, 0, 0)
 *
 * EDIFICIOS HIJOS:
 *   GET /api/models  → lista de modelos activos con sus offsets
 *   Cada uno se renderiza con scene.clone() para evitar conflictos WebGL
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
  Environment,
  Html,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';
import { useViewerStore } from '../../store/viewerStore';

/* ─────────────────────────────────────────────────────────────────────────────
   Constantes de entorno
───────────────────────────────────────────────────────────────────────────── */

const API_BASE    = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CAMPUS_URL  = `${API_BASE}/models/mapa-espoch.glb`;

// Posición inicial de la cámara (vista aérea isométrica del campus)
const CAMERA_INITIAL = { position: [0, 180, 280], fov: 45 };

// Límite de ángulo polar — impide que la cámara pase bajo el suelo
const MAX_POLAR = Math.PI / 2.1;

/* ─────────────────────────────────────────────────────────────────────────────
   CampusBase — Modelo base del campus (mapa-espoch.glb)
   Cargado en origen (0,0,0). Recibe sombras del sol.
───────────────────────────────────────────────────────────────────────────── */

function CampusBase() {
  const { scene } = useGLTF(CAMPUS_URL);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.receiveShadow = true;
      obj.castShadow    = false; // El mapa base no necesita proyectar sombras
    });
    return cloned;
  }, [scene]);

  return <primitive object={clonedScene} position={[0, 0, 0]} />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   BuildingModel — Edificio hijo individual
   Usa scene.clone() para evitar conflictos si un mismo GLB se repite.
───────────────────────────────────────────────────────────────────────────── */

function BuildingModel({
  url,
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  scaleX  = 1,
  scaleY  = 1,
  scaleZ  = 1,
  buildingId,
  isSelected,
  onClick,
}) {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow    = true;
      obj.receiveShadow = true;

      // Destacar visualmente el edificio seleccionado
      if (isSelected) {
        if (!obj.material.__originalEmissive) {
          // Guardamos el emissive original para poder restaurarlo
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (!m.__originalEmissive) {
              m.__originalEmissive = m.emissive?.clone() ?? new THREE.Color(0x000000);
              m.__originalEmissiveIntensity = m.emissiveIntensity ?? 0;
            }
            m.emissive          = new THREE.Color(0xBC0613);
            m.emissiveIntensity = 0.18;
          });
        }
      }
    });

    return cloned;
  }, [scene, isSelected]);

  const toRad = (deg) => (parseFloat(deg) || 0) * (Math.PI / 180);

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
   BuildingFallback — Caja placeholder para edificios sin modelo GLB
───────────────────────────────────────────────────────────────────────────── */

function BuildingFallback({
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0,
  buildingId,
  buildingName,
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
   BuildingEntry — Carga asíncrona con Suspense individual por edificio
───────────────────────────────────────────────────────────────────────────── */

function BuildingEntry({ model, building, isSelected, onClick }) {
  const ox = parseFloat(model?.offset_x ?? building?.offset_x) || 0;
  const oy = parseFloat(model?.offset_y ?? building?.offset_y) || 0;
  const oz = parseFloat(model?.offset_z ?? building?.offset_z) || 0;
  const rx = parseFloat(model?.rotate_x) || 0;
  const ry = parseFloat(model?.rotate_y) || 0;
  const rz = parseFloat(model?.rotate_z) || 0;
  // El modelo puede tener scale uniforme o separado por eje
  const sx = parseFloat(model?.scale_x ?? model?.scale) || 1;
  const sy = parseFloat(model?.scale_y ?? model?.scale) || 1;
  const sz = parseFloat(model?.scale_z ?? model?.scale) || 1;

  if (!model?.file_path) {
    return (
      <BuildingFallback
        offsetX={ox}
        offsetY={oy}
        offsetZ={oz}
        buildingId={building?.id}
        buildingName={building?.name}
        isSelected={isSelected}
        onClick={onClick}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <BuildingModel
        url={model.file_path}
        offsetX={ox}
        offsetY={oy}
        offsetZ={oz}
        rotateX={rx}
        rotateY={ry}
        rotateZ={rz}
        scaleX={sx}
        scaleY={sy}
        scaleZ={sz}
        buildingId={building?.id}
        isSelected={isSelected}
        onClick={onClick}
      />
    </Suspense>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CameraController — Anima la cámara al seleccionar un edificio
───────────────────────────────────────────────────────────────────────────── */

function CameraController({ selectedBuilding, allModels }) {
  const { camera, controls } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const animatingRef = useRef(false);

  useEffect(() => {
    if (!selectedBuilding) {
      // Volver a vista general del campus
      targetRef.current.set(0, 0, 0);
      animatingRef.current = true;
      return;
    }

    const model = allModels.find(
      (m) => String(m.building_id) === String(selectedBuilding.id)
    );
    const ox = parseFloat(model?.offset_x ?? selectedBuilding.offset_x) || 0;
    const oz = parseFloat(model?.offset_z ?? selectedBuilding.offset_z) || 0;

    targetRef.current.set(ox, 0, oz);
    animatingRef.current = true;
  }, [selectedBuilding?.id]);

  useFrame(() => {
    if (!animatingRef.current || !controls) return;

    const target = controls.target;
    target.lerp(targetRef.current, 0.06);

    if (target.distanceTo(targetRef.current) < 0.1) {
      target.copy(targetRef.current);
      animatingRef.current = false;
    }
  });

  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Iluminación — Exterior arquitectónico
   AmbientLight moderada + DirectionalLight solar con sombras
───────────────────────────────────────────────────────────────────────────── */

function Lighting() {
  const sunRef = useRef();

  return (
    <>
      {/* Luz ambiente — suave para no lavar colores */}
      <ambientLight color="#e8f0ff" intensity={0.55} />

      {/* Sol principal con sombras */}
      <directionalLight
        ref={sunRef}
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

      {/* Luz de relleno — simula cielo/reflexión difusa */}
      <directionalLight
        color="#c8d8ff"
        intensity={0.45}
        position={[-80, 60, -100]}
      />

      {/* Luz de contraluz suave — fachadas traseras no quedan negras */}
      <hemisphereLight
        skyColor="#b1d0ff"
        groundColor="#4a6632"
        intensity={0.3}
      />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LoadingOverlay — Spinner mientras carga el campus base
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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.7 }}>
          Cargando campus ESPOCH…
        </span>
      </div>
    </Html>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Scene — Escena completa dentro del Canvas
───────────────────────────────────────────────────────────────────────────── */

function Scene({
  allModels,
  buildings,
  selectedBuilding,
  onBuildingClick,
  orbitRef,
}) {
  return (
    <>
      {/* Cámara principal */}
      <PerspectiveCamera
        makeDefault
        fov={CAMERA_INITIAL.fov}
        position={CAMERA_INITIAL.position}
        near={0.5}
        far={5000}
      />

      {/* Domo de cielo realista */}
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

      {/* Iluminación */}
      <Lighting />

      {/* Controles de órbita */}
      <OrbitControls
        ref={orbitRef}
        maxPolarAngle={MAX_POLAR}
        minDistance={20}
        maxDistance={800}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={1.1}
        panSpeed={0.8}
        screenSpacePanning={false}
        target={[0, 0, 0]}
      />

      {/* Animador de cámara */}
      <CameraController
        selectedBuilding={selectedBuilding}
        allModels={allModels}
      />

      {/* Mapa base del campus */}
      <Suspense fallback={<LoadingOverlay />}>
        <CampusBase />
      </Suspense>

      {/* Edificios hijos dinámicos */}
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
   WebGLErrorFallback — Cuando el navegador no soporta WebGL2
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
      <span style={{ fontSize: '3rem' }}>⚠️</span>
      <h3 style={{ margin: 0, color: 'var(--ink-dark)', fontSize: '1.1rem', fontWeight: 700 }}>
        WebGL no disponible
      </h3>
      <p style={{ maxWidth: 380, margin: 0, color: 'var(--ink)', fontSize: '0.88rem', lineHeight: 1.6 }}>
        Tu navegador no puede inicializar el visor 3D. Actualiza Chrome o Firefox para continuar.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="https://www.google.com/chrome" target="_blank" rel="noreferrer"
          style={{ padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 600, background: '#1967D2', color: '#fff', textDecoration: 'none', fontSize: '0.85rem' }}>
          🌐 Chrome
        </a>
        <a href="https://www.mozilla.org/firefox" target="_blank" rel="noreferrer"
          style={{ padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 600, background: '#FF7139', color: '#fff', textDecoration: 'none', fontSize: '0.85rem' }}>
          🦊 Firefox
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Botón de reset de cámara
───────────────────────────────────────────────────────────────────────────── */

function ResetCameraButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Vista inicial del campus"
      aria-label="Volver a vista inicial del campus"
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 20,
        width: 36,
        height: 36,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 8,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        color: '#374151',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.92)'; }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Badge de edificio seleccionado
───────────────────────────────────────────────────────────────────────────── */

function BuildingBadge({ building, hasModel }) {
  if (!building) {
    return (
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 999,
        padding: '0.4rem 1rem',
        fontSize: '0.75rem',
        fontWeight: 400,
        color: '#6b7280',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        Haz clic en un edificio para explorarlo
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: 999,
      padding: '0.4rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      fontSize: '0.75rem',
      fontWeight: 700,
      color: '#111827',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#BC0613',
        flexShrink: 0,
      }} />
      {building.name}
      {hasModel
        ? <span style={{ color: '#16a34a', fontWeight: 400, fontSize: '0.68rem' }}>· modelo 3D</span>
        : <span style={{ color: '#d97706', fontWeight: 400, fontSize: '0.68rem' }}>· demo</span>
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CampusViewer3D — Componente principal exportado
───────────────────────────────────────────────────────────────────────────── */

export default function CampusViewer3D({
  allModels   = [],
  buildings   = [],
  building,           // Edificio seleccionado (objeto completo)
  onBuildingClick,    // (buildingObject) => void
}) {
  const [webglError, setWebglError] = useState(false);
  const orbitRef = useRef();

  const { setModelLoading, setModelProgress } = useViewerStore();

  // Detectar soporte de WebGL antes de intentar crear el canvas
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) setWebglError(true);
    } catch {
      setWebglError(true);
    }
  }, []);

  // Resetear cámara a vista general del campus
  const handleResetCamera = useCallback(() => {
    if (!orbitRef.current) return;
    const controls = orbitRef.current;
    controls.target.set(0, 0, 0);
    controls.object.position.set(...CAMERA_INITIAL.position);
    controls.update();
  }, []);

  // Wrap del callback para recibir buildingId y traducirlo a objeto completo
  const handleBuildingClick = useCallback((buildingId) => {
    const found = buildings.find((b) => String(b.id) === String(buildingId));
    if (found) onBuildingClick?.(found);
  }, [buildings, onBuildingClick]);

  const selectedHasModel = useMemo(
    () => allModels.some((m) => String(m.building_id) === String(building?.id) && m.is_active),
    [allModels, building?.id]
  );

  if (webglError) return <WebGLErrorFallback />;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
          gl.shadowMap.type    = THREE.PCFSoftShadowMap;
        }}
        style={{ background: '#a8c8e8' }}  // Fallback de cielo mientras carga Sky
      >
        <Scene
          allModels={allModels}
          buildings={buildings}
          selectedBuilding={building}
          onBuildingClick={handleBuildingClick}
          orbitRef={orbitRef}
        />
      </Canvas>

      {/* UI superpuesta */}
      <ResetCameraButton onClick={handleResetCamera} />
      <BuildingBadge building={building} hasModel={selectedHasModel} />

      {/* Hint de controles (solo desktop, desaparece al primer clic) */}
      <ControlsHint />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ControlsHint — Overlay de ayuda de teclado/ratón
───────────────────────────────────────────────────────────────────────────── */

function ControlsHint() {
  const [visible, setVisible] = useState(
    () => sessionStorage.getItem('fie-3d-hint-dismissed') !== '1'
  );

  if (!visible) return null;

  return (
    <div
      onClick={() => {
        setVisible(false);
        sessionStorage.setItem('fie-3d-hint-dismissed', '1');
      }}
      style={{
        position: 'absolute',
        bottom: 70,
        right: 12,
        zIndex: 20,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        borderRadius: 10,
        padding: '0.65rem 0.9rem',
        color: 'rgba(255,255,255,0.85)',
        fontSize: '0.68rem',
        lineHeight: 1.8,
        cursor: 'pointer',
        userSelect: 'none',
        maxWidth: 190,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, opacity: 0.6, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Controles</div>
      🖱️ Clic + arrastrar — rotar<br />
      🖱️ Rueda — zoom<br />
      🖱️ Clic derecho — desplazar<br />
      👆 Toca para girar / pellizca para zoom
      <div style={{ marginTop: 6, opacity: 0.4, fontSize: '0.6rem' }}>Clic aquí para cerrar</div>
    </div>
  );
}
