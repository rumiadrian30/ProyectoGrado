#!/usr/bin/env node
/**
 * scripts/optimizeModels.js — GeoESPOCH 3D
 *
 * Optimiza todos los .glb de la carpeta de modelos (ver utils/glbOptimizer.js)
 * y actualiza file_size_mb / triangle_count en la tabla models_3d.
 *
 *   npm run optimize:models                 # uploads/models (o MODELS_DIR)
 *   npm run optimize:models -- --force      # re-optimizar aunque tengan marcador
 *   npm run optimize:models -- --dir ruta   # otra carpeta
 *   npm run optimize:models -- --only fie-principal2_1781601054889.glb
 *   npm run optimize:models -- --no-db      # no tocar la base de datos
 *
 * Los originales se guardan en uploads/models-original/ (ignorado por git).
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { optimizeGlbFile } = require('../utils/glbOptimizer');

const args  = process.argv.slice(2);
const flag  = (name) => args.includes(name);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

const dir = value('--dir')
  || process.env.MODELS_DIR
  || path.resolve(__dirname, '../uploads/models');

const only  = value('--only');
const force = flag('--force');
const useDb = !flag('--no-db');

async function updateDb(pool, filename, sizeMb, triangles) {
  const filePath = `/models/${filename}`;
  const { rowCount } = await pool.query(
    `UPDATE models_3d
        SET file_size_mb = $1, triangle_count = $2, updated_at = NOW()
      WHERE file_path = $3`,
    [sizeMb, triangles, filePath],
  );
  return rowCount;
}

async function main() {
  const files = fs.readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.glb'))
    .filter((f) => !only || f === only)
    .sort();

  if (!files.length) {
    console.log(`No hay archivos .glb en ${dir}`);
    return;
  }

  let pool = null;
  if (useDb) {
    try {
      pool = require('../db/pool');
    } catch (err) {
      console.warn(`  ⚠ Sin conexión a la base de datos (${err.message}); no se actualizarán tamaños.`);
    }
  }

  console.log(`\nOptimizando ${files.length} modelo(s) en ${dir}\n`);

  let totalBefore = 0;
  let totalAfter  = 0;
  const t0 = Date.now();

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const res = await optimizeGlbFile(filePath, { force, log: (m) => console.log(m) });

      const sizeMb    = res.skipped ? res.before.sizeMb : res.after.sizeMb;
      const triangles = res.skipped ? res.before.triangles : res.after.triangles;

      if (res.skipped) {
        console.log(`  · ${file}: omitido (${res.reason})`);
      }

      totalBefore += res.before.sizeMb;
      totalAfter  += sizeMb;

      if (pool) {
        try {
          const n = await updateDb(pool, file, sizeMb, triangles ?? null);
          if (n > 0) console.log(`    ↳ BD actualizada (${n} registro${n === 1 ? '' : 's'}: ${sizeMb} MB)`);
        } catch (err) {
          console.warn(`    ↳ BD no actualizada: ${err.message}`);
          pool = null; // no insistir
        }
      }
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nTotal: ${totalBefore.toFixed(1)} MB → ${totalAfter.toFixed(1)} MB en ${secs}s\n`);

  if (pool) await pool.end().catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
