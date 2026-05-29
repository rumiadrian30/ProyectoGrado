import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './assets/global.css';
import { detectWebGL } from './utils/webgl.detect';

// ─── Feature Detection WebGL ──────────────────────────
const { supported } = detectWebGL();

if (!supported) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', padding: '2rem', textAlign: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: 480, background: '#fff', borderRadius: 16,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        padding: '2.5rem 2rem', border: '1px solid #e4e7ed',
      }}>
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h2 style={{ margin: '1rem 0 0.5rem', color: '#111827', fontSize: '1.25rem', fontWeight: 700 }}>
          WebGL no disponible
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Tu navegador o dispositivo no soporta <strong>WebGL</strong>, tecnología necesaria
          para el visor 3D de GeoESPOCH. Actualiza tu navegador o descarga uno compatible:
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://www.google.com/chrome"
            target="_blank" rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1.2rem', borderRadius: 8, fontWeight: 600,
              background: '#1967D2', color: '#fff', textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            🌐 Descargar Chrome
          </a>
          <a
            href="https://www.mozilla.org/firefox"
            target="_blank" rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1.2rem', borderRadius: 8, fontWeight: 600,
              background: '#FF7139', color: '#fff', textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            🦊 Descargar Firefox
          </a>
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
          Si ya tienes uno de estos navegadores, verifica que la aceleración de hardware
          esté habilitada en ajustes.
        </p>
      </div>
    </div>
  );
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
