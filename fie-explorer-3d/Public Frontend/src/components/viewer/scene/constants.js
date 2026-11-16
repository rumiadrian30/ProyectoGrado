/**
 * scene/constants.js — GeoESPOCH 3D
 * Parámetros compartidos del visor 3D (cámara, límites, cielo, marca).
 */
import * as THREE from 'three';

export const API_BASE   = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const CAMPUS_URL = `${API_BASE}/models/mapa-espoch.glb`;

/** Paleta de marca (misma que global.css) */
export const BRAND = {
  red:      '#BC0613',
  redDark:  '#9a0510',
  cream:    '#FDFAF9',
  ink:      'rgba(40,2,5,.88)',
  inkSoft:  'rgba(40,2,5,.62)',
};

export const CAMERA = {
  fov:         45,
  near:        0.5,
  far:         4000,
  minDistance: 12,
  maxDistance: 900,
  maxPolar:    Math.PI / 2.08,
};

/** Vista por defecto si todavía no hay edificios con los que encuadrar */
export const CAMERA_INITIAL = {
  position: [0, 180, 280],
  target:   [0, 0, 0],
};

/** Límites del mundo navegable (coinciden con el terreno mapa-espoch.glb) */
export const WORLD_LIMITS = {
  minX: -997.5, maxX: 997.5,
  minY: -10,    maxY: 320,
  minZ: -877.5, maxZ: 877.5,
};

/** Carga de modelos por proximidad a la cámara (metros) */
export const PROXIMITY = {
  load:     150,
  unload:   210,
  interval: 0.4,
};

/** Modo interior: caminar */
export const INTERIOR = {
  walkSpeed:     2.8,   // m/s
  runMultiplier: 2.2,
  eyeMin:        0.6,
  eyeMax:        90,
};

/** Cielo y niebla atmosférica */
export const SKY = {
  zenith:  '#3a8ad8',
  horizon: '#dde9f5',
  ground:  '#c6d3df',
  fogNear: 520,
  fogFar:  2300,
  sunDir:  new THREE.Vector3(260, 420, -180).normalize(),
};

/** Curva de animación de la cámara (smoothstep) */
export const easeSmooth = (t) => t * t * (3 - 2 * t);

/** Duración de un vuelo de cámara según distancia (segundos) */
export const flightDuration = (distance) =>
  THREE.MathUtils.clamp(0.7 + distance / 260, 0.85, 2.3);
