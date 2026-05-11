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
 *
 * computeBuildingFlyTo – calcula dinámicamente los parámetros de flyTo según:
 *   1. Modelo 3D registrado en el admin (coordenadas + offsets del admin → GPS)
 *   2. Centroide de hotspots del edificio (pos_x/pos_z como metros de escena)
 *   3. Fallback: coordenadas estáticas del campus
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

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Zoom adaptativo: reduce ligeramente el nivel para edificios más grandes
 * de modo que quepan bien encuadrados al hacer flyTo.
 * Resultado clampado a [15.5, 19.5].
 *
 * @param {string} buildingCode
 * @param {number} baseZoom     Punto de partida según la fuente de coords
 */
function adaptiveZoom(buildingCode, baseZoom) {
  const size = BUILDING_SIZES[buildingCode];
  if (!size) return baseZoom;
  // Referencia neutra: 12 m. Más grande → reduce zoom; más pequeño → sube zoom.
  const maxDim   = Math.max(size.w, size.d);
  const adjusted = baseZoom - Math.log2(maxDim / 12) * 0.55;
  return Math.max(20.5, Math.min(22.5, adjusted));
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Calcula dinámicamente los parámetros óptimos de flyTo para centrar la
 * cámara en un edificio, priorizando la información configurada en el admin.
 *
 * Jerarquía de fuentes:
 *   1. Modelo 3D del edificio → ancla GPS del modelo + offsets (m de escena)
 *   2. Centroide de hotspots  → pos_x/pos_z convertidos a delta GPS
 *   3. Coordenadas estáticas  → FIE_COORDS[building.code] o campus center
 *
 * En el layer Three.js de Mapbox:
 *   - offset_x / pos_x positivo → desplazamiento al este  (lng+)
 *   - offset_z / pos_z positivo → desplazamiento al sur   (lat-)
 *
 * @param {object}   building   Objeto edificio con al menos { id, code }
 * @param {object[]} allModels  Modelos activos cargados (de modelsService.getAllActive)
 * @param {object[]} hotspots   Hotspots del edificio actualmente cargados
 * @returns {{ center:[lng,lat], zoom:number, pitch:number, bearing:number } | null}
 */
export function computeBuildingFlyTo(building, allModels = [], hotspots = []) {
  if (!building) return null;

  const code = building.code;

  // ── 1. Modelo 3D registrado en el admin ─────────────────────────────────────
  const model = allModels.find(m => m.building_id === building.id);
  if (model) {
    // building_code viene del JOIN en el backend — lo usamos como clave de ancla
    const base = FIE_COORDS[model.building_code ?? code] ?? CAMPUS_CENTER;

    // Ajuste fino con los offsets configurados en el admin (metros de escena → °)
    const ox = parseFloat(model.offset_x) || 0;
    const oz = parseFloat(model.offset_z) || 0;

    const center = [
      base[0] + ox * DEG_PER_METER_LNG,
      base[1] - oz * DEG_PER_METER_LAT,
    ];

    return {
      center,
      zoom:    adaptiveZoom(code, 18.5),
      pitch:   62,
      bearing: -18,
    };
  }

  // ── 2. Centroide de hotspots del edificio ────────────────────────────────────
  const bHotspots = hotspots.filter(
    h => h.building_id === building.id && h.is_active !== false,
  );

  if (bHotspots.length > 0) {
    const base = FIE_COORDS[code] ?? CAMPUS_CENTER;

    const avgX = bHotspots.reduce((s, h) => s + (parseFloat(h.pos_x) || 0), 0) / bHotspots.length;
    const avgZ = bHotspots.reduce((s, h) => s + (parseFloat(h.pos_z) || 0), 0) / bHotspots.length;

    // Solo desplazar si los hotspots tienen posición real (no son todos cero)
    const hasMeaningfulPos = Math.abs(avgX) > 1 || Math.abs(avgZ) > 1;
    const center = hasMeaningfulPos
      ? [
          base[0] + avgX * DEG_PER_METER_LNG,
          base[1] - avgZ * DEG_PER_METER_LAT,
        ]
      : base;

    return {
      center,
      zoom:    adaptiveZoom(code, 17.8),
      pitch:   58,
      bearing: -18,
    };
  }

  // ── 3. Fallback: coordenadas estáticas del campus ────────────────────────────
  return {
    center:  FIE_COORDS[code] ?? CAMPUS_CENTER,
    zoom:    adaptiveZoom(code, 17.2),
    pitch:   55,
    bearing: -18,
  };
}