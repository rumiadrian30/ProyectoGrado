/**
 * ControlsOverlay.jsx — HU-03
 * Overlay de instrucciones. Auto-cierre a los 5 s.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';

const DISMISS_MS = 5000;
const TICK_MS    = 50;

function Row({ icon, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.18rem 0' }}>
      <kbd style={{
        fontSize: '0.58rem', fontFamily: 'monospace', fontWeight: 700,
        background: 'var(--color-bg-soft)',
        border: '1px solid var(--color-border)',
        borderBottom: '2px solid var(--color-border)',
        borderRadius: 4, padding: '0.08rem 0.35rem',
        color: 'var(--color-text-2)', whiteSpace: 'nowrap',
        lineHeight: 1.5, flexShrink: 0,
      }}>{icon}</kbd>
      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-2)' }}>
        {label}
        {sub && <span style={{ color: 'var(--color-text-4)', fontSize: '0.65rem' }}> · {sub}</span>}
      </span>
    </div>
  );
}

export default function ControlsOverlay({ isMobile = false, onDismiss }) {
  const [visible,  setVisible]  = useState(true);
  const [progress, setProgress] = useState(0);
  const [leaving,  setLeaving]  = useState(false);
  const [secs,     setSecs]     = useState(5);
  const ivRef = useRef(null);
  const t0Ref = useRef(Date.now());

  const dismiss = useCallback(() => {
    if (!visible || leaving) return;
    clearInterval(ivRef.current);
    setLeaving(true);
    setTimeout(() => { setVisible(false); onDismiss?.(); }, 260);
  }, [visible, leaving, onDismiss]);

  useEffect(() => {
    t0Ref.current = Date.now();
    ivRef.current = setInterval(() => {
      const elapsed = Date.now() - t0Ref.current;
      const pct = Math.min(100, (elapsed / DISMISS_MS) * 100);
      setProgress(pct);
      setSecs(Math.max(0, Math.ceil((DISMISS_MS - elapsed) / 1000)));
      if (pct >= 100) dismiss();
    }, TICK_MS);
    return () => clearInterval(ivRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); dismiss(); } };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [dismiss]);

  if (!visible) return null;

  return (
    <>
      <div
        role="dialog"
        aria-label="Instrucciones de navegación"
        aria-modal="true"
        onClick={dismiss}
        style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: leaving ? 'ovFadeOut .26s ease forwards' : 'ovFadeIn .25s ease',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '1rem 1.1rem 0.85rem',
            width: 290,
            animation: leaving ? 'cardOut .26s ease forwards' : 'cardIn .3s cubic-bezier(.175,.885,.32,1.275)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '0.75rem',
            paddingBottom: '0.6rem',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)' }}>
            Cómo navegar en el visor
            </p>
            <button
              onClick={dismiss}
              aria-label="Cerrar"
              style={{
                width: 22, height: 22, borderRadius: 4,
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-3)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {isMobile ? (
              <>
                <Row icon="1 dedo"  label="Mover cámara" />
                <Row icon="2 dedos" label="Zoom" sub="pellizca" />
                <Row icon="2 ↻"     label="Rotar orientación" />
                <Row icon="Tap 📍"  label="Abrir hotspot" />
              </>
            ) : (
              <>
                <Row icon="W A S D" label="Mover cámara" sub="también ←↑↓→" />
                <Row icon="Q / E"   label="Rotar orientación" />
                <Row icon="R / F"   label="Inclinar vista" />
                <Row icon="⇧ Shift" label="Velocidad ×4" />
                <Row icon="Scroll"  label="Zoom" />
                <Row icon="Clic 📍" label="Abrir hotspot" />
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '0.85rem',
            paddingTop: '0.65rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--color-text-4)' }}>
              Se cierra en {secs}s
            </span>
            <button
              onClick={dismiss}
              style={{
                padding: '0.35rem 0.8rem',
                background: 'var(--color-primary, #BC0613)',
                color: '#fff', border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem', fontWeight: 700,
                fontFamily: 'var(--font-body, inherit)',
                cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </div>

          {/* Barra de progreso */}
          <div style={{
            marginTop: '0.6rem', height: 2,
            background: 'var(--color-border)', borderRadius: 999,
          }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'var(--color-primary, #BC0613)',
              borderRadius: 999,
              transition: `width ${TICK_MS}ms linear`,
            }}/>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ovFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes ovFadeOut { from { opacity:1 } to { opacity:0 } }
        @keyframes cardIn  { from { opacity:0; transform:scale(.93) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes cardOut { from { opacity:1; transform:scale(1) translateY(0) } to { opacity:0; transform:scale(.95) translateY(4px) } }
      `}</style>
    </>
  );
}