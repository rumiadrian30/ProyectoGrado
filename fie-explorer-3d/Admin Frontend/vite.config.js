/**
 * vite.config.js - Configuración de Vite para Admin Frontend
 */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Importación del plugin de ofuscación
let obfuscatorPlugin = null
try {
  const mod = await import('vite-plugin-javascript-obfuscator')
  obfuscatorPlugin = mod.default ?? mod
} catch {
  console.warn(
    '[vite.config] vite-plugin-javascript-obfuscator no encontrado. ' +
    'Solo se aplicará ofuscación via Terser. ' +
    'Instale el paquete para máxima protección en producción.'
  )
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = mode === 'production'

  // ── Configuración del plugin de ofuscación ───────────────
  const obfuscatorConfig = isProd && obfuscatorPlugin
    ? obfuscatorPlugin({
        include: ['**/*.{js,jsx,ts,tsx}'],
        exclude: [/node_modules/],
        apply: 'build',
        options: {
          sourceMap: false,
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.80,
          rotateStringArray: true,
          shuffleStringArray: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.50,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.25,
          renameLocals: true,
          debugProtection: false, 
          disableConsoleOutput: true,
          identifierNamesGenerator: 'hexadecimal',
          seed: 0,                 
        },
      })
    : null

  return {
    plugins: [
      react(),
      obfuscatorConfig,       
    ].filter(Boolean),

    // ── Configuración del build de producción ───────────────────────────────
    build: {
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          passes: 3,
          dead_code: true,
          evaluate: true,
          collapse_vars: true,
          pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.debug', 'console.error'],
          booleans: true,
          join_vars: true,
        },
        mangle: {
          toplevel: true,
          eval: true,
          properties: {
            regex: /^_[^_]/,        
            reserved: [],
          },
        },
        format: {
          comments: false,
          ascii_only: true,
          beautify: false,
        },
      },

      rollupOptions: {
        output: {
          chunkFileNames:  'assets/[hash].js',
          entryFileNames:  'assets/[hash].js',
          assetFileNames:  'assets/[hash][extname]',
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
    },

    //  Servidor de desarrollo
    server: {
      port: 5173,
      headers: {
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com blob:;
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: blob:;
          connect-src 'self' http://localhost:3001 https://www.gstatic.com blob:;
          worker-src 'self' blob:;
        `.replace(/\n/g, ' ').trim(),

        'X-Frame-Options':        'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
      },
      proxy: {
        '/api': {
          target:       'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
