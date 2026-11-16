/**
 * InteriorHotspotMarkers.jsx — GeoESPOCH 3D
 * Marcadores 3D de los puntos de interés en modo interior. Cada hotspot con
 * `camera_reference` se ancla a la cámara marcadora exportada desde Blender
 * (Cam_Interior_*), ligeramente por delante de ella para que sea visible
 * desde ese mismo punto de vista.
 */
import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import HotspotTypeIcon from '../../../utils/hotspotIcons';

const CAMERA_PREFIX = 'Cam_Interior_';

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Busca el objeto de la escena al que apunta una referencia de cámara.
 * Tolera diferencias de puntuación (Blender exporta "Cam.001", Three.js lo
 * sanea a "Cam001") y sufijos (p. ej. "LabInf1_1" → "LabInf1").
 */
export function findMarkerObject(scene, reference) {
  if (!scene || !reference) return null;

  const exact = scene.getObjectByName(reference);
  if (exact) return exact;

  const want = normalizeName(reference);
  let found = null;

  scene.traverse((obj) => {
    if (found || !obj.name) return;
    if (normalizeName(obj.name) === want) found = obj;
  });
  if (found) return found;

  scene.traverse((obj) => {
    if (found || !obj.name || !obj.name.startsWith(CAMERA_PREFIX)) return;
    const have = normalizeName(obj.name);
    if (have.length >= 12 && (want.startsWith(have) || have.startsWith(want))) found = obj;
  });

  return found;
}

const _pos  = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _fwd  = new THREE.Vector3();

export default function InteriorHotspotMarkers({
  hotspots = [],
  activeHotspot = null,
  onSelect,
  sceneVersion = 0,
}) {
  const { scene } = useThree();

  const markers = useMemo(() => {
    const result = [];

    hotspots.forEach((hs) => {
      if (!hs?.camera_reference) return;
      const marker = findMarkerObject(scene, hs.camera_reference);
      if (!marker) return;

      marker.getWorldPosition(_pos);
      marker.getWorldQuaternion(_quat);
      _fwd.set(0, 0, -1).applyQuaternion(_quat);

      const position = _pos.clone().addScaledVector(_fwd, 2.4);
      position.y -= 0.25;

      result.push({ hotspot: hs, position: position.toArray() });
    });

    return result;
    // sceneVersion cambia cuando un modelo termina de montarse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspots, scene, sceneVersion]);

  if (!markers.length) return null;

  return markers.map(({ hotspot, position }) => {
    const active = String(activeHotspot?.id) === String(hotspot.id);

    // El marcador del hotspot activo se oculta: la cámara ya está en ese
    // punto y quedaría enorme delante del usuario.
    if (active) return null;

    return (
      <Html
        key={hotspot.id}
        position={position}
        center
        distanceFactor={7}
        zIndexRange={[18, 0]}
        style={{ pointerEvents: 'auto', userSelect: 'none' }}
      >
        <button
          type="button"
          className={`v3d-marker${active ? ' is-active' : ''}`}
          title={hotspot.name}
          aria-label={`Ir a ${hotspot.name}`}
          onClick={(e) => { e.stopPropagation(); onSelect?.(hotspot); }}
        >
          <span className="v3d-marker-dot">
            <HotspotTypeIcon type={hotspot.type} size={13} />
          </span>
          <span className="v3d-marker-label">{hotspot.name}</span>
        </button>
      </Html>
    );
  });
}
