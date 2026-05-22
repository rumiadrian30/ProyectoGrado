/**
 * HotspotPanel.jsx  —  Public Frontend/src/components/hotspots/HotspotPanel.jsx
 *
 * CORRECCIONES HU-04:
 *   · Todos los iconos de tipo y de campo reemplazan los emojis por SVG inline
 *     alineados con el design system corporativo (paleta ESPOCH, sin unicode emoji).
 *   · El botón de cierre limpia activeHotspot en el store (setActiveHotspot(null)).
 *   · El overlay móvil tiene pointer-events activos para cerrar el panel al
 *     tocar fuera de él en pantallas pequeñas.
 *   · Se conservan sin cambios todos los CSS custom properties y la tipografía.
 */

import React, { useState } from 'react';
import { useViewerStore } from '../../store/viewerStore';
import { isOpenNow, scheduleToString, parseSchedule } from '../../utils/scheduleUtils';

// ─── Paleta de colores por tipo (CSS vars + fallbacks) ────────────────────────
const TYPE_COLORS = {
  classroom: { bg: '#ede9fe', text: '#6d28d9' },
  lab:       { bg: 'var(--color-primary-50)',  text: 'var(--color-primary)' },
  office:    { bg: '#e0f2fe', text: '#0369a1' },
  service:   { bg: '#dcfce7', text: '#16a34a' },
  access:    { bg: '#fef3c7', text: '#d97706' },
};

const TYPE_LABELS = {
  classroom: 'Aula',
  lab:       'Laboratorio',
  office:    'Oficina',
  service:   'Servicio',
  access:    'Acceso',
};

// ─── Iconos SVG por tipo (sustituyen emojis) ──────────────────────────────────
function TypeIcon({ type, size = 16, color = 'currentColor' }) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: color, strokeWidth: 1.8,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { flexShrink: 0 },
  };
  switch (type) {
    case 'classroom':
      return (
        <svg {...props}>
          <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
        </svg>
      );
    case 'lab':
      return (
        <svg {...props}>
          <path d="M9 3h6m-3 0v5.5L16.5 17H7.5L12 8.5V3"/>
          <path d="M6.5 17.5h11"/>
        </svg>
      );
    case 'office':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M7 8h10M7 12h7M7 16h4"/>
        </svg>
      );
    case 'service':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      );
    case 'access':
      return (
        <svg {...props}>
          <path d="M13 4h6v16h-6"/>
          <path d="M8 16l-4-4 4-4M4 12h10"/>
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4l3 3"/>
        </svg>
      );
  }
}

