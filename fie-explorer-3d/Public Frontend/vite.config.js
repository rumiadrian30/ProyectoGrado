import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // API REST del backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Archivos GLB/GLTF servidos por el backend — evita CORS
      '/models': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 3000,
  },
});