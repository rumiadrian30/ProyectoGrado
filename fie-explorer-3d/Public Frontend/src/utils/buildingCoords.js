/**
 * buildingCoords.js
 *
 * Coordenadas GPS reales de cada edificio FIE en el campus ESPOCH.
 * Derivadas de las posiciones Three.js en campusData.js usando:
 *   lat = CENTER_LAT - z * SCALE
 *   lng = CENTER_LNG + x * SCALE
 * donde CENTER = (-1.6535, -78.6785) y SCALE = 0.000045 °/unidad (1u ≈ 5m).
 *
 * Se usa para posicionar modelos GLB y marcadores en el mapa Mapbox.
 */

const CENTER_LAT = -1.6563956619661038;
const CENTER_LNG = -78.67578090982062;
const M_PER_UNIT = 5;        // metros por unidad Three.js
const DEG_PER_METER_LAT = 1 / 111_000;
const DEG_PER_METER_LNG = 1 / 110_960; // ≈ cos(1.65°) * 111km

function toGPS(x, z) {
  return [
    CENTER_LNG + x * M_PER_UNIT * DEG_PER_METER_LNG,
    CENTER_LAT - z * M_PER_UNIT * DEG_PER_METER_LAT,
  ]; // [lng, lat]
}

/** Coordenadas GPS [lng, lat] de edificios FIE, indexadas por código */
export const FIE_COORDS = {
  'FIE-MAIN':    toGPS(  6,  -5),
  'FIE-LAB-SW':  toGPS( 18,  -3),
  'FIE-LAB-EA':  toGPS(  8,   9),
  'FIE-LAB-CEM': toGPS( 28,   2),
  'FIE-ADM':     toGPS( 20,  10),
  'FIE-DG':      toGPS( 35,  -1),
  'FIE-ROB':     toGPS( 38,   7),
  'FIE-AU1':     toGPS(  3,   7),
  'FIE-MOD':     toGPS( 45,   2),
  'FIE-CB':      toGPS( 27,  -9),
};

/** Centro del campus ESPOCH */
export const CAMPUS_CENTER = [CENTER_LNG, CENTER_LAT]; // [lng, lat]

/** Zoom y pitch iniciales del mapa */
export const CAMPUS_VIEW = {
  center:  CAMPUS_CENTER,
  zoom:    20.8,
  pitch:   100,
  bearing: -15,
};

/**
 * Devuelve las coordenadas GPS [lng, lat] de un edificio dado su código.
 * Fallback al centro del campus si el código no existe.
 */
export function getCoords(buildingCode) {
  return FIE_COORDS[buildingCode] ?? CAMPUS_CENTER;
}

/**
 * Escala en metros del radio aproximado de la bounding sphere
 * de un edificio (para zoom automático de la cámara).
 */
export const BUILDING_SIZES = {
  'FIE-MAIN':    { w: 14, d: 10 },
  'FIE-LAB-SW':  { w: 11, d:  9 },
  'FIE-LAB-EA':  { w: 10, d:  8 },
  'FIE-LAB-CEM': { w:  9, d:  7 },
  'FIE-ADM':     { w:  9, d:  7 },
  'FIE-DG':      { w: 10, d:  7 },
  'FIE-ROB':     { w:  8, d:  6 },
  'FIE-AU1':     { w:  8, d:  6 },
  'FIE-MOD':     { w:  9, d:  6 },
  'FIE-CB':      { w:  8, d:  7 },
};
