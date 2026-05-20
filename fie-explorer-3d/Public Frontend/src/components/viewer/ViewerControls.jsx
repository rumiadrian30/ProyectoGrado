import React, { useState } from 'react';

function Row({ keys, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.18rem 0' }}>
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        {keys.map((k, i) => (
          <kbd key={i} style={{
            background: 'var(--color-bg-soft)',
            border: '1px solid var(--color-border)',
            borderBottom: '2px solid var(--color-border)',
            borderRadius: 4,
            padding: '0.08rem 0.32rem',
            fontSize: '0.58rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: 'var(--color-text-2)',
            whiteSpace: 'nowrap',
            lineHeight: 1.5,
          }}>{k}</kbd>
        ))}
      </div>
      <span style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

export default function ViewerControls({ isMobile = false }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Botón toggle cuando está cerrado ──────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ver controles de navegación"
          title="Controles de navegación"
          style={{
            position: 'absolute', top: 54, right: 12, zIndex: 20,
            width: 36, height: 36,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-2)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-soft)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg)'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="13" rx="2"/>
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
          </svg>
        </button>
      )}

      {/* ── Panel expandido ───────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute', top: 54, right: 12, zIndex: 20,
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-sm)',
          minWidth: 170,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.4rem 0.6rem 0.4rem 0.75rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700,
              color: 'var(--color-text-2)',
            }}>Controles</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar panel de controles"
              style={{
                width: 20, height: 20,
                background: 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-3)',
                borderRadius: 4,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-soft)'; e.currentTarget.style.color = 'var(--color-text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-3)'; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Filas */}
          <div style={{ padding: '0.45rem 0.75rem 0.55rem' }}>
            {isMobile ? (
              <>
                <Row keys={['1 dedo']}  label="Mover" />
                <Row keys={['2 dedos']} label="Zoom" />
                <Row keys={['2 ↻']}     label="Rotar" />
                <Row keys={['Tap']}     label="Ver hotspot" />
              </>
            ) : (
              <>
                <Row keys={['W','A','S','D']} label="Mover" />
                <Row keys={['Q','E']}         label="Rotar" />
                <Row keys={['R','F']}         label="Inclinar" />
                <Row keys={['⇧']}             label="Velocidad ×4" />
                <Row keys={['Scroll']}        label="Zoom" />
                <Row keys={['Clic']}          label="Ver hotspot" />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}