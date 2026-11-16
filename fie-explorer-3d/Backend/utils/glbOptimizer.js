/**
 * utils/glbOptimizer.js — GeoESPOCH 3D
 * ─────────────────────────────────────────────────────────────────────────────
 * Optimiza un archivo .glb para el visor web:
 *
 *   1. Texturas PNG/JPEG → WebP (calidad 80, máx. 2048 px por lado).
 *      En los modelos fotogramétricos las texturas PNG representan más del 90 %
 *      del peso del archivo; WebP reduce ese peso entre 5 y 10 veces sin
 *      pérdida visible.
 *   2. Geometría: soldado de vértices, deduplicación, poda de datos sin uso y
 *      compresión EXT_meshopt_compression (decodificador incluido en Three.js,
 *      sin dependencias de CDN).
 *   3. Simplificación automática de mallas gigantes (> 600 k triángulos).
 *   4. Elimina KHR_materials_specular / KHR_materials_ior (fuerzan
 *      MeshPhysicalMaterial, un shader más caro, sin aporte visual en modelos
 *      fotogramétricos).
 *
 * El archivo original se respalda en `uploads/models-original/` y el
 * optimizado reemplaza al original de forma atómica (escritura en .tmp +
 * rename). Un marcador en `asset.extras` evita re-optimizar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const OPTIMIZER_VERSION = 1;
const MAX_TEXTURE_SIZE  = parseInt(process.env.GLB_MAX_TEXTURE, 10) || 2048;
const TEXTURE_QUALITY   = parseInt(process.env.GLB_TEXTURE_QUALITY, 10) || 80;
const SIMPLIFY_ABOVE    = 600_000; // triángulos
const DROP_EXTENSIONS   = new Set([
  'KHR_materials_specular',
  'KHR_materials_ior',
  'KHR_draco_mesh_compression', // se recomprime con meshopt
]);

let ioPromise = null;

async function getIO() {
  if (ioPromise) return ioPromise;

  ioPromise = (async () => {
    const { NodeIO }         = require('@gltf-transform/core');
    const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
    const { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } = require('meshoptimizer');
    const draco3d = require('draco3d');

    await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);

    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
        'meshopt.encoder': MeshoptEncoder,
        'meshopt.decoder': MeshoptDecoder,
      });

    return io;
  })();

  return ioPromise;
}

function countTriangles(doc) {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices  = prim.getIndices();
      const position = prim.getAttribute('POSITION');
      const count    = indices ? indices.getCount() : (position ? position.getCount() : 0);
      tris += count / 3;
    }
  }
  return Math.round(tris);
}

function mb(bytes) {
  return +(bytes / (1024 * 1024)).toFixed(2);
}

/**
 * Optimiza un .glb en el sitio.
 *
 * @param {string} filePath  Ruta absoluta del .glb
 * @param {object} [opts]
 * @param {boolean} [opts.force=false]   Re-optimizar aunque ya tenga marcador
 * @param {string}  [opts.backupDir]     Carpeta de respaldo (default: ../models-original)
 * @param {number}  [opts.maxTexture]    Lado máximo de textura
 * @param {number}  [opts.quality]       Calidad WebP (1-100)
 * @param {(msg:string)=>void} [opts.log]
 * @returns {Promise<{skipped:boolean, reason?:string, before:object, after?:object}>}
 */
async function optimizeGlbFile(filePath, opts = {}) {
  const {
    force      = false,
    backupDir  = path.join(path.dirname(filePath), '..', 'models-original'),
    maxTexture = MAX_TEXTURE_SIZE,
    quality    = TEXTURE_QUALITY,
    log        = () => {},
  } = opts;

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.glb') {
    return { skipped: true, reason: 'solo .glb', before: { sizeMb: mb(fs.statSync(filePath).size) } };
  }

  const {
    dedup, prune, weld, textureCompress, meshopt, simplify, resample,
  } = require('@gltf-transform/functions');
  const { MeshoptEncoder, MeshoptSimplifier } = require('meshoptimizer');
  const sharp = require('sharp');

  const io  = await getIO();
  const doc = await io.read(filePath);
  const root = doc.getRoot();

  const sizeBefore = fs.statSync(filePath).size;
  const trisBefore = countTriangles(doc);
  const texBefore  = root.listTextures().length;

  const extras = root.getExtras() || {};
  const marker = extras.geoespoch_optimized;

  if (marker && marker.v >= OPTIMIZER_VERSION && !force) {
    return {
      skipped: true,
      reason: 'ya optimizado',
      before: { sizeMb: mb(sizeBefore), triangles: trisBefore, textures: texBefore },
    };
  }

  log(`  → ${path.basename(filePath)}: ${mb(sizeBefore)} MB, ${trisBefore.toLocaleString()} tris, ${texBefore} texturas`);

  // ── 1. Extensiones que no aportan en web ──────────────────────────────────
  for (const extension of root.listExtensionsUsed()) {
    if (DROP_EXTENSIONS.has(extension.extensionName)) {
      extension.dispose();
    }
  }

  // ── 2. Geometría ──────────────────────────────────────────────────────────
  const transforms = [
    dedup(),
    weld(),
    resample(),
    prune(),
  ];

  if (trisBefore > SIMPLIFY_ABOVE) {
    const ratio = Math.min(0.75, Math.max(0.35, SIMPLIFY_ABOVE / trisBefore));
    log(`    simplificando malla (${trisBefore.toLocaleString()} tris → ~${Math.round(trisBefore * ratio).toLocaleString()})`);
    transforms.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0008, lockBorder: true }));
  }

  // ── 3. Texturas → WebP ────────────────────────────────────────────────────
  transforms.push(
    textureCompress({
      encoder:      sharp,
      targetFormat: 'webp',
      quality,
      effort:       4,
      resize:       [maxTexture, maxTexture],
    })
  );

  // ── 4. Compresión meshopt (incluye cuantización) ──────────────────────────
  transforms.push(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));

  await doc.transform(...transforms);

  root.setExtras({
    ...extras,
    geoespoch_optimized: { v: OPTIMIZER_VERSION, at: new Date().toISOString() },
  });

  // ── 5. Respaldo + escritura atómica ───────────────────────────────────────
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, path.basename(filePath));
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }

  const tmpPath = filePath.replace(/\.glb$/i, `.opt-${process.pid}.glb`);
  await io.write(tmpPath, doc);
  fs.renameSync(tmpPath, filePath);

  const sizeAfter = fs.statSync(filePath).size;
  const trisAfter = countTriangles(doc);
  const texAfter  = root.listTextures().length;

  log(`    ✔ ${mb(sizeAfter)} MB (−${Math.round((1 - sizeAfter / sizeBefore) * 100)} %), ${trisAfter.toLocaleString()} tris`);

  return {
    skipped: false,
    before: { sizeMb: mb(sizeBefore), triangles: trisBefore, textures: texBefore },
    after:  { sizeMb: mb(sizeAfter),  triangles: trisAfter,  textures: texAfter, backup: backupPath },
  };
}

module.exports = { optimizeGlbFile, OPTIMIZER_VERSION };
