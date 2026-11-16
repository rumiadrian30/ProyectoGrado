/**
 * CampusBase.jsx — GeoESPOCH 3D
 * Terreno del campus (mapa-espoch.glb). Doble clic sobre el terreno centra
 * la vista en ese punto.
 */
import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CAMPUS_URL } from './constants';

export default function CampusBase({ shadows = false, onFocusPoint }) {
  const { scene } = useGLTF(CAMPUS_URL);

  useMemo(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.receiveShadow = shadows;
      // Los volúmenes genéricos de OSM proyectan sombra sobre el suelo;
      // el terreno en sí no.
      obj.castShadow = shadows && /buildings/i.test(obj.name);

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (!m) return;
        if ('roughness' in m) m.roughness = 0.96;
        if ('metalness' in m) m.metalness = 0;
      });
    });
  }, [scene, shadows]);

  return (
    <primitive
      object={scene}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onFocusPoint?.(e.point);
      }}
    />
  );
}

useGLTF.preload(CAMPUS_URL);
