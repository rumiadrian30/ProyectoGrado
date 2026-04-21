import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,

    headers: {
      // Cabecera Content Security Policy (CSP)
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:3001;",

      // Anti-Clickjacking
      'X-Frame-Options': 'SAMEORIGIN',

      // MIME-sniffing
      'X-Content-Type-Options': 'nosniff',
    },

    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
