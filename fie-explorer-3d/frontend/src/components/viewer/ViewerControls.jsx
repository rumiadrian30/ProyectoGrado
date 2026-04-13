import React from 'react';

/**
 * Controles flotantes del visor (ayuda visual).
 * Los controles reales están en OrbitControls de Three.js.
 */
export default function ViewerControls() {
  const tip = (icon, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{
        fontSize: '0.65rem',
        background: 'rgba(255,255,255,0.9)',
        color: 'var(--color-text-2)',
        padding: '0.15rem 0.4rem',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontWeight: 700,
        border: '1px solid var(--color-border)',
        whiteSpace: 'nowrap',
      }}>{icon}</span>
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
        {text}
      </span>
    </div>
  );

  return (
    <>
      {/* Ayuda de controles — esquina superior derecha */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 20,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-md)',
        padding: '0.65rem 0.9rem',
        display: 'flex', flexDirection: 'column', gap: '0.4rem',
        border: '1px solid rgba(255,255,255,0.12)',
      }}>
        <p style={{
          fontSize: '0.62rem', fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: '0.2rem',
        }}>Controles</p>
        {tip('🖱️ Arrastrar', 'Rotar')}
        {tip('🖱️ Scroll', 'Zoom')}
        {tip('Click Der.', 'Paneo')}
        {tip('📍 Click', 'Ver info')}
      </div>

      {/* Brújula decorativa — esquina inferior derecha */}
      <div style={{
        position: 'absolute', bottom: 52, right: 12, zIndex: 20,
        width: 44, height: 44,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        borderRadius: '50%',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg viewBox="0 0 40 40" width="28" height="28">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#e4e7ed" strokeWidth="1"/>
          <text x="20" y="7" textAnchor="middle" fontSize="5" fontWeight="700"
            fill="#003087" fontFamily="var(--font-display)">N</text>
          <text x="20" y="37" textAnchor="middle" fontSize="4" fill="#9ca3af">S</text>
          <text x="4" y="22" textAnchor="middle" fontSize="4" fill="#9ca3af">O</text>
          <text x="36" y="22" textAnchor="middle" fontSize="4" fill="#9ca3af">E</text>
          <polygon points="20,9 18,21 20,19 22,21" fill="#003087"/>
          <polygon points="20,31 18,19 20,21 22,19" fill="#dc2626" opacity="0.7"/>
        </svg>
      </div>
    </>
  );
}
