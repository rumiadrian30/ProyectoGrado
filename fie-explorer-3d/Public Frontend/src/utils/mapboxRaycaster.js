/**
 * mapboxRaycaster.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilidades de raycasting adaptadas al sistema de coordenadas de las capas
 * personalizadas (custom layers) de Mapbox GL JS + Three.js.
 *
 * ARQUITECTURA DE COORDENADAS EN MAPBOX CUSTOM LAYERS:
 * ──────────────────────────────────────────────────────
 * En una capa custom, la cámara de Three.js NO tiene matrices View/Projection
 * separadas. En su lugar, la propiedad `camera.projectionMatrix` almacena la
 * matriz MVP completa:
 *
 *   camera.projectionMatrix = mapMatrix  ×  modelMatrix
 *
 * donde:
 *   mapMatrix   = proyección Mercator de Mapbox (pasa como arg a `render`)
 *   modelMatrix = traslación + escala al anclaje GPS del modelo
 *
 * Para construir un rayo desde el mouse debemos invertir esa MVP y deshacer
 * la transformación clip → NDC → mundo. La fórmula es:
 *
 *   P_mundo = MVP⁻¹ × P_clip      (con división homogénea posterior)
 *
 * GESTIÓN DE EMISSIVE:
 * ──────────────────────────────────────────────────────
 * Se guarda el estado emissive original en `material.userData` al cargar el
 * modelo (storeEmissiveState). Los efectos de hover leen/escriben ese estado.
 * Soporta materiales multi-material (array) y materiales sin emissive.
 *
 * @module mapboxRaycaster
 */

import * as THREE from 'three';

// ─── Constantes de brillo hover ───────────────────────────────────────────────

/** Color emissive del hover para edificios genéricos (brillo blanco frío). */
const HOVER_COLOR_GENERIC = new THREE.Color(0xd0e8ff);

/** Color emissive del hover para el edificio FIE (brillo cálido interior). */
const HOVER_COLOR_DETAILED = new THREE.Color(0xfff4cc);

/** Intensidad del brillo hover. Rango recomendado: 0.10–0.25. */
const HOVER_INTENSITY = 0.16;

// ─── ALMACENAMIENTO DE ESTADO ORIGINAL ───────────────────────────────────────

/**
 * Recorre todo el subárbol de `rootObject` y guarda el estado emissive
 * original de cada material en `material.userData`.
 *
 * Debe llamarse UNA VEZ, justo después de que el GLB termina de cargarse.
 * Si un material ya fue procesado (tiene `_emissiveStored`), se omite.
 *
 * @param {THREE.Object3D} rootObject  Raíz del modelo (gltf.scene o group)
 */
export function storeEmissiveState(rootObject) {
  rootObject.traverse(obj => {
    if (!obj.isMesh) return;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach(mat => {
      if (!mat || mat.userData?._emissiveStored) return;

      mat.userData = mat.userData ?? {};

      // Algunos materiales (MeshBasicMaterial) no tienen emissive.
      // En ese caso guardamos null para identificarlos y no modificarlos.
      if (mat.emissive) {
        mat.userData.originalEmissive          = mat.emissive.clone();
        mat.userData.originalEmissiveIntensity = mat.emissiveIntensity ?? 0;
      } else {
        mat.userData.originalEmissive          = null;
        mat.userData.originalEmissiveIntensity = 0;
      }

      mat.userData._emissiveStored = true;
    });
  });
}

// ─── CONSTRUCCIÓN DEL RAYO ────────────────────────────────────────────────────

