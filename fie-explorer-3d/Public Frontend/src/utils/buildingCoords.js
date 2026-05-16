/**
 * buildingCoords.js
 *
 * Utilidades de posicionamiento para el visor 3D.
 *
 * ARQUITECTURA DE COORDENADAS:
 *   Anchor GPS fijo = CAMPUS_VIEW.center  (un solo punto para todo el campus)
 *   building.offset_x = desplazamiento Este  en metros (Three.js +X)
 *   building.offset_y = altura              en metros (Three.js +Y)
 *   building.offset_z = desplazamiento Norte en metros (Three.js +Z)
 *
 * Los modelos heredan la posición del edificio padre y solo aplican su escala.
 * La conversión offset → GPS se usa únicamente para el flyTo de la cámara.
 */

// ── Anchor fijo del campus (todos los layers comparten este punto GPS) ────────
export const CAMPUS_VIEW = {
  center:  [-78.67578090982062, -1.6563956619661038],
  zoom:    17.5,
  pitch:   55,
  bearing: -15,
};

// ── Conversión Three.js metros → grados GPS ───────────────────────────────────
// Three.js +X = Este  → longitud positiva
// Three.js +Z = Norte → latitud positiva
const DEG_PER_METER_LAT = 1 / 111_000;
const DEG_PER_METER_LNG = 1 / 110_960;

/**
 * Convierte el offset Three.js del edificio a coordenadas GPS.
 * Se usa para calcular el centro visual (flyTo de cámara).
 * El anchor GPS del layer siempre es CAMPUS_VIEW.center.
 */
export function buildingOffsetToGPS(offset_x = 0, offset_z = 0) {
  return [
    CAMPUS_VIEW.center[0] + offset_x * DEG_PER_METER_LNG,
    CAMPUS_VIEW.center[1] + offset_z * DEG_PER_METER_LAT,
  ];
}

/**
 * Calcula los parámetros de flyTo para centrar la cámara en un edificio.
 *
 * El "centro visual" = anchor + building offset + model offset (para flyTo).
 * El layer Three.js siempre usa CAMPUS_VIEW.center como GPS anchor.
 */
export function computeBuildingFlyTo(building, allModels = [], hotspots = []) {
  if (!building) return null;

  const bx = parseFloat(building.offset_x) || 0;
  const by = parseFloat(building.offset_y) || 0;
  const bz = parseFloat(building.offset_z) || 0;

  // ── 1. Modelo 3D activo ───────────────────────────────────────────────────────
  const model = allModels.find(m => String(m.building_id) === String(building.id));
  if (model) {
    // Para el flyTo la cámara apunta al centro visual del modelo
    // = building position (ya que model offset siempre es 0)
    const center = buildingOffsetToGPS(bx, bz);
    return { center, zoom: 18.5, pitch: 62, bearing: -18 };
  }

  // ── 2. Centroide de hotspots ──────────────────────────────────────────────────
  if (hotspots.length > 0) {
    const avgX = hotspots.reduce((s, h) => s + (parseFloat(h.pos_x) || 0), 0) / hotspots.length;
    const avgZ = hotspots.reduce((s, h) => s + (parseFloat(h.pos_z) || 0), 0) / hotspots.length;
    const hasMeaningfulPos = Math.abs(avgX) > 1 || Math.abs(avgZ) > 1;
    const center = hasMeaningfulPos
      ? buildingOffsetToGPS(bx + avgX, bz + avgZ)
      : buildingOffsetToGPS(bx, bz);
    return { center, zoom: 17.8, pitch: 58, bearing: -18 };
  }

  // ── 3. Solo offset del edificio ───────────────────────────────────────────────
  if (bx !== 0 || bz !== 0) {
    return { center: buildingOffsetToGPS(bx, bz), zoom: 17.2, pitch: 55, bearing: -18 };
  }

  // ── 4. Sin offset configurado → vista del campus ──────────────────────────────
  return null;
}