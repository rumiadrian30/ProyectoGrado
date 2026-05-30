/**
 * MiniMap.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimapa flotante para GeoESPOCH 3D.
 * Usa un <Canvas> secundario ultra-pequeño con una cámara ortográfica fija
 * apuntando verticalmente hacia abajo (position=[0, 200, 0]) que rastrea y
 * refleja la posición XZ de la cámara principal sobre el campus_base.glb.
 *
 * Características:
 *   - Cámara ortográfica top-down con frustum de 200 unidades de ancho
 *   - Indicador de posición de cámara principal (punto cyan pulsante)
 *   - Indicador de dirección de vista (cono/flecha)
 *   - Botón de colapso (minimizar/expandir)
 *   - Renderiza los footprints simplificados de los edificios (planos XZ)
 *   - Clicable: clic en el mapa teletransporta cámara principal a esa pos.
 *   - Compatible con todos los modos de cámara
 *
 * Props:
 *   models      Model[]   — modelos desde la API (para posiciones de edificios)
 *   cameraRef   Ref       — ref a la cámara principal de Three.js
 *   controlsRef Ref       — ref a ViewerControls (para triggerear reposicionado)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

// ─── Constantes del mapa ───────────────────────────────────────────────────
const MAP_SIZE         = 180;    // px: tamaño del canvas cuadrado visible
const MAP_FRUSTUM      = 180;    // unidades Three.js de semiancho ortográfico
const CAM_HEIGHT       = 200;    // altura Y de la cámara del mapa
const CAM_INDICATOR_R  = 2.5;   // radio del indicador de cámara principal
const BUILDING_COLOR   = '#1a3a4a';
const BUILDING_OUTLINE = '#00d4ff';
const CAMPUS_GROUND    = '#0d1f14';
const CAM_DOT_COLOR    = '#00d4ff';

// ─── Campus ground plane (representación del recinto) ─────────────────────
function MapGroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial color={CAMPUS_GROUND} />
    </mesh>
  );
}

// ─── Edificio simplificado (footprint plano) ──────────────────────────────
function BuildingFootprint({ model }) {
  const px = model.building_offset_x ?? 0;
  const pz = model.building_offset_z ?? 0;

  // Estimamos el footprint con un box plano de 12×8 unidades (genérico)
  // En producción se puede extender con datos de bounding-box del GLB.
  return (
    <mesh position={[px, 0, pz]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[12, 8]} />
      <meshBasicMaterial color={BUILDING_COLOR} />
    </mesh>
  );
}

// Contorno del footprint
function BuildingOutline({ model }) {
  const px = model.building_offset_x ?? 0;
  const pz = model.building_offset_z ?? 0;

  const points = useMemo(() => {
    const w = 6, h = 4;
    return [
      new THREE.Vector3(-w, 0, -h),
      new THREE.Vector3( w, 0, -h),
      new THREE.Vector3( w, 0,  h),
      new THREE.Vector3(-w, 0,  h),
      new THREE.Vector3(-w, 0, -h),
    ];
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <line position={[px, 0.1, pz]} geometry={geometry}>
      <lineBasicMaterial color={BUILDING_OUTLINE} linewidth={1.5} />
    </line>
  );
}

// ─── Indicador de cámara principal ────────────────────────────────────────
function CameraIndicator({ cameraRef }) {
  const meshRef = useRef();
  const coneRef = useRef();
  const pulseRef = useRef(0);

  useFrame(({ clock }) => {
    const mainCam = cameraRef?.current;
    if (!mainCam || !meshRef.current) return;

    // Seguir posición XZ de la cámara principal
    meshRef.current.position.x = mainCam.position.x;
    meshRef.current.position.z = mainCam.position.z;

    // Actualizar el cono de dirección
    if (coneRef.current) {
      // Extraer yaw de la cámara principal
      const euler = new THREE.Euler().setFromQuaternion(mainCam.quaternion, 'YXZ');
      coneRef.current.rotation.y = euler.y;
    }

    // Pulso del indicador
    pulseRef.current = clock.getElapsedTime();
    const scale = 1 + Math.sin(pulseRef.current * 2.5) * 0.15;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={meshRef} position={[0, 0.5, 0]}>
      {/* Punto principal */}
      <mesh>
        <circleGeometry args={[CAM_INDICATOR_R, 24]} />
        <meshBasicMaterial color={CAM_DOT_COLOR} />
      </mesh>

      {/* Halo exterior */}
      <mesh>
        <ringGeometry args={[CAM_INDICATOR_R + 0.5, CAM_INDICATOR_R + 1.8, 24]} />
        <meshBasicMaterial color={CAM_DOT_COLOR} transparent opacity={0.3} />
      </mesh>

      {/* Cono de dirección */}
      <group ref={coneRef} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, -(CAM_INDICATOR_R + 4)]}>
          <coneGeometry args={[1.5, 5, 3]} />
          <meshBasicMaterial color={CAM_DOT_COLOR} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Escena interior del minimapa ─────────────────────────────────────────
function MinimapScene({ models, cameraRef }) {
  const activeModels = useMemo(
    () => models.filter((m) => m.is_active),
    [models],
  );

  return (
    <>
      {/* Cámara ortográfica fija top-down */}
      <OrthographicCamera
        makeDefault
        position={[0, CAM_HEIGHT, 0]}
        zoom={1}
        near={1}
        far={500}
        left={-MAP_FRUSTUM}
        right={MAP_FRUSTUM}
        top={MAP_FRUSTUM}
        bottom={-MAP_FRUSTUM}
        onUpdate={(cam) => cam.lookAt(0, 0, 0)}
      />

      {/* Iluminación plana */}
      <ambientLight intensity={1.5} />

      {/* Suelo del campus */}
      <MapGroundPlane />

      {/* Footprints de edificios */}
      {activeModels.map((model) => (
        <React.Fragment key={model.id}>
          <BuildingFootprint model={model} />
          <BuildingOutline   model={model} />
        </React.Fragment>
      ))}

      {/* Indicador de cámara principal */}
      <CameraIndicator cameraRef={cameraRef} />
    </>
  );
}

