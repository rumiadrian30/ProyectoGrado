/**
 * texturePrivacyBlur.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitario de privacidad que aplica desenfoque gaussiano (Gaussian Blur)
 * sobre zonas de una textura que contengan personas o vehículos.
 *
 * Cumple HT-10: "Mostrar texturas exteriores con desenfoque en zonas con
 * personas/vehículos."
 *
 * FUNCIONAMIENTO:
 *   1. Recibe un HTMLImageElement o una URL de imagen.
 *   2. Pinta la imagen en un <canvas> offscreen.
 *   3. Para cada zona de privacidad definida (bounding-box UV o píxeles)
 *      aplica un filtro gaussiano mediante stacked box-blur (O(n) por canal).
 *   4. Devuelve un THREE.CanvasTexture listo para asignar a un material.
 *
 * USO BÁSICO:
 *   import { blurPrivacyZones, AUTO_ZONES } from './texturePrivacyBlur';
 *   import * as THREE from 'three';
 *
 *   const texture = await blurPrivacyZones('/textures/exterior.jpg', AUTO_ZONES.GROUND_LEVEL);
 *   material.map = texture;
 *   material.needsUpdate = true;
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';

// ─── Tipos ────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} PrivacyZone
 * @property {number} x      - Coordenada X del inicio del rectángulo (píxeles o fracción UV 0–1)
 * @property {number} y      - Coordenada Y del inicio del rectángulo
 * @property {number} width  - Ancho del rectángulo
 * @property {number} height - Alto del rectángulo
 * @property {'px'|'uv'} unit - Unidad: 'px' para píxeles, 'uv' para fracciones 0–1
 * @property {number} [sigma] - Intensidad del blur (sigma gaussiano, default 12)
 */

// ─── Zonas predefinidas para casos comunes ────────────────────────────────────
/**
 * Zonas de privacidad predefinidas para texturas exteriores de campus.
 * Se usan como referencia; en producción se calibran por edificio.
 */
export const AUTO_ZONES = {
  /** Banda inferior de la textura — nivel de calle, donde aparecen personas/vehículos */
  GROUND_LEVEL: [
    { x: 0, y: 0.65, width: 1, height: 0.35, unit: 'uv', sigma: 14 },
  ],
  /** Zona de estacionamiento (tercio inferior-izquierdo) */
  PARKING_AREA: [
    { x: 0, y: 0.70, width: 0.5, height: 0.30, unit: 'uv', sigma: 16 },
  ],
  /** Toda la textura — máxima privacidad */
  FULL_BLUR: [
    { x: 0, y: 0, width: 1, height: 1, unit: 'uv', sigma: 18 },
  ],
  /** Sin desenfoque */
  NONE: [],
};

// ─── Implementación del blur gaussiano ────────────────────────────────────────

/**
 * Aplica un box-blur 1D sobre un canal de un ImageData.
 * Se llama 3 veces apiladas para aproximar un gaussiano (central limit theorem).
 * Complejidad: O(w × h) independiente del radio.
 *
 * @param {Uint8ClampedArray} data    - datos RGBA del canvas
 * @param {number} w                  - ancho total del canvas
 * @param {number} h                  - alto total del canvas
 * @param {number} rx                 - inicio x de la zona (en píxeles)
 * @param {number} ry                 - inicio y de la zona
 * @param {number} rw                 - ancho de la zona
 * @param {number} rh                 - alto de la zona
 * @param {number} r                  - radio del box-blur (en píxeles)
 */
