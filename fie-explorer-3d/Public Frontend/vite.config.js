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
      // Archivos GLB/GLTF servidos por el backend (incluye mapa-espoch.glb)
      '/models': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    // Three.js + drei son pesados; chunk mayor es normal
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar Three.js + fiber en su propio chunk para mejor caching
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },

  // Optimizar pre-bundling para three.js
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
});