// ─── Icono SVG por campo de información ──────────────────────────────────────
function FieldIcon({ field, size = 13 }) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 2,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    style: { flexShrink: 0 },
  };
  switch (field) {
    case 'building':
      return (
        <svg {...props}>
          <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
        </svg>
      );
    case 'teacher':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      );
    case 'schedule':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      );
    case 'capacity':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      );
    case 'phone':
      return (
        <svg {...props}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.22 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      );
    case 'equipment':
      return (
        <svg {...props}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8h.01M12 12v4"/>
        </svg>
      );
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function HotspotPanel() {
  const { activeHotspot, setActiveHotspot } = useViewerStore();
  const [imgError, setImgError] = useState(false);

  // El panel solo se renderiza cuando hay un hotspot activo
  if (!activeHotspot) return null;

  const hs     = activeHotspot;
  const colors = TYPE_COLORS[hs.type] || TYPE_COLORS.lab;

  // Compatibilidad: image_url (nuevo) o images[0].url (legacy)
  const imageUrl = hs.image_url || hs.images?.[0]?.url || null;

  /** Cierra el panel limpiando el estado global */
  const close = () => {
    setActiveHotspot(null);
    setImgError(false);
  };

  return (
    <>
      {/* ── Overlay oscuro en móvil (toca fuera = cerrar) ── */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(0,0,0,0.35)',
          display: 'none',        // visible solo vía media query .hs-overlay
        }}
        className="hs-overlay"
        aria-hidden="true"
      />

      {/* ── Panel lateral derecho ── */}
      <aside
        role="complementary"
        aria-label={`Detalle: ${hs.name}`}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: 360,
          background: 'var(--color-bg)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 50,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInPanel .25s ease',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* ── Imagen de portada o banner corporativo ── */}
        {imageUrl && !imgError ? (
          <div style={{ position: 'relative', height: 200, background: 'var(--color-bg-soft)', flexShrink: 0 }}>
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
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-400) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TypeIcon type={hs.type} size={52} color="rgba(255,255,255,0.85)" />
          </div>
        )}

        {/* ── Botón cerrar flotante ── */}
        <button
          onClick={close}
          aria-label="Cerrar panel"
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)', border: 'none',
            color: '#fff', cursor: 'pointer', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.65)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.45)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* ── Cuerpo del panel ── */}
        <div style={{
          padding: '1.25rem', flex: 1,
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>

          {/* Badge de tipo */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.7rem',
            background: colors.bg, color: colors.text,
            borderRadius: 'var(--radius-full)',
            fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            alignSelf: 'flex-start',
          }}>
            <TypeIcon type={hs.type} size={13} color={colors.text} />
            {TYPE_LABELS[hs.type] || hs.type}
          </span>

          {/* Nombre */}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem', fontWeight: 700,
            color: 'var(--color-text)', lineHeight: 1.2,
            margin: 0,
          }}>
            {hs.name}
          </h2>

          {/* Edificio + piso */}
          <p style={{
            fontSize: '0.8rem', color: 'var(--color-text-3)',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            margin: 0,
          }}>
            <FieldIcon field="building" size={13} />
            Piso {hs.floor}{hs.building_name ? ` · ${hs.building_name}` : ''}
          </p>

          {/* Descripción */}
          {hs.description && (
            <p style={{
              fontSize: '0.875rem', color: 'var(--color-text-2)',
              lineHeight: 1.65, margin: 0,
            }}>
              {hs.description}
            </p>
          )}

          {/* ── Tarjetas de información ── */}

          {hs.teacher && (
            <InfoCard
              icon={<FieldIcon field="teacher" size={13} />}
              label="Docente / Responsable"
              value={hs.teacher}
            />
          )}

          {hs.schedule && (() => {
            const openStatus = isOpenNow(hs.schedule);
            const parsed     = parseSchedule(hs.schedule);
            const displayStr = parsed ? scheduleToString(parsed) : hs.schedule;
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
                  marginBottom: '0.35rem',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FieldIcon field="schedule" size={13} />
                    Horario
                  </span>
                  {openStatus !== null && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700,
                      padding: '0.15rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      background: openStatus ? '#dcfce7' : '#fee2e2',
                      color:      openStatus ? '#15803d' : '#b91c1c',
                    }}>
                      {openStatus ? 'Abierto ahora' : 'Cerrado'}
                    </span>
                  )}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0 }}>
                  {displayStr}
                </p>
              </div>
            );
          })()}

          {hs.capacity && (
            <InfoCard
              icon={<FieldIcon field="capacity" size={13} />}
              label="Capacidad"
              value={`${hs.capacity} personas`}
            />
          )}

          {hs.phone && (
            <InfoCard
              icon={<FieldIcon field="phone" size={13} />}
              label="Teléfono / Extensión"
              value={hs.phone}
              href={`tel:${hs.phone.replace(/\s/g, '')}`}
            />
          )}

          {hs.equipment && (
            <InfoCard
              icon={<FieldIcon field="equipment" size={13} />}
              label="Equipamiento"
              value={hs.equipment}
            />
          )}
        </div>

        {/* ── Pie del panel ── */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={close}
            style={{
              width: '100%', padding: '0.75rem',
              background: 'var(--color-bg-soft)',
              color: 'var(--color-text-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontWeight: 500, fontSize: '0.875rem',
              cursor: 'pointer', transition: 'all var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-border)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-soft)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            Cerrar
          </button>
        </div>
      </aside>

      <style>{`
        @keyframes slideInPanel {
          from { transform: translateX(30px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        /* Móvil: panel en drawer inferior + overlay visible */
        @media (max-width: 640px) {
          .hs-overlay { display: block !important; }
          aside[role="complementary"] {
            position: fixed !important;
            top: auto !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-height: 75vh;
            border-radius: 16px 16px 0 0 !important;
            border-left: none !important;
            border-top: 1px solid var(--color-border) !important;
          }
        }
      `}</style>
    </>
  );
}

// ─── Tarjeta de campo reutilizable ────────────────────────────────────────────
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
        display: 'flex', alignItems: 'center', gap: '0.35rem',
      }}>
        {icon}
        {label}
      </p>
      {href ? (
        <a href={href} style={{
          fontSize: '0.85rem', color: 'var(--color-primary)',
          lineHeight: 1.5, fontWeight: 500,
        }}>
          {value}
        </a>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0 }}>
          {value}
        </p>
      )}
    </div>
  );
}