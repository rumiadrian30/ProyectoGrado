import React, { useState } from 'react';
import { useViewerStore } from '../../store/viewerStore';

const TYPE_ICONS = {
  classroom: '🏫',
  lab:       '🔬',
  office:    '🏢',
  service:   '⚙️',
  access:    '🚪',
};

const TYPE_LABELS = {
  classroom: 'Aula',
  lab:       'Laboratorio',
  office:    'Oficina',
  service:   'Servicio',
  access:    'Acceso',
};

const TYPE_COLORS = {
  classroom: { bg: '#ede9fe', text: '#6d28d9' },
  lab:       { bg: 'var(--color-primary-50)', text: 'var(--color-primary)' },
  office:    { bg: '#e0f2fe', text: '#0369a1' },
  service:   { bg: '#dcfce7', text: '#16a34a' },
  access:    { bg: '#fef3c7', text: '#d97706' },
};

export default function HotspotPanel() {
  const { activeHotspot, setActiveHotspot } = useViewerStore();
  const [imgError, setImgError] = useState(false);

  if (!activeHotspot) return null;

  const hs     = activeHotspot;
  const colors = TYPE_COLORS[hs.type] || TYPE_COLORS.lab;

  // Compatibilidad: image_url (string nuevo) o images (array legacy)
  const imageUrl = hs.image_url || hs.images?.[0]?.url || null;

  const close = () => setActiveHotspot(null);

  return (
    <>
      {/* Overlay móvil */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(0,0,0,0.35)',
          display: 'none',
        }}
        className="hs-overlay"
      />

      {/* Panel lateral derecho */}
      <aside style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 360,
        background: '#fff',
        borderLeft: '1px solid var(--color-border)',
        zIndex: 50,
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInPanel .25s ease',
        boxShadow: 'var(--shadow-xl)',
      }}>

        {/* ── Imagen o banner de color ── */}
        {imageUrl && !imgError ? (
          <div style={{ position: 'relative', height: 200, background: '#f0f2f5', flexShrink: 0 }}>
            <img
              src={imageUrl}
              alt={hs.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
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

        {/* Botón cerrar flotante */}
        <button
          onClick={close}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)', border: 'none',
            color: '#fff', cursor: 'pointer', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* ── Contenido ── */}
        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Badge tipo */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.2rem 0.65rem',
            background: colors.bg, color: colors.text,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            alignSelf: 'flex-start',
          }}>
            {TYPE_ICONS[hs.type]} {TYPE_LABELS[hs.type] || hs.type}
          </span>

          {/* Nombre */}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem', fontWeight: 700,
            color: 'var(--color-text)', lineHeight: 1.2,
          }}>{hs.name}</h2>

          {/* Edificio + piso */}
          <p style={{
            fontSize: '0.8rem', color: 'var(--color-text-3)',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
            </svg>
            Piso {hs.floor} · {hs.building_name}
          </p>

          {/* Descripción */}
          {hs.description && (
            <p style={{
              fontSize: '0.875rem', color: 'var(--color-text-2)',
              lineHeight: 1.65,
            }}>{hs.description}</p>
          )}

          {/* ── Info cards ── */}
          {hs.teacher && (
            <InfoCard icon="👤" label="Docente / Responsable" value={hs.teacher} />
          )}
          {hs.schedule && (
            <InfoCard icon="🕐" label="Horario" value={hs.schedule} />
          )}
          {hs.capacity && (
            <InfoCard icon="👥" label="Capacidad" value={`${hs.capacity} personas`} />
          )}
          {hs.phone && (
            <InfoCard
              icon="📞"
              label="Teléfono / Extensión"
              value={hs.phone}
              href={`tel:${hs.phone.replace(/\s/g, '')}`}
            />
          )}
          {hs.equipment && (
            <InfoCard icon="🔧" label="Equipamiento" value={hs.equipment} />
          )}
        </div>

        {/* ── Pie ── */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={close} style={{
            width: '100%', padding: '0.75rem',
            background: 'var(--color-bg-soft)',
            color: 'var(--color-text-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-body)',
            fontWeight: 500, fontSize: '0.875rem',
            cursor: 'pointer', transition: 'all var(--transition)',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-bg-soft)'}
          >
            Cerrar
          </button>
        </div>
      </aside>

      <style>{`
        @keyframes slideInPanel {
          from { transform: translateX(30px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @media (max-width: 640px) {
          .hs-overlay { display: block !important; }
          aside {
            position: fixed !important;
            top: auto !important; left: 0 !important;
            right: 0 !important; bottom: 0 !important;
            width: 100% !important;
            max-height: 75vh;
            border-radius: 16px 16px 0 0 !important;
          }
        }
      `}</style>
    </>
  );
}

function InfoCard({ icon, label, value, href }) {
  return (
    <div style={{
      padding: '0.85rem',
      background: 'var(--color-bg-soft)',
      borderRadius: 'var(--radius-md)',
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
      {href ? (
        <a href={href} style={{
          fontSize: '0.85rem', color: 'var(--color-primary)',
          lineHeight: 1.5, fontWeight: 500,
        }}>{value}</a>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
          {value}
        </p>
      )}
    </div>
  );
}