function boxBlurRegionH(data, w, _h, rx, ry, rw, rh, r) {
  const tmp = new Float32Array(rw * rh * 4);

  for (let y = 0; y < rh; y++) {
    for (let ch = 0; ch < 4; ch++) {
      let sum = 0;
      const count = Math.min(r + 1, rw);

      // Inicializar ventana
      for (let i = 0; i <= r && i < rw; i++) {
        sum += data[((ry + y) * w + (rx + i)) * 4 + ch];
      }

      for (let x = 0; x < rw; x++) {
        tmp[(y * rw + x) * 4 + ch] = sum / count;
        const addIdx = x + r + 1;
        const subIdx = x - r;
        if (addIdx < rw) sum += data[((ry + y) * w + (rx + addIdx)) * 4 + ch];
        if (subIdx >= 0) sum -= data[((ry + y) * w + (rx + subIdx)) * 4 + ch];
      }
    }
  }

  // Escribir resultado horizontal
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const dst = ((ry + y) * w + (rx + x)) * 4;
      const src = (y * rw + x) * 4;
      data[dst]     = tmp[src];
      data[dst + 1] = tmp[src + 1];
      data[dst + 2] = tmp[src + 2];
      data[dst + 3] = tmp[src + 3];
    }
  }
}

function boxBlurRegionV(data, w, _h, rx, ry, rw, rh, r) {
  const tmp = new Float32Array(rw * rh * 4);

  for (let x = 0; x < rw; x++) {
    for (let ch = 0; ch < 4; ch++) {
      let sum = 0;
      const count = Math.min(r + 1, rh);

      for (let i = 0; i <= r && i < rh; i++) {
        sum += data[((ry + i) * w + (rx + x)) * 4 + ch];
      }

      for (let y = 0; y < rh; y++) {
        tmp[(y * rw + x) * 4 + ch] = sum / count;
        const addIdx = y + r + 1;
        const subIdx = y - r;
        if (addIdx < rh) sum += data[((ry + addIdx) * w + (rx + x)) * 4 + ch];
        if (subIdx >= 0) sum -= data[((ry + subIdx) * w + (rx + x)) * 4 + ch];
      }
    }
  }

  // Escribir resultado vertical
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const dst = ((ry + y) * w + (rx + x)) * 4;
      const src = (y * rw + x) * 4;
      data[dst]     = tmp[src];
      data[dst + 1] = tmp[src + 1];
      data[dst + 2] = tmp[src + 2];
      data[dst + 3] = tmp[src + 3];
    }
  }
}

/**
 * Aplica blur gaussiano (3 × box-blur) a una región rectangular del ImageData.
 *
 * @param {ImageData} imageData
 * @param {number} rx - píxel x inicio
 * @param {number} ry - píxel y inicio
 * @param {number} rw - ancho en píxeles
 * @param {number} rh - alto en píxeles
 * @param {number} sigma - intensidad (sigma gaussiano ≈ 0.6 × radius)
 */
