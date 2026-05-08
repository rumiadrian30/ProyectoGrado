/**
 * campusData.js
 * Datos del campus ESPOCH extraídos del mapa satelital.
 * Coordenadas en espacio Three.js (1 unidad ≈ 5 metros).
 * El campus completo abarca aprox. 200×150 unidades centradas en (0,0).
 *
 * Ejes:
 *   X → Este (+) / Oeste (-)
 *   Z → Sur (+) / Norte (-)
 *
 * La cámara inicial mira desde arriba-norte hacia el sur para ver
 * el campus completo tal como aparece en el mapa.
 */

// ─── Configuración de cámara para vista completa del campus ─────────────────
export const CAMPUS_CAMERA = {
  position: { x: 0, y: 120, z: 160 },
  target:   { x: 0, y: 0,   z: 0   },
};

// ─── Áreas verdes (campos, estadios, parques) ───────────────────────────────
// Planos planos, ligeramente elevados del suelo
export const GREEN_AREAS = [
  // Campo grande norte (llanura de Tapi / zona deportiva superior)
  { x: -30, z: -40, w: 55, d: 38, label: 'Campo norte' },
  // Estadio principal (área inferior-centro)
  { x: -15, z:  60, w: 32, d: 22, label: 'Estadio principal' },
  // Cancha auxiliar
  { x:  18, z:  62, w: 22, d: 14, label: 'Canchas auxiliares' },
  // Zona verde central
  { x:  -5, z:  12, w: 14, d: 10, label: 'Área verde central' },
  // Pequeña zona verde derecha
  { x:  55, z:  -5, w: 12, d:  8, label: 'Área verde este' },
];

// ─── Edificios FIE — color rojo #BC0613 ────────────────────────────────────
// Cluster en la zona centro-derecha del campus
export const FIE_BUILDINGS = [
  // Edificio Principal FIE (más grande, referencia)
  { x:   36, z:  -5, w: 14, d: 10, h: 12, label: 'Edificio Principal FIE',  code: 'FIE-MAIN' },
  // Lab Software / Abejita
  { x:  18, z:  -3, w: 11, d:  9, h: 10, label: 'Lab. Software',           code: 'FIE-LAB-SW' },
  // Lab Electrónica y Automatización
  { x:   8, z:   9, w: 10, d:  8, h:  9, label: 'Lab. Electrónica',        code: 'FIE-LAB-EA' },
  // Lab Compatibilidad Electromagnética
  { x:  28, z:   2, w:  9, d:  7, h:  8, label: 'Lab. CEM',                code: 'FIE-LAB-CEM' },
  // Edificio Administrativo FIE
  { x:  20, z:  10, w:  9, d:  7, h:  8, label: 'Administrativo FIE',      code: 'FIE-ADM' },
  // Lab. Diseño Gráfico FIE
  { x:  35, z:  -1, w: 10, d:  7, h:  8, label: 'Lab. Diseño Gráfico',     code: 'FIE-DG' },
  // Modular Robótica
  { x:  38, z:   7, w:  8, d:  6, h:  7, label: 'Modular Robótica',        code: 'FIE-ROB' },
  // Aulas FIE norte
  { x:   3, z:   7, w:  8, d:  6, h:  7, label: 'Aulas FIE norte',         code: 'FIE-AU1' },
  // Bloque modular nuevo
  { x:  45, z:   2, w:  9, d:  6, h:  7, label: 'Bloque Modular Nuevo',    code: 'FIE-MOD' },
  // Ciencias Básicas FIE
  { x:  27, z:  -9, w:  8, d:  7, h:  9, label: 'Ciencias Básicas',        code: 'FIE-CB' },
];

