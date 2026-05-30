/**
 * ControlsOverlay.jsx — GeoESPOCH 3D
 * Overlay de instrucciones para el visor 3D.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';

const DISMISS_MS = 5000;
const TICK_MS = 50;

function Row({ icon, label, sub }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.22rem 0',
    }}>
      <kbd style={{
        minWidth: 54,
        textAlign: 'center',
        fontSize: '0.58rem',
        fontFamily: 'monospace',
        fontWeight: 800,
        background: 'rgba(248,250,252,.95)',
        border: '1px solid rgba(148,163,184,.35)',
        borderBottom: '2px solid rgba(148,163,184,.55)',
        borderRadius: 6,
        padding: '0.12rem 0.38rem',
        color: '#334155',
        whiteSpace: 'nowrap',
        lineHeight: 1.45,
        flexShrink: 0,
      }}>
        {icon}
      </kbd>

      <span style={{
        fontSize: '0.74rem',
        color: '#334155',
        lineHeight: 1.45,
      }}>
        {label}
        {sub && (
          <span style={{
            color: '#94a3b8',
            fontSize: '0.66rem',
          }}>
            {' '}· {sub}
          </span>
        )}
      </span>
    </div>
  );
}

export default function ControlsOverlay({ isMobile = false, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [secs, setSecs] = useState(5);

  const ivRef = useRef(null);
  const t0Ref = useRef(Date.now());

  const dismiss = useCallback(() => {
    if (!visible || leaving) return;

    clearInterval(ivRef.current);
    setLeaving(true);

    window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 260);
  }, [visible, leaving, onDismiss]);

  useEffect(() => {
    t0Ref.current = Date.now();

    ivRef.current = window.setInterval(() => {
      const elapsed = Date.now() - t0Ref.current;
      const pct = Math.min(100, (elapsed / DISMISS_MS) * 100);

      setProgress(pct);
      setSecs(Math.max(0, Math.ceil((DISMISS_MS - elapsed) / 1000)));

      if (pct >= 100) dismiss();
    }, TICK_MS);

    return () => clearInterval(ivRef.current);
  }, [dismiss]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        dismiss();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dismiss]);

  if (!visible) return null;

  return (
    <>
      <div
        role="dialog"
        aria-label="Controles del visor 3D"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: isMobile ? 56 : 58,
          bottom: isMobile ? 18 : 95,
          zIndex: 31,
          width: isMobile ? 'calc(100% - 76px)' : 290,
          maxWidth: 320,
          background: 'rgba(255,255,255,.96)',
          border: '1px solid rgba(15,23,42,.12)',
          borderRadius: 14,
          boxShadow: '0 16px 42px rgba(15,23,42,.22)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
          animation: leaving
            ? 'controlsPopoverOut .22s ease forwards'
            : 'controlsPopoverIn .24s ease',
        }}
      >
        <div style={{
          padding: '0.85rem 0.95rem 0.65rem',
          borderBottom: '1px solid rgba(15,23,42,.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}>
          <div>
            <p style={{
              margin: 0,
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#111827',
            }}>
              Controles del visor 3D
            </p>

            <p style={{
              margin: '0.16rem 0 0',
              fontSize: '0.63rem',
              color: '#64748b',
              lineHeight: 1.35,
            }}>
              Navega por el campus y selecciona edificios.
            </p>
          </div>

          <button
            onClick={dismiss}
            aria-label="Cerrar"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'rgba(15,23,42,.06)',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.7"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{
          padding: '0.75rem 0.95rem 0.55rem',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {isMobile ? (
            <>
              <Row icon="1 dedo" label="Girar cámara" />
              <Row icon="2 dedos" label="Acercar o alejar" sub="pellizcar" />
              <Row icon="Tap" label="Seleccionar edificio" />
              <Row icon="Botones" label="Cambiar vista técnica" />
            </>
          ) : (
            <>
              <Row icon="Clic" label="Rotar cámara" sub="arrastrar" />
              <Row icon="Rueda" label="Acercar o alejar" />
              <Row icon="Clic der." label="Desplazar vista" />
              <Row icon="Clic" label="Seleccionar edificio" />
              <Row icon="Botones" label="Zoom, rotación y vista superior" />
            </>
          )}
        </div>


        <div style={{
          position: 'absolute',
          right: -7,
          bottom: 16,
          width: 14,
          height: 14,
          background: 'rgba(255,255,255,.96)',
          borderRight: '1px solid rgba(15,23,42,.12)',
          borderBottom: '1px solid rgba(15,23,42,.12)',
          transform: 'rotate(-45deg)',
        }} />
      </div>

      <style>{`
        @keyframes controlsPopoverIn {
          from {
            opacity: 0;
            transform: translateX(8px) scale(.97);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes controlsPopoverOut {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(8px) scale(.97);
          }
        }
      `}</style>
    </>
  );
}