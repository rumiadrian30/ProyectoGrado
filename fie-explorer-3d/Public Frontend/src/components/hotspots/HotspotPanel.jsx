import React, { useState } from 'react';
import { useViewerStore } from '../../store/viewerStore';

const TYPE_ICONS = {
  lab:     '🔬',
  office:  '🏢',
  service: '⚙️',
  access:  '🚪',
};

const TYPE_LABELS = {
  lab:     'Laboratorio',
  office:  'Oficina',
  service: 'Servicio',
  access:  'Acceso',
};

const TYPE_COLORS = {
  lab:     { bg: 'var(--color-primary-50)', text: 'var(--color-primary)' },
  office:  { bg: '#e0f2fe', text: '#0369a1' },
  service: { bg: '#dcfce7', text: '#16a34a' },
  access:  { bg: '#fef3c7', text: '#d97706' },
};

export default function HotspotPanel() {
  const { activeHotspot, setActiveHotspot } = useViewerStore();
  const [imgIndex, setImgIndex] = useState(0);

  if (!activeHotspot) return null;

  const hs = activeHotspot;
  const images = hs.images?.filter(Boolean) || [];
  const colors = TYPE_COLORS[hs.type] || TYPE_COLORS.lab;

  const close = () => {
    setActiveHotspot(null);
    setImgIndex(0);
  };

  return (
    <>
      {/* Overlay oscuro en móvil */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(0,0,0,0.35)',
          display: 'none',
        }}
        className="hs-overlay"
      />

      {/* Panel lateral */}
      <aside style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 360,
        background: '#fff',
        borderLeft: '1px solid var(--color-border)',
        zIndex: 50,
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUpPanel .25s ease',
        boxShadow: 'var(--shadow-xl)',
      }}>

        {/* ── Galería de imágenes ── */}
        {images.length > 0 ? (
          <div style={{ position: 'relative', height: 200, background: '#f0f2f5', flexShrink: 0 }}>
            <img
              src={images[imgIndex]?.url}
              alt={images[imgIndex]?.alt_text || hs.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            {images.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 10, left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', gap: '6px',
              }}>
                {images.map((_, i) => (
                  <button key={i} onClick={() => setImgIndex(i)} style={{
                    width: i === imgIndex ? 18 : 6, height: 6,
                    borderRadius: 9999,
                    background: i === imgIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                    border: 'none', cursor: 'pointer',
                    transition: 'all 200ms ease',
                    padding: 0,
                  }}/>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            height: 120, flexShrink: 0,
            background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-400) 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '3.5rem',
          }}>
            {TYPE_ICONS[hs.type] || '📍'}
          </div>
        )}

        {/* ── Contenido ── */}
        <div style={{ padding: '1.25rem 1.25rem 0', flex: 1 }}>
          {/* Badge tipo */}
          <span style={{
            display: 'inline-block',
            padding: '0.2rem 0.65rem',
            background: colors.bg,
            color: colors.text,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: '0.6rem',
          }}>
            {TYPE_ICONS[hs.type]} {TYPE_LABELS[hs.type] || hs.type}
          </span>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem', fontWeight: 700,
            color: 'var(--color-text)',
            lineHeight: 1.2, marginBottom: '0.5rem',
          }}>{hs.name}</h2>

          {/* Planta */}
          <p style={{
            fontSize: '0.8rem', color: 'var(--color-text-3)',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            marginBottom: '1rem',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
            </svg>
            Piso {hs.floor} · {hs.building_name}
          </p>

          {hs.description && (
            <p style={{
              fontSize: '0.875rem', color: 'var(--color-text-2)',
              lineHeight: 1.65, marginBottom: '1.25rem',
            }}>{hs.description}</p>
          )}

          {/* Info cards */}
          {hs.schedule && (
            <InfoCard icon="🕐" label="Horario" value={hs.schedule} />
          )}
          {hs.equipment && (
            <InfoCard icon="🔧" label="Equipamiento" value={hs.equipment} />
          )}
        </div>

        {/* ── Cierre ── */}
        <div style={{ padding: '1.25rem' }}>
          <button onClick={close} style={{
            width: '100%',
            padding: '0.75rem',
            background: 'var(--color-bg-soft)',
            color: 'var(--color-text-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            fontWeight: 500, fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
            onMouseEnter={e => e.target.style.background = 'var(--color-border)'}
            onMouseLeave={e => e.target.style.background = 'var(--color-bg-soft)'}
          >
            Cerrar
          </button>
        </div>
      </aside>

      <style>{`
        @keyframes slideUpPanel {
          from { transform: translateX(30px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @media (max-width: 640px) {
          .hs-overlay { display: block !important; }
          aside {
            position: fixed !important;
            top: auto !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-height: 70vh;
            border-radius: 16px 16px 0 0 !important;
          }
        }
      `}</style>
    </>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div style={{
      padding: '0.85rem',
      background: 'var(--color-bg-soft)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '0.75rem',
    }}>
      <p style={{
        fontSize: '0.72rem', fontWeight: 700,
        color: 'var(--color-text-3)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: '0.25rem',
        display: 'flex', alignItems: 'center', gap: '0.3rem',
      }}>
        {icon} {label}
      </p>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
        {value}
      </p>
    </div>
  );
}
