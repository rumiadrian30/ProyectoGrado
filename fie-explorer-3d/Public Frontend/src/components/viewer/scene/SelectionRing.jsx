/**
 * SelectionRing.jsx — GeoESPOCH 3D
 * Anillo en rojo ESPOCH bajo el edificio seleccionado. Al seleccionar emite
 * un pulso durante ~2.5 s y luego queda estático (así no obliga a renderizar
 * continuamente con frameloop="demand").
 */
import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BRAND } from './constants';

const PULSE_SECONDS = 2.6;

export default function SelectionRing({ position = [0, 0, 0], radius = 16, activeKey }) {
  const { invalidate } = useThree();
  const pulseRef  = useRef(null);
  const elapsed   = useRef(0);
  const pulsing   = useRef(false);

  useEffect(() => {
    elapsed.current = 0;
    pulsing.current = true;
    invalidate();
  }, [activeKey, invalidate]);

  useFrame((_, delta) => {
    if (!pulsing.current || !pulseRef.current) return;

    elapsed.current += delta;
    const cycle = (elapsed.current % 1.3) / 1.3;
    const scale = 1 + cycle * 0.9;

    pulseRef.current.scale.set(scale, scale, 1);
    pulseRef.current.material.opacity = (1 - cycle) * 0.55;

    if (elapsed.current >= PULSE_SECONDS) {
      pulsing.current = false;
      pulseRef.current.material.opacity = 0;
    }

    invalidate();
  });

  const y = position[1] + 0.35;

  return (
    <group position={[position[0], y, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Anillo fijo */}
      <mesh renderOrder={2}>
        <ringGeometry args={[radius * 0.955, radius, 96]} />
        <meshBasicMaterial
          color={BRAND.red}
          transparent
          opacity={0.62}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
          toneMapped={false}
        />
      </mesh>

      {/* Relleno tenue */}
      <mesh renderOrder={1}>
        <circleGeometry args={[radius * 0.955, 96]} />
        <meshBasicMaterial
          color={BRAND.red}
          transparent
          opacity={0.05}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
          toneMapped={false}
        />
      </mesh>

      {/* Pulso */}
      <mesh ref={pulseRef} renderOrder={3}>
        <ringGeometry args={[radius * 0.96, radius * 1.02, 72]} />
        <meshBasicMaterial
          color={BRAND.red}
          transparent
          opacity={0}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