// ─── Componente MiniMap exportado ─────────────────────────────────────────
export default function MiniMap({ models = [], cameraRef, controlsRef }) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [isDragging,   setIsDragging]   = useState(false);
  const containerRef                    = useRef(null);

  // Teletransportar cámara principal al clicar en el mapa
  const handleMapClick = useCallback((e) => {
    if (isDragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Normalizar click a [-1, 1] en el espacio del mapa
    const nx = ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
    const ny = ((e.clientY - rect.top)   / rect.height) * 2 - 1;

    // Convertir a coordenadas world del canvas (frustum = MAP_FRUSTUM)
    const worldX =  nx * MAP_FRUSTUM;
    const worldZ = -ny * MAP_FRUSTUM; // invertir Y porque Three.js usa Z como profundidad

    // Reposicionar cámara principal via ref
    const mainCam = cameraRef?.current;
    if (mainCam) {
      mainCam.position.x = worldX;
      mainCam.position.z = worldZ;
      // Mantener la altura actual
      if (controlsRef?.current?.resetCamera) {
        // Solo actualizar target del OrbitControls si está en modo orbital
        const ctrl = controlsRef.current;
        if (ctrl.target) {
          ctrl.target.x = worldX;
          ctrl.target.z = worldZ;
          ctrl.update?.();
        }
      }
    }
  }, [isDragging, cameraRef, controlsRef, MAP_FRUSTUM]);

  const BORDER_COLOR   = 'rgba(0,212,255,0.25)';
  const SHADOW_COLOR   = '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.08)';
  const HEADER_BG      = 'rgba(8,14,24,0.92)';

  return (
    <div
      style={{
        position:  'absolute',
        bottom:    16,
        right:     16,
        zIndex:    30,
        display:   'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        borderRadius: 12,
        overflow:  'hidden',
        border:    `1px solid ${BORDER_COLOR}`,
        boxShadow: SHADOW_COLOR,
        backdropFilter: 'blur(4px)',
        transition: 'all 0.25s ease',
        width:  collapsed ? 120 : MAP_SIZE,
        height: collapsed ? 32  : MAP_SIZE + 32,
      }}
      role="complementary"
      aria-label="Minimapa del campus"
    >
      {/* Header del mapa */}
      <div
        style={{
          height: 32,
          background: HEADER_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          borderBottom: collapsed ? 'none' : `1px solid ${BORDER_COLOR}`,
          flexShrink: 0,
        }}
      >
        <span style={{
          color: 'rgba(0,212,255,0.7)',
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}>
          ◈ Minimapa
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expandir minimapa' : 'Contraer minimapa'}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(0,212,255,0.5)',
            cursor: 'pointer',
            padding: 0,
            fontSize: 12,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: 4,
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseOver={e  => e.currentTarget.style.color   = '#00d4ff'}
          onMouseOut={e   => e.currentTarget.style.color   = 'rgba(0,212,255,0.5)'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {/* Canvas del minimapa */}
      {!collapsed && (
        <div
          ref={containerRef}
          onClick={handleMapClick}
          onMouseDown={() => setIsDragging(false)}
          onMouseMove={() => setIsDragging(true)}
          style={{
            width:  MAP_SIZE,
            height: MAP_SIZE,
            flexShrink: 0,
            cursor: 'crosshair',
            position: 'relative',
          }}
          title="Clic para teletransportar cámara"
          role="img"
          aria-label="Vista aérea del campus — clic para navegar"
        >
          <Canvas
            style={{ width: '100%', height: '100%' }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'low-power',
            }}
            // Fondo oscuro
            onCreated={({ gl }) => gl.setClearColor('#0a0f18', 1)}
          >
            <MinimapScene models={models} cameraRef={cameraRef} />
          </Canvas>

          {/* Retícula central */}
          <div style={{
            position:   'absolute',
            inset:      0,
            pointerEvents: 'none',
            zIndex:     2,
          }}>
            {/* Líneas de retícula */}
            <div style={{
              position: 'absolute',
              top: '50%', left: 0, right: 0,
              height: 1,
              background: 'rgba(0,212,255,0.08)',
              transform: 'translateY(-50%)',
            }} />
            <div style={{
              position: 'absolute',
              left: '50%', top: 0, bottom: 0,
              width: 1,
              background: 'rgba(0,212,255,0.08)',
              transform: 'translateX(-50%)',
            }} />

            {/* Esquinas decorativas */}
            {[
              { top: 6, left: 6,  borderTop: '1px solid', borderLeft: '1px solid' },
              { top: 6, right: 6, borderTop: '1px solid', borderRight: '1px solid' },
              { bottom: 6, left: 6,  borderBottom: '1px solid', borderLeft: '1px solid' },
              { bottom: 6, right: 6, borderBottom: '1px solid', borderRight: '1px solid' },
            ].map((s, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 8, height: 8,
                borderColor: 'rgba(0,212,255,0.4)',
                ...s,
              }} />
            ))}
          </div>

          {/* Etiqueta N (Norte) */}
          <div style={{
            position: 'absolute',
            top: 8, left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(0,212,255,0.5)',
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.1em',
            pointerEvents: 'none',
            zIndex: 3,
          }}>N</div>
        </div>
      )}
    </div>
  );
}