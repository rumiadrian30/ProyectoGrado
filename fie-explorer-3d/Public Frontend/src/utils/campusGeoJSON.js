/**
 * campusGeoJSON.js
 *
 * Convierte los datos Three.js de campusData.js a GeoJSON con coordenadas
 * reales del campus ESPOCH, Riobamba, Ecuador.
 *
 * Centro del campus: lat -1.6535, lng -78.6785
 * Escala: 1 unidad Three.js ≈ 5 metros
 *   → lat por unidad: 5 / 111_000 ≈ 0.000 045 °
 *   → lng por unidad: 5 / 110_960 ≈ 0.000 045 ° (cos(1.65°) ≈ 0.9996)
 */

const CENTER_LAT = -1.6535;
const CENTER_LNG = -78.6785;
const SCALE = 0.000045; // grados por unidad Three.js

/** Convierte (x, z) Three.js → [lng, lat] real */
function toLL(x, z) {
  return [CENTER_LNG + x * SCALE, CENTER_LAT - z * SCALE];
}

/**
 * Genera un polígono GeoJSON rectangular para un edificio.
 * @param {number} cx  - centro X Three.js
 * @param {number} cz  - centro Z Three.js
 * @param {number} w   - ancho X (unidades)
 * @param {number} d   - profundidad Z (unidades)
 */
function buildingPolygon(cx, cz, w, d) {
  const hw = w / 2;
  const hd = d / 2;
  // Esquinas: SW → SE → NE → NW → SW
  return [
    [
      toLL(cx - hw, cz + hd),
      toLL(cx + hw, cz + hd),
      toLL(cx + hw, cz - hd),
      toLL(cx - hw, cz - hd),
      toLL(cx - hw, cz + hd),
    ],
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// EDIFICIOS FIE  (FIE = Facultad de Informática y Electrónica)
// Marcados en rojo #BC0613 en el visor 3D.
// Cada feature lleva el código del edificio para vincularlo con la BD.
// ──────────────────────────────────────────────────────────────────────────────
export const FIE_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    { x:   6, z:  -5, w: 14, d: 10, h: 12, label: 'Edificio Principal FIE', code: 'FIE-MAIN'   },
    { x:  18, z:  -3, w: 11, d:  9, h: 10, label: 'Lab. Software',          code: 'FIE-LAB-SW' },
    { x:   8, z:   9, w: 10, d:  8, h:  9, label: 'Lab. Electrónica',       code: 'FIE-LAB-EA' },
    { x:  28, z:   2, w:  9, d:  7, h:  8, label: 'Lab. CEM',               code: 'FIE-LAB-CEM'},
    { x:  20, z:  10, w:  9, d:  7, h:  8, label: 'Administrativo FIE',     code: 'FIE-ADM'    },
    { x:  35, z:  -1, w: 10, d:  7, h:  8, label: 'Lab. Diseño Gráfico',    code: 'FIE-DG'     },
    { x:  38, z:   7, w:  8, d:  6, h:  7, label: 'Modular Robótica',       code: 'FIE-ROB'    },
    { x:   3, z:   7, w:  8, d:  6, h:  7, label: 'Aulas FIE norte',        code: 'FIE-AU1'    },
    { x:  45, z:   2, w:  9, d:  6, h:  7, label: 'Bloque Modular Nuevo',   code: 'FIE-MOD'    },
    { x:  27, z:  -9, w:  8, d:  7, h:  9, label: 'Ciencias Básicas',       code: 'FIE-CB'     },
  ].map((b) => ({
    type: 'Feature',
    id: b.code,
    properties: {
      code:   b.code,
      label:  b.label,
      height: b.h * 5,          // metros reales (1 unit = 5 m)
      base:   0,
      type:   'fie',
    },
    geometry: {
      type: 'Polygon',
      coordinates: buildingPolygon(b.x, b.z, b.w, b.d),
    },
  })),
};

