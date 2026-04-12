import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host:        '0.0.0.0',   // necesario para Docker
    port:         5173,
    strictPort:   true,
    proxy: {
      // Redirige /api/* al backend sin exponer la URL directamente en el cliente
      '/api': {
        target:      'http://backend:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir:       'dist',
    sourcemap:     false,
    chunkSizeWarningLimit: 3000, // GLB pueden generar chunks grandes
  },
});