// ─── Otros edificios ESPOCH — color azul ───────────────────────────────────
// Identificados del mapa, distribuidos por todo el campus
export const OTHER_BUILDINGS = [
  // ── Zona superior-izquierda (norte) ──
  { x: -62, z: -62, w: 10, d:  7, h:  9, label: 'Fac. Ciencias'         },
  { x: -52, z: -60, w:  8, d:  6, h:  8, label: 'Fac. Ciencias B'       },
  { x: -58, z: -52, w:  7, d:  6, h:  8, label: 'Fac. Ciencias C'       },
  { x: -48, z: -55, w:  8, d:  6, h:  7, label: 'Lab. Ciencias'         },
  { x: -65, z: -45, w:  7, d:  5, h:  7, label: 'Aulas Ciencias'        },
  { x: -42, z: -63, w:  9, d:  7, h:  9, label: 'Fac. Recursos Naturales'},
  { x: -34, z: -60, w:  8, d:  6, h:  8, label: 'Lab. RN'               },
  { x: -28, z: -65, w:  7, d:  5, h:  7, label: 'Aulas RN'              },
  { x: -45, z: -72, w:  8, d:  5, h:  6, label: 'Módulo norte'          },
  { x: -30, z: -70, w:  5, d:  4, h:  5, label: 'Caseta norte'          },

  // ── Zona superior-centro (norte-centro) ──
  { x: -22, z: -58, w:  8, d:  6, h:  9, label: 'Fac. Mecánica A'       },
  { x: -12, z: -62, w:  9, d:  7, h: 10, label: 'Fac. Mecánica B'       },
  { x: -18, z: -50, w:  8, d:  7, h:  9, label: 'Lab. Mecánica'         },
  { x:  -8, z: -54, w:  7, d:  6, h:  8, label: 'Taller Mecánica'       },
  { x: -28, z: -45, w:  7, d:  5, h:  7, label: 'Aulas Mecánica'        },
  { x:  -2, z: -60, w:  8, d:  5, h:  8, label: 'Fac. Mecánica C'       },

  // ── Bloque central-norte ──
  { x:  10, z: -52, w: 10, d:  8, h: 10, label: 'Biblioteca Central'    },
  { x:  22, z: -55, w:  9, d:  7, h:  9, label: 'Rectorado'             },
  { x:  30, z: -50, w:  8, d:  6, h:  9, label: 'Vicerrectorado'        },
  { x:  38, z: -55, w:  8, d:  6, h:  8, label: 'Administración Central'},
  { x:  18, z: -42, w:  7, d:  6, h:  7, label: 'Dpto. Financiero'      },

  // ── Zona izquierda-media (Longitudinal 1) ──
  { x: -70, z: -18, w:  8, d:  6, h:  8, label: 'Fac. Salud Pública A'  },
  { x: -62, z: -22, w:  9, d:  7, h: 10, label: 'Fac. Salud Pública B'  },
  { x: -72, z: -10, w:  7, d:  6, h:  8, label: 'Lab. Salud Pública'    },
  { x: -62, z:  -8, w:  8, d:  6, h:  7, label: 'Aulas Salud Pública'   },
  { x: -70, z:   0, w:  7, d:  5, h:  7, label: 'Módulo Salud'          },
  { x: -60, z:  -2, w:  6, d:  5, h:  6, label: 'Caseta Salud'          },

  // ── Zona centro-izquierda ──
  { x: -45, z: -30, w:  9, d:  7, h:  9, label: 'Fac. Administración A' },
  { x: -35, z: -28, w:  8, d:  7, h:  9, label: 'Fac. Administración B' },
  { x: -48, z: -18, w:  7, d:  6, h:  8, label: 'Lab. Administración'   },
  { x: -38, z: -18, w:  8, d:  6, h:  7, label: 'Aulas Administración'  },
  { x: -28, z: -32, w:  7, d:  5, h:  7, label: 'Centro de Idiomas'     },
  { x: -20, z: -30, w:  8, d:  6, h:  8, label: 'DTIC'                  },

  // ── Zona centro (corredor principal) ──
  { x: -15, z: -18, w:  9, d:  7, h: 10, label: 'Fac. Pecuaria A'       },
  { x:  -5, z: -20, w:  8, d:  7, h:  9, label: 'Fac. Pecuaria B'       },
  { x: -12, z: -10, w:  7, d:  6, h:  8, label: 'Lab. Pecuaria'         },
  { x:  -2, z:  -8, w:  7, d:  5, h:  7, label: 'Taller Pecuaria'       },
  { x: -25, z:  -8, w:  8, d:  6, h:  7, label: 'Ganadería'             },

  // ── Zona derecha-norte (Longitudinal 3 derecha) ──
  { x:  58, z: -35, w:  8, d:  6, h:  8, label: 'Edificio I+D A'        },
  { x:  68, z: -30, w:  7, d:  5, h:  7, label: 'Edificio I+D B'        },
  { x:  62, z: -20, w:  8, d:  6, h:  8, label: 'Centro Investigación'   },
  { x:  72, z: -12, w:  7, d:  5, h:  7, label: 'Lab. I+D'              },
  { x:  65, z:  -5, w:  7, d:  5, h:  7, label: 'Módulo Investigación'   },

  // ── Zona inferior-izquierda ──
  { x: -35, z:  25, w:  9, d:  7, h:  8, label: 'Fac. Agropecuaria A'   },
  { x: -25, z:  28, w:  8, d:  6, h:  8, label: 'Fac. Agropecuaria B'   },
  { x: -40, z:  35, w:  7, d:  5, h:  7, label: 'Lab. Agropecuaria'     },
  { x: -30, z:  38, w:  7, d:  5, h:  6, label: 'Galpón Agropecuaria'   },
  { x: -48, z:  28, w:  6, d:  5, h:  6, label: 'Invernadero'           },

  // ── Zona inferior-centro ──
  { x:  -8, z:  30, w:  9, d:  7, h:  8, label: 'Coliseo Politécnico'   },
  { x:   5, z:  35, w:  8, d:  6, h:  7, label: 'Centro Médico'         },
  { x: -18, z:  35, w:  7, d:  5, h:  6, label: 'Bienestar Estudiantil' },
  { x:  15, z:  30, w:  7, d:  5, h:  6, label: 'Comisariato'           },

  // ── Zona inferior-derecha (cluster denso) ──
  { x:  20, z:  40, w:  9, d:  7, h:  8, label: 'Fac. Civil A'          },
  { x:  30, z:  42, w:  8, d:  6, h:  8, label: 'Fac. Civil B'          },
  { x:  40, z:  45, w:  8, d:  6, h:  7, label: 'Lab. Civil'            },
  { x:  50, z:  40, w:  7, d:  5, h:  7, label: 'Taller Civil'          },
  { x:  22, z:  52, w:  8, d:  6, h:  7, label: 'Fac. Civil C'          },
  { x:  35, z:  55, w:  7, d:  5, h:  7, label: 'Módulo Civil'          },
  { x:  50, z:  52, w:  7, d:  5, h:  6, label: 'Caseta Civil'          },
  { x:  62, z:  42, w:  8, d:  6, h:  8, label: 'Fac. Química A'        },
  { x:  72, z:  45, w:  7, d:  5, h:  8, label: 'Fac. Química B'        },
  { x:  68, z:  55, w:  7, d:  5, h:  7, label: 'Lab. Química'          },
  { x:  60, z:  58, w:  6, d:  5, h:  6, label: 'Taller Química'        },

  // ── Zona inferior (extremo sur) ──
  { x:  30, z:  65, w:  8, d:  6, h:  7, label: 'Módulo Sur A'          },
  { x:  45, z:  68, w:  7, d:  5, h:  6, label: 'Módulo Sur B'          },
  { x:  58, z:  65, w:  7, d:  5, h:  6, label: 'Módulo Sur C'          },
  { x:   8, z:  68, w:  8, d:  6, h:  6, label: 'Servicios Sur'         },
  { x: -10, z:  65, w:  7, d:  5, h:  5, label: 'Cafetería Sur'         },

  // ── Casetas y módulos pequeños dispersos ──
  { x: -55, z:   8, w:  5, d:  4, h:  5, label: 'Módulo pequeño A'      },
  { x: -42, z:  12, w:  5, d:  4, h:  5, label: 'Módulo pequeño B'      },
  { x:  42, z: -20, w:  5, d:  4, h:  5, label: 'Módulo pequeño C'      },
  { x:  55, z:  20, w:  5, d:  4, h:  4, label: 'Módulo pequeño D'      },
  { x: -18, z:  48, w:  6, d:  4, h:  4, label: 'Módulo pequeño E'      },
];

// ─── Rutas / caminos del campus ────────────────────────────────────────────
// [x1, z1, x2, z2, ancho]  — segmentos de los ejes longitudinales
export const ROADS = [
  // Eje Longitudinal 1 (principal, de norte a sur)
  [-80, -80,  -80,  80, 5],
  // Eje Longitudinal 2
  [ -5, -80,   -5,  80, 4],
  // Eje Longitudinal 3
  [  0, -80,    0,  80, 4],
  // Transversal norte
  [-80, -55,   80, -55, 3.5],
  // Transversal media
  [-80,  -5,   80,  -5, 3.5],
  // Transversal sur
  [-80,  40,   80,  40, 3.5],
  // Accesos y conexiones
  [-80, -30,   80, -30, 3],
  [-80,  18,   80,  18, 3],
];