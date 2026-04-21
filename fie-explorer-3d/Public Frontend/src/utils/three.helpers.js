import * as THREE from 'three';

/**
 * Libera la memoria de un objeto Three.js (geometrías, materiales, texturas).
 * Llamar al desmontar la escena.
 */
export function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        if (!m) return;
        Object.values(m).forEach(v => {
          if (v instanceof THREE.Texture) v.dispose();
        });
        m.dispose();
      });
    }
  });
}

/**
 * Calcula el centro y radio de la bounding sphere del modelo.
 * Útil para posicionar la cámara automáticamente.
 */
export function computeBoundingSphere(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) / 2;
  return { center, size, radius };
}

/**
 * Crea un material de hotspot (esfera brillante semitransparente).
 */
export function createHotspotMaterial(color = 0x003087) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.9,
    roughness: 0.2,
    metalness: 0.1,
  });
}