function applyGaussianBlurToRegion(imageData, rx, ry, rw, rh, sigma) {
  const { data, width, height } = imageData;

  // Convertir sigma → radio del box-blur equivalente
  const radius = Math.max(1, Math.round(sigma * 1.65));

  // Clampar zona al canvas
  const x0 = Math.max(0, rx);
  const y0 = Math.max(0, ry);
  const x1 = Math.min(width,  rx + rw);
  const y1 = Math.min(height, ry + rh);
  const w  = x1 - x0;
  const h  = y1 - y0;
  if (w <= 0 || h <= 0) return;

  // 3 pasadas de box-blur para aproximar gaussiano
  for (let pass = 0; pass < 3; pass++) {
    boxBlurRegionH(data, width, height, x0, y0, w, h, radius);
    boxBlurRegionV(data, width, height, x0, y0, w, h, radius);
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Carga una imagen y aplica desenfoque gaussiano a las zonas indicadas.
 * Devuelve un THREE.CanvasTexture listo para usar en materiales Three.js.
 *
 * @param {string|HTMLImageElement} source  - URL o elemento <img> ya cargado
 * @param {PrivacyZone[]} zones             - Zonas de privacidad a desenfocadas
 * @param {Object} [options]
 * @param {number} [options.maxSize=2048]   - Tamaño máximo del canvas (en píxeles)
 * @returns {Promise<THREE.CanvasTexture>}
 */
export async function blurPrivacyZones(source, zones = [], options = {}) {
  const { maxSize = 2048 } = options;

  // ── 1. Cargar imagen ──────────────────────────────────────
  const img = await loadImage(source);

  // ── 2. Crear canvas offscreen ────────────────────────────
  const scale  = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const cw     = Math.floor(img.naturalWidth  * scale);
  const ch     = Math.floor(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width  = cw;
  canvas.height = ch;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, cw, ch);

  // ── 3. Aplicar blur en cada zona ──────────────────────────
  if (zones.length > 0) {
    const imageData = ctx.getImageData(0, 0, cw, ch);

    for (const zone of zones) {
      const sigma = zone.sigma ?? 12;
      let rx, ry, rw, rh;

      if (zone.unit === 'uv') {
        rx = Math.round(zone.x * cw);
        ry = Math.round(zone.y * ch);
        rw = Math.round(zone.width  * cw);
        rh = Math.round(zone.height * ch);
      } else {
        rx = Math.round(zone.x * scale);
        ry = Math.round(zone.y * scale);
        rw = Math.round(zone.width  * scale);
        rh = Math.round(zone.height * scale);
      }

      applyGaussianBlurToRegion(imageData, rx, ry, rw, rh, sigma);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ── 4. Crear CanvasTexture ────────────────────────────────
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Procesa todas las texturas de un objeto THREE.Mesh/Group cargado desde GLB,
 * aplicando blur a las zonas indicadas en cada mapa de textura (map, normalMap, etc.).
 *
 * Útil para aplicar privacidad de forma automática a todos los materiales
 * de un modelo 3D tras cargarlo con GLTFLoader.
 *
 * @param {THREE.Object3D} model     - Objeto raíz del modelo GLB
 * @param {PrivacyZone[]}  zones     - Zonas de privacidad
 * @param {Object} [options]
 * @param {string[]} [options.mapKeys] - Mapas a procesar (default: solo 'map')
 * @returns {Promise<void>}
 */
export async function blurModelTextures(model, zones = [], options = {}) {
  const { mapKeys = ['map'] } = options;

  if (zones.length === 0) return;

  // Recopilar materiales únicos
  const materialsSet = new Set();
  model.traverse((obj) => {
    if (obj.isMesh) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m && materialsSet.add(m));
    }
  });

  // Procesar cada material
  const tasks = [];
  for (const mat of materialsSet) {
    for (const key of mapKeys) {
      const tex = mat[key];
      if (!tex || !tex.image) continue;

      tasks.push(
        blurPrivacyZones(tex.image, zones)
          .then((blurred) => {
            // Copiar propiedades de la textura original
            blurred.wrapS     = tex.wrapS;
            blurred.wrapT     = tex.wrapT;
            blurred.repeat    = tex.repeat;
            blurred.offset    = tex.offset;
            blurred.rotation  = tex.rotation;
            blurred.center    = tex.center;
            blurred.flipY     = tex.flipY;

            mat[key]           = blurred;
            mat.needsUpdate    = true;
          })
          .catch((err) => {
            console.warn(`[PrivacyBlur] No se pudo procesar textura "${key}":`, err);
          })
      );
    }
  }

  await Promise.all(tasks);
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Carga una imagen desde URL o devuelve el elemento si ya está cargado.
 * @param {string|HTMLImageElement} source
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(source) {
  if (source instanceof HTMLImageElement && source.complete) {
    return Promise.resolve(source);
  }

  return new Promise((resolve, reject) => {
    const img = source instanceof HTMLImageElement ? source : new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = (e) => reject(new Error(`No se pudo cargar la imagen: ${img.src} — ${e}`));
    if (typeof source === 'string') img.src = source;
    else if (!img.complete) img.src = img.src; // re-trigger si no ha cargado
  });
}
