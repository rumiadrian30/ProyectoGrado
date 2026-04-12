import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import './index.css';

// ── Páginas (Sprint 0: placeholders) ───────────────────────
function HomePage() {
  const [apiStatus, setApiStatus] = useState('verificando...');
  const [apiColor,  setApiColor]  = useState('#888');

  useEffect(() => {
    axios.get('/api')
      .then(({ data }) => {
        setApiStatus(`Conectado — ${data.message}`);
        setApiColor('#22c55e');
      })
      .catch(() => {
        setApiStatus('Sin conexión con el backend');
        setApiColor('#ef4444');
      });
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>Sprint 0 — Entorno configurado</div>
        <h1 style={styles.title}>FIE Explorer 3D</h1>
        <p style={styles.subtitle}>
          Aplicación web interactiva para la exploración tridimensional<br />
          de la Facultad de Informática y Electrónica — ESPOCH
        </p>
        <div style={styles.statusRow}>
          <span style={styles.dot} />
          <span style={{ color: '#22c55e', fontWeight: 500 }}>Frontend React + Vite</span>
          <span style={styles.sep}>|</span>
          <span style={styles.dot2} />
          <span style={{ color: apiColor, fontWeight: 500 }}>{apiStatus}</span>
        </div>
        <div style={styles.grid}>
          {[
            { label: 'Frontend',   value: 'React 18 + Vite 5' },
            { label: '3D Engine',  value: 'Three.js r167' },
            { label: 'Backend',    value: 'Node.js 18 + Express' },
            { label: 'Base datos', value: 'PostgreSQL 16 + PostGIS' },
          ].map(({ label, value }) => (
            <div key={label} style={styles.chip}>
              <span style={styles.chipLabel}>{label}</span>
              <span style={styles.chipValue}>{value}</span>
            </div>
          ))}
        </div>
        <p style={styles.footer}>
          Grefa Rivadeneyra Rumi Adrian · Código 7333 · Carrera Software
        </p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ ...styles.container, flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ color: '#fff', fontSize: '3rem' }}>404</h2>
      <p style={{ color: '#aaa' }}>Página no encontrada</p>
    </div>
  );
}

// ── App principal ────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<HomePage />} />
        <Route path="*"        element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Estilos inline (Sprint 0 — sin CSS framework) ────────────
const styles = {
  container: {
    minHeight:  '100vh',
    display:    'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    padding:    '2rem',
  },
  card: {
    background:   '#1e293b',
    borderRadius: '16px',
    padding:      '2.5rem 3rem',
    maxWidth:     '580px',
    width:        '100%',
    border:       '1px solid #334155',
    textAlign:    'center',
  },
  badge: {
    display:      'inline-block',
    background:   '#1d4ed8',
    color:        '#bfdbfe',
    fontSize:     '12px',
    fontWeight:   600,
    padding:      '4px 14px',
    borderRadius: '999px',
    marginBottom: '1rem',
    letterSpacing:'0.04em',
  },
  title: {
    color:      '#f1f5f9',
    fontSize:   '2rem',
    fontWeight: 700,
    margin:     '0 0 0.5rem',
  },
  subtitle: {
    color:      '#94a3b8',
    fontSize:   '0.95rem',
    lineHeight: 1.6,
    margin:     '0 0 1.5rem',
  },
  statusRow: {
    display:      'flex',
    alignItems:   'center',
    justifyContent:'center',
    gap:          '8px',
    marginBottom: '1.5rem',
    fontSize:     '13px',
  },
  dot:  { width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 },
  dot2: { width: 8, height: 8, borderRadius: '50%', background: '#facc15', flexShrink: 0 },
  sep:  { color: '#475569' },
  grid: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 '10px',
    marginBottom:        '1.5rem',
  },
  chip: {
    background:   '#0f172a',
    border:       '1px solid #334155',
    borderRadius: '8px',
    padding:      '10px 14px',
    textAlign:    'left',
    display:      'flex',
    flexDirection:'column',
    gap:          '2px',
  },
  chipLabel: { color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  chipValue: { color: '#cbd5e1', fontSize: '13px', fontWeight: 500 },
  footer: {
    color:    '#475569',
    fontSize: '12px',
    margin:   0,
  },
};