/**
 * Construye un `THREE.Raycaster` a partir de la posición del mouse en CSS pixels
 * y la matriz MVP combinada de la capa custom de Mapbox.
 *
 * PROCESO MATEMÁTICO:
 *  1. Convertir posición mouse (CSS px) → NDC [-1, 1]
 *  2. Invertir la MVP: clip space → world space de Mapbox Mercator
 *  3. Deshacer la división homogénea (perspectiva)
 *  4. Construir rayo origen→dirección entre el plano near y far
 *
 * @param {number}              cssX      Posición X del mouse en CSS pixels
 * @param {number}              cssY      Posición Y del mouse en CSS pixels
 * @param {HTMLCanvasElement}   canvas    Canvas de Mapbox (`map.getCanvas()`)
 * @param {THREE.Matrix4}       mvpMatrix MVP = `fromArray(lastMatrix) × modelMatrix`
 * @returns {THREE.Raycaster}             Raycaster listo para `intersectObjects`
 */
export function buildRayFromMouse(cssX, cssY, canvas, mvpMatrix) {
  // 1. NDC: usamos las dimensiones CSS (clientWidth/Height), NO las físicas.
  //    Mapbox e.point ya viene en CSS pixels.
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;

  const ndcX =  (cssX / W) * 2 - 1;
  const ndcY = -(cssY / H) * 2 + 1;

  // 2. Invertir MVP para ir de espacio de clip → espacio de mundo Mercator.
  //    Si la matriz es singular (modelo no cargado) invert() devuelve identidad.
  const mvpInverse = mvpMatrix.clone().invert();

  // 3. Puntos en clip space en plano near (z=-1) y far (z=1).
  const nearClip = new THREE.Vector4(ndcX, ndcY, -1, 1).applyMatrix4(mvpInverse);
  const farClip  = new THREE.Vector4(ndcX, ndcY,  1, 1).applyMatrix4(mvpInverse);

  // División homogénea: clip → mundo
  nearClip.divideScalar(nearClip.w);
  farClip.divideScalar(farClip.w);

  const origin    = new THREE.Vector3(nearClip.x, nearClip.y, nearClip.z);
  const direction = new THREE.Vector3(
    farClip.x - nearClip.x,
    farClip.y - nearClip.y,
    farClip.z - nearClip.z,
  ).normalize();

  const raycaster = new THREE.Raycaster();
  raycaster.set(origin, direction);

  return raycaster;
}

// ─── APLICAR / LIMPIAR HOVER EN MESH ─────────────────────────────────────────

/**
 * Aplica el efecto emissive de hover a un único mesh.
 *
 * @param {THREE.Mesh}    mesh        El mesh objetivo
 * @param {boolean}       [detailed]  true = edificio FIE (color cálido),
 *                                    false = genérico (color frío)
 */
export function applyHoverToMesh(mesh, detailed = false) {
  const color = detailed ? HOVER_COLOR_DETAILED : HOVER_COLOR_GENERIC;
  const mats  = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  mats.forEach(mat => {
    if (!mat?.emissive) return;
    mat.emissive.copy(color);
    mat.emissiveIntensity = HOVER_INTENSITY;
  });
}

/**
 * Restaura el emissive original en un único mesh.
 *
 * @param {THREE.Mesh} mesh
 */
export function clearHoverFromMesh(mesh) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  mats.forEach(mat => {
    if (!mat?.emissive || !mat.userData?._emissiveStored) return;
    if (mat.userData.originalEmissive === null) return; // MeshBasicMaterial

    mat.emissive.copy(mat.userData.originalEmissive);
    mat.emissiveIntensity = mat.userData.originalEmissiveIntensity;
  });
}

/**
 * Aplica el efecto de hover a TODOS los meshes dentro de un Object3D.
 * Uso: edificio genérico → resaltar el bloque completo.
 *
 * @param {THREE.Object3D} group
 */
export function applyHoverToGroup(group) {
  group.traverse(obj => {
    if (obj.isMesh) applyHoverToMesh(obj, false);
  });
}

/**
 * Restaura el emissive original en TODOS los meshes dentro de un Object3D.
 *
 * @param {THREE.Object3D} group
 */
export function clearHoverFromGroup(group) {
  group.traverse(obj => {
    if (obj.isMesh) clearHoverFromMesh(obj);
  });
}
