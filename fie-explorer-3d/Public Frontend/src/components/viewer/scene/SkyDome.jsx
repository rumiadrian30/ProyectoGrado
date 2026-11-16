/**
 * SkyDome.jsx — GeoESPOCH 3D
 * Cúpula de cielo con degradado (cenit → horizonte → suelo) y un sol suave.
 * Configura además la niebla de la escena para que el terreno se funda con
 * el horizonte en lugar de cortarse en seco.
 */
import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SKY } from './constants';

const VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunDir;
  varying vec3 vDir;

  void main() {
    float h = vDir.y;
    vec3 col;

    if (h >= 0.0) {
      float t = pow(clamp(h, 0.0, 1.0), 0.42);
      col = mix(uHorizon, uZenith, t);
    } else {
      float t = clamp(-h * 6.0, 0.0, 1.0);
      col = mix(uHorizon, uGround, t);
    }

    float sun  = max(dot(vDir, uSunDir), 0.0);
    col += vec3(1.0, 0.96, 0.86) * (pow(sun, 220.0) * 0.85 + pow(sun, 6.0) * 0.07);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function SkyDome() {
  const { scene } = useThree();

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uZenith:  { value: new THREE.Color(SKY.zenith) },
      uHorizon: { value: new THREE.Color(SKY.horizon) },
      uGround:  { value: new THREE.Color(SKY.ground) },
      uSunDir:  { value: SKY.sunDir.clone() },
    },
    vertexShader:   VERTEX,
    fragmentShader: FRAGMENT,
    side:       THREE.BackSide,
    depthWrite: false,
    fog:        false,
    toneMapped: false,
  }), []);

  useEffect(() => {
    const previous = scene.fog;
    scene.fog = new THREE.Fog(new THREE.Color(SKY.horizon), SKY.fogNear, SKY.fogFar);

    return () => {
      scene.fog = previous;
      material.dispose();
    };
  }, [scene, material]);

  return (
    <mesh material={material} frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[3200, 32, 16]} />
    </mesh>
  );
}
