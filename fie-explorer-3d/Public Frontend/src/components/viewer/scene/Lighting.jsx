/**
 * Lighting.jsx — GeoESPOCH 3D
 * Sol direccional con sombras que sigue al objetivo de la cámara (para que
 * el frustum de sombras siempre cubra la zona que se está explorando),
 * cielo hemisférico y luz de relleno.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SKY } from './constants';

const SUN_DISTANCE = 520;

export default function Lighting({ shadows = false, orbitRef }) {
  const sunRef = useRef(null);
  const { scene } = useThree();
  const sunTarget = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    scene.add(sunTarget);
    return () => { scene.remove(sunTarget); };
  }, [scene, sunTarget]);

  useFrame(() => {
    const sun = sunRef.current;
    const target = orbitRef?.current?.target;
    if (!sun || !target) return;

    if (sunTarget.position.distanceToSquared(target) > 1) {
      sunTarget.position.copy(target);
      sunTarget.updateMatrixWorld();
      sun.position.copy(target).addScaledVector(SKY.sunDir, SUN_DISTANCE);
    }
  });

  return (
    <>
      <hemisphereLight args={['#dbe9ff', '#5f6b50', 0.5]} />
      <ambientLight intensity={0.18} />

      <directionalLight
        ref={sunRef}
        color="#fff3dc"
        intensity={2.6}
        position={[260, 420, -180]}
        target={sunTarget}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={20}
        shadow-camera-far={1400}
        shadow-camera-left={-240}
        shadow-camera-right={240}
        shadow-camera-top={240}
        shadow-camera-bottom={-240}
        shadow-bias={-0.00025}
        shadow-normalBias={0.9}
      />

      <directionalLight
        color="#bcd4ff"
        intensity={0.35}
        position={[-220, 140, 260]}
      />
    </>
  );
}
