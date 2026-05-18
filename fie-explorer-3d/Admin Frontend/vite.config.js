import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

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
      `.replace(/\n/g, ' '),

      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
    },

    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})