// ──────────────────────────────────────────────────────────────────────────────
// OTROS EDIFICIOS ESPOCH  (azul / gris)
// ──────────────────────────────────────────────────────────────────────────────
const OTHER_RAW = [
  { x: -62, z: -62, w: 10, d:  7, h:  9, label: 'Fac. Ciencias'          },
  { x: -52, z: -60, w:  8, d:  6, h:  8, label: 'Fac. Ciencias B'        },
  { x: -58, z: -52, w:  7, d:  6, h:  8, label: 'Fac. Ciencias C'        },
  { x: -48, z: -55, w:  8, d:  6, h:  7, label: 'Lab. Ciencias'          },
  { x: -65, z: -45, w:  7, d:  5, h:  7, label: 'Aulas Ciencias'         },
  { x: -42, z: -63, w:  9, d:  7, h:  9, label: 'Fac. Recursos Naturales'},
  { x: -34, z: -60, w:  8, d:  6, h:  8, label: 'Lab. RN'                },
  { x: -28, z: -65, w:  7, d:  5, h:  7, label: 'Aulas RN'               },
  { x: -22, z: -58, w:  8, d:  6, h:  9, label: 'Fac. Mecánica A'        },
  { x: -12, z: -62, w:  9, d:  7, h: 10, label: 'Fac. Mecánica B'        },
  { x: -18, z: -50, w:  8, d:  7, h:  9, label: 'Lab. Mecánica'          },
  { x:  -8, z: -54, w:  7, d:  6, h:  8, label: 'Taller Mecánica'        },
  { x: -28, z: -45, w:  7, d:  5, h:  7, label: 'Aulas Mecánica'         },
  { x:  -2, z: -60, w:  8, d:  5, h:  8, label: 'Fac. Mecánica C'        },
  { x:  10, z: -52, w: 10, d:  8, h: 10, label: 'Biblioteca Central'     },
  { x:  22, z: -55, w:  9, d:  7, h:  9, label: 'Rectorado'              },
  { x:  30, z: -50, w:  8, d:  6, h:  9, label: 'Vicerrectorado'         },
  { x:  38, z: -55, w:  8, d:  6, h:  8, label: 'Administración Central' },
  { x:  18, z: -42, w:  7, d:  6, h:  7, label: 'Dpto. Financiero'       },
  { x: -70, z: -18, w:  8, d:  6, h:  8, label: 'Fac. Salud Pública A'  },
  { x: -62, z: -22, w:  9, d:  7, h: 10, label: 'Fac. Salud Pública B'  },
  { x: -72, z: -10, w:  7, d:  6, h:  8, label: 'Lab. Salud Pública'    },
  { x: -62, z:  -8, w:  8, d:  6, h:  7, label: 'Aulas Salud Pública'   },
  { x: -45, z: -30, w:  9, d:  7, h:  9, label: 'Fac. Administración A' },
  { x: -35, z: -28, w:  8, d:  7, h:  9, label: 'Fac. Administración B' },
  { x: -48, z: -18, w:  7, d:  6, h:  8, label: 'Lab. Administración'   },
  { x: -38, z: -18, w:  8, d:  6, h:  7, label: 'Aulas Administración'  },
  { x: -28, z: -32, w:  7, d:  5, h:  7, label: 'Centro de Idiomas'     },
  { x: -20, z: -30, w:  8, d:  6, h:  8, label: 'DTIC'                  },
  { x: -15, z: -18, w:  9, d:  7, h: 10, label: 'Fac. Pecuaria A'       },
  { x:  -5, z: -20, w:  8, d:  7, h:  9, label: 'Fac. Pecuaria B'       },
  { x: -12, z: -10, w:  7, d:  6, h:  8, label: 'Lab. Pecuaria'         },
  { x:  -2, z:  -8, w:  7, d:  5, h:  7, label: 'Taller Pecuaria'       },
  { x: -25, z:  -8, w:  8, d:  6, h:  7, label: 'Ganadería'             },
  { x:  58, z: -35, w:  8, d:  6, h:  8, label: 'Edificio I+D A'        },
  { x:  68, z: -30, w:  7, d:  5, h:  7, label: 'Edificio I+D B'        },
  { x:  62, z: -20, w:  8, d:  6, h:  8, label: 'Centro Investigación'  },
  { x: -35, z:  25, w:  9, d:  7, h:  8, label: 'Fac. Agropecuaria A'  },
  { x: -25, z:  28, w:  8, d:  6, h:  8, label: 'Fac. Agropecuaria B'  },
  { x: -40, z:  35, w:  7, d:  5, h:  7, label: 'Lab. Agropecuaria'    },
  { x:  -8, z:  30, w:  9, d:  7, h:  8, label: 'Coliseo Politécnico'  },
  { x:   5, z:  35, w:  8, d:  6, h:  7, label: 'Centro Médico'        },
  { x: -18, z:  35, w:  7, d:  5, h:  6, label: 'Bienestar Estudiantil'},
  { x:  15, z:  30, w:  7, d:  5, h:  6, label: 'Comisariato'          },
  { x:  20, z:  40, w:  9, d:  7, h:  8, label: 'Fac. Civil A'         },
  { x:  30, z:  42, w:  8, d:  6, h:  8, label: 'Fac. Civil B'         },
  { x:  40, z:  45, w:  8, d:  6, h:  7, label: 'Lab. Civil'           },
  { x:  50, z:  40, w:  7, d:  5, h:  7, label: 'Taller Civil'         },
  { x:  62, z:  42, w:  8, d:  6, h:  8, label: 'Fac. Química A'       },
  { x:  72, z:  45, w:  7, d:  5, h:  8, label: 'Fac. Química B'       },
];

export const OTHER_GEOJSON = {
  type: 'FeatureCollection',
  features: OTHER_RAW.map((b, i) => ({
    type: 'Feature',
    id: `other-${i}`,
    properties: {
      code:   `OTHER-${i}`,
      label:  b.label,
      height: b.h * 5,
      base:   0,
      type:   'other',
    },
    geometry: {
      type: 'Polygon',
      coordinates: buildingPolygon(b.x, b.z, b.w, b.d),
    },
  })),
};

// ──────────────────────────────────────────────────────────────────────────────
// PERÍMETRO DEL CAMPUS (polígono exterior)
// Aproximado sobre imagen satelital, en coordenadas reales.
// ──────────────────────────────────────────────────────────────────────────────
export const CAMPUS_BOUNDARY = {
  type: 'Feature',
  properties: { name: 'ESPOCH' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        toLL(-82, -78),
        toLL( 80, -78),
        toLL( 80,  75),
        toLL(-82,  75),
        toLL(-82, -78),
      ],
    ],
  },
};

/** Punto central del campus para centrar el mapa */
export const CAMPUS_CENTER = [CENTER_LNG, CENTER_LAT];
