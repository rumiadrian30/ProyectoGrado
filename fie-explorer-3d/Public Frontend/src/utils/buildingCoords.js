/**
 * buildingCoords.js  — VERSIÓN CORREGIDA
 *
 * ARQUITECTURA DE COORDENADAS:
 *   Anchor GPS fijo = CAMPUS_VIEW.center  (un solo punto para todo el campus)
 *   building.offset_x = desplazamiento Este  en metros (Three.js +X)
 *   building.offset_y = altura              en metros (Three.js +Y)
 *   building.offset_z = desplazamiento Norte en metros (Three.js +Z)
 *
 *   hotspot.pos_x / pos_z = coordenadas LOCALES al edificio, en metros.
 *   Son relativas al origen del GLB centrado (bbox center = 0,0,0 en escena).
 *
 * REGLA ÚNICA para posicionar un hotspot en el mundo:
 *   world_x = building_offset_x + pos_x - pivot_cx
 *   world_z = building_offset_z + pos_z - pivot_cz
 *
 *   pivot_cx/cz son 0 si el GLB ya tiene el origen en su centroide.
 *   Sólo son ≠ 0 cuando el modelo tiene el origen en una esquina/base
 *   y el centrado automático (center.x/z subtracted) lo desplazó.
 */

// ── Anchor fijo del campus ────────────────────────────────────────────────────
export const CAMPUS_VIEW = {
  center:  [-78.67578090982062, -1.6563956619661038],
  zoom:    17.5,
  pitch:   55,
  bearing: -15,
};

// ── Factores de conversión metros → grados ────────────────────────────────────
const DEG_PER_METER_LAT = 1 / 111_000;
const DEG_PER_METER_LNG = 1 / 110_960;

// ─────────────────────────────────────────────────────────────────────────────
// buildingOffsetToGPS
// Convierte offset Three.js (metros desde campus center) a [lng, lat].
// Uso: flyTo de la cámara y pins de edificio.
// ─────────────────────────────────────────────────────────────────────────────
export function buildingOffsetToGPS(offset_x = 0, offset_z = 0) {
  return [
    CAMPUS_VIEW.center[0] + offset_x * DEG_PER_METER_LNG,
    CAMPUS_VIEW.center[1] + offset_z * DEG_PER_METER_LAT,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// hotspotToGPS  ← NUEVA — LA CORRECCIÓN CENTRAL
//
// Convierte la posición LOCAL de un hotspot a coordenadas GPS.
//
// @param {number} buildingOffsetX  building.offset_x  (o h.building_offset_x del JOIN)
// @param {number} buildingOffsetZ  building.offset_z  (o h.building_offset_z del JOIN)
// @param {number} localX           hotspot.pos_x      (local, metros dentro del edificio)
// @param {number} localZ           hotspot.pos_z      (local, metros dentro del edificio)
// @param {{ cx: number, cz: number }} [pivot]
//        Corrección de pivote del modelo (ver computeModelPivotShift).
//        Pasa { cx: 0, cz: 0 } (o nada) si el GLB ya tiene el origen centrado.
//
// @returns {[number, number]} [lng, lat]
//
// EJEMPLO:
//   hotspot { pos_x: 5, pos_z: -3 }  en edificio { offset_x: 120, offset_z: 80 }
//   → GPS = buildingOffsetToGPS(120 + 5, 80 + (-3)) = [lng, lat]
// ─────────────────────────────────────────────────────────────────────────────
export function hotspotToGPS(
  buildingOffsetX,
  buildingOffsetZ,
  localX,
  localZ,
  pivot = { cx: 0, cz: 0 },
) {
  return buildingOffsetToGPS(
    buildingOffsetX + localX - pivot.cx,
    buildingOffsetZ + localZ - pivot.cz,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// computeModelPivotShift  ← NUEVA — CORRECCIÓN DE PIVOTE DEL GLB
//
// Extrae el vector de corrección del centrado automático del modelo.
//
// PROBLEMA QUE RESUELVE:
//   En createModelLayer hacemos:
//     box    = new THREE.Box3().setFromObject(model)
//     center = box.getCenter(...)           ← centroide de la bbox
//     model.position.x -= center.x         ← centramos el modelo en escena
//     model.position.z -= center.z
//     model.position.x += buildingPos.x    ← aplicamos offset del edificio
//     model.position.z += buildingPos.z
//
//   Resultado: el centroide visual del modelo queda en (building_offset_x, _, building_offset_z).
//   PERO el ORIGEN ORIGINAL del GLB (0,0,0) ahora está en escena en:
//     scene_origin_x = building_offset_x - center.x
//     scene_origin_z = building_offset_z - center.z
//
//   Si el admin grabó hotspot.pos_x como "metros desde el origen GLB" (no desde
//   el centroide), el pin quedaría desplazado exactamente center.x/center.z metros.
//   Este helper devuelve ese vector para corregirlo.
//
// @param {THREE.Box3} boundingBox  bbox calculada ANTES de aplicar buildingPos
//                                  (es decir, justo tras new THREE.Box3().setFromObject(model))
// @returns {{ cx: number, cz: number }}
//
// USO en createModelLayer (ver MapboxViewer.jsx):
//   const box    = new THREE.Box3().setFromObject(model);
//   const pivot  = computeModelPivotShift(box);   // ← aquí
//   const center = box.getCenter(new THREE.Vector3());
//   model.position.x -= center.x;
//   ...
//   onPivotComputed?.(pivot);
// ─────────────────────────────────────────────────────────────────────────────
export function computeModelPivotShift(boundingBox) {
  // Three.js Vector3 no se importa aquí para no crear dependencia de THREE
  // en un módulo de utilidades puras. Calculamos manualmente.
  const cx = (boundingBox.max.x + boundingBox.min.x) / 2;
  const cz = (boundingBox.max.z + boundingBox.min.z) / 2;
  return { cx, cz };
}

// ─────────────────────────────────────────────────────────────────────────────
// computeBuildingFlyTo  — sin cambios, solo usa la corrección interna
// ─────────────────────────────────────────────────────────────────────────────
export function computeBuildingFlyTo(building, allModels = [], hotspots = []) {
  if (!building) return null;

  const bx = parseFloat(building.offset_x) || 0;
  const bz = parseFloat(building.offset_z) || 0;

  // 1. Modelo 3D activo
  const model = allModels.find(m => String(m.building_id) === String(building.id));
  if (model) {
    const center = buildingOffsetToGPS(bx, bz);
    return { center, zoom: 18.5, pitch: 62, bearing: -18 };
  }

  // 2. Centroide de hotspots (pos_x/z son locales → se suman al offset del edificio)
  if (hotspots.length > 0) {
    const avgX = hotspots.reduce((s, h) => s + (parseFloat(h.pos_x) || 0), 0) / hotspots.length;
    const avgZ = hotspots.reduce((s, h) => s + (parseFloat(h.pos_z) || 0), 0) / hotspots.length;
    const hasMeaningfulPos = Math.abs(avgX) > 1 || Math.abs(avgZ) > 1;
    const center = hasMeaningfulPos
      ? buildingOffsetToGPS(bx + avgX, bz + avgZ)
      : buildingOffsetToGPS(bx, bz);
    return { center, zoom: 17.8, pitch: 58, bearing: -18 };
  }

  // 3. Solo offset del edificio
  if (bx !== 0 || bz !== 0) {
    return { center: buildingOffsetToGPS(bx, bz), zoom: 17.2, pitch: 55, bearing: -18 };
  }

  return null;
}