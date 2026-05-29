/**
 * HotspotPanel.jsx — FIE Explorer 3D
 */

import React, { useState } from 'react';
import { useViewerStore } from '../../store/viewerStore';
import { isOpenNow, scheduleToString, parseSchedule } from '../../utils/scheduleUtils';



/* ─── Paleta por tipo — monocromática roja, opacidades distintas ─────────── */
const TYPE_META = {
  classroom: { bg:'rgba(188,6,19,.08)',  text:'#BC0613', border:'rgba(188,6,19,.18)' },
  lab:       { bg:'rgba(188,6,19,.10)',  text:'#BC0613', border:'rgba(188,6,19,.20)' },
  office:    { bg:'rgba(188,6,19,.06)',  text:'#BC0613', border:'rgba(188,6,19,.14)' },
  service:   { bg:'rgba(188,6,19,.07)',  text:'#BC0613', border:'rgba(188,6,19,.15)' },
  access:    { bg:'rgba(188,6,19,.05)',  text:'#BC0613', border:'rgba(188,6,19,.12)' },
};

const TYPE_LABELS = {
  classroom: 'Aula',
  lab:       'Laboratorio',
  office:    'Oficina',
  service:   'Servicio',
  access:    'Acceso',
};

/* ─── TypeIcon ───────────────────────────────────────────────────────────── */
function TypeIcon({ type, size = 16, color = 'currentColor' }) {
  const props = {
    width:size, height:size, viewBox:'0 0 24 24',
    fill:'none', stroke:color, strokeWidth:1.8,
    strokeLinecap:'round', strokeLinejoin:'round',
    style:{ flexShrink:0 },
  };
  switch (type) {
    case 'classroom': return <svg {...props}><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/></svg>;
    case 'lab':       return <svg {...props}><path d="M9 3h6m-3 0v5.5L16.5 17H7.5L12 8.5V3"/><path d="M6.5 17.5h11"/></svg>;
    case 'office':    return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7M7 16h4"/></svg>;
    case 'service':   return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>;
    case 'access':    return <svg {...props}><path d="M13 4h6v16h-6"/><path d="M8 16l-4-4 4-4M4 12h10"/></svg>;
    default:          return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>;
  }
}

/* ─── FieldIcon ──────────────────────────────────────────────────────────── */
function FieldIcon({ field, size = 13 }) {
  const props = {
    width:size, height:size, viewBox:'0 0 24 24',
    fill:'none', stroke:'currentColor', strokeWidth:2,
    strokeLinecap:'round', strokeLinejoin:'round',
    style:{ flexShrink:0 },
  };
  switch (field) {
    case 'building':  return <svg {...props}><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/></svg>;
    case 'teacher':   return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
    case 'schedule':  return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    case 'capacity':  return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'phone':     return <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.22 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
    case 'equipment': return <svg {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
    default:          return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>;
  }
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function HotspotPanel() {
  const { activeHotspot, setActiveHotspot } = useViewerStore();
  const [imgError, setImgError] = useState(false);

  if (!activeHotspot) return null;

  const hs   = activeHotspot;
  const meta = TYPE_META[hs.type] || TYPE_META.lab;
  const imageUrl = hs.image_url || hs.images?.[0]?.url || null;

  const close = () => { setActiveHotspot(null); setImgError(false); };

  return (
    <>

      {/* Overlay móvil */}
      <div
        className="hp-overlay"
        onClick={close}
        style={{ position:'fixed', inset:0, zIndex:49, background:'rgba(20,1,3,0.45)' }}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="hp-panel hp-panel-aside hp-scroll"
        role="complementary"
        aria-label={`Detalle: ${hs.name}`}
        style={{
          position:'absolute', top:0, right:0, bottom:0,
          width:360,
          background:'var(--cream, #FDFAF9)',
          borderLeft:'1px solid rgba(188,6,19,.13)',
          zIndex:50,
          overflowY:'auto',
          display:'flex', flexDirection:'column',
          boxShadow:'-4px 0 32px rgba(188,6,19,.09)',
        }}
      >

        {/* ── Banner / Imagen ─────────────────────────────────────────── */}
        {imageUrl && !imgError ? (
          <div style={{ position:'relative', height:200, flexShrink:0, background:'rgba(188,6,19,.06)' }}>
            <img
              src={imageUrl} alt={hs.name}
              style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={() => setImgError(true)}
            />
            {/* Gradiente inferior sobre imagen */}
            <div style={{
              position:'absolute', bottom:0, left:0, right:0, height:80,
              background:'linear-gradient(to top, rgba(253,250,249,.9), transparent)',
              pointerEvents:'none',
            }}/>
          </div>
        ) : (
          <div style={{
            height:130, flexShrink:0,
            background:'#BC0613',
            display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative', overflow:'hidden',
          }}>
            {/* Círculo decorativo */}
            <div aria-hidden style={{
              position:'absolute', top:'-40px', right:'-30px',
              width:160, height:160, borderRadius:'50%',
              background:'rgba(255,255,255,.06)', pointerEvents:'none',
            }}/>
            <div style={{
              width:64, height:64, borderRadius:'50%',
              background:'rgba(255,255,255,.15)',
              border:'1.5px solid rgba(255,255,255,.22)',
              display:'flex', alignItems:'center', justifyContent:'center',
              position:'relative', zIndex:1,
            }}>
              <TypeIcon type={hs.type} size={30} color="rgba(255,255,255,.9)" />
            </div>
          </div>
        )}

        {/* ── Botón cerrar flotante ──────────────────────────────────── */}
        <button className="hp-close" onClick={close} aria-label="Cerrar panel">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* ── Cuerpo ─────────────────────────────────────────────────── */}
        <div style={{
          padding:'1.25rem 1.25rem .5rem',
          display:'flex', flexDirection:'column', gap:'.7rem',
          flex:1,
        }}>

          {/* Badge de tipo */}
          <span style={{
            display:'inline-flex', alignItems:'center', gap:'.35rem',
            padding:'.22rem .7rem',
            background:meta.bg, color:meta.text,
            borderRadius:'999px', border:`1px solid ${meta.border}`,
            fontSize:'.68rem', fontWeight:700,
            letterSpacing:'.1em', textTransform:'uppercase',
            alignSelf:'flex-start',
            fontFamily:'var(--font-body)',
          }}>
            <TypeIcon type={hs.type} size={12} color={meta.text} />
            {TYPE_LABELS[hs.type] || hs.type}
          </span>

          {/* Nombre */}
          <h2 style={{
            fontFamily:'var(--font-display)',
            fontSize:'1.2rem', fontWeight:800,
            letterSpacing:'-.025em', lineHeight:1.15,
            color:'rgba(40,2,5,.9)', margin:0,
          }}>
            {hs.name}
          </h2>

          {/* Edificio + piso */}
          <p style={{
            fontSize:'.8rem', fontWeight:400,
            color:'rgba(40,2,5,.5)',
            display:'flex', alignItems:'center', gap:'.35rem',
            margin:0, fontFamily:'var(--font-body)',
          }}>
            <FieldIcon field="building" size={12} />
            Piso {hs.floor}{hs.building_name ? ` · ${hs.building_name}` : ''}
          </p>

          {/* Descripción */}
          {hs.description && (
            <p style={{
              fontSize:'.875rem', fontWeight:300,
              color:'rgba(40,2,5,.65)',
              lineHeight:1.7, margin:0,
              fontFamily:'var(--font-body)',
              paddingBottom:'.25rem',
              borderBottom:'1px solid rgba(188,6,19,.08)',
            }}>
              {hs.description}
            </p>
          )}

          {/* ── Cards de información (con stagger) ─────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>

            {hs.teacher && (
              <InfoCard
                className="hp-field"
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
                <div className="hp-card hp-field" style={{ display:'flex', flexDirection:'column', gap:'.35rem' }}>
                  {/* Label + badge abierto/cerrado */}
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                  }}>
                    <span style={{
                      fontSize:'.62rem', fontWeight:700,
                      color:'rgba(40,2,5,.4)',
                      textTransform:'uppercase', letterSpacing:'.12em',
                      display:'flex', alignItems:'center', gap:'.35rem',
                      fontFamily:'var(--font-body)',
                    }}>
                      <FieldIcon field="schedule" size={12} />
                      Horario
                    </span>
                    {openStatus !== null && (
                      <span style={{
                        fontSize:'.65rem', fontWeight:700,
                        padding:'.18rem .55rem', borderRadius:'999px',
                        fontFamily:'var(--font-body)',
                        background: openStatus ? 'rgba(22,163,74,.12)' : 'rgba(188,6,19,.09)',
                        color:      openStatus ? '#15803d'             : '#BC0613',
                        border:     openStatus ? '1px solid rgba(22,163,74,.2)' : '1px solid rgba(188,6,19,.18)',
                      }}>
                        {openStatus ? 'Abierto ahora' : 'Cerrado'}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize:'.85rem', fontWeight:300,
                    color:'rgba(40,2,5,.7)',
                    lineHeight:1.55, margin:0,
                    fontFamily:'var(--font-body)',
                  }}>
                    {displayStr}
                  </p>
                </div>
              );
            })()}

            {hs.capacity && (
              <InfoCard
                className="hp-field"
                icon={<FieldIcon field="capacity" size={13} />}
                label="Capacidad"
                value={`${hs.capacity} personas`}
              />
            )}

            {hs.phone && (
              <InfoCard
                className="hp-field"
                icon={<FieldIcon field="phone" size={13} />}
                label="Teléfono / Extensión"
                value={hs.phone}
                href={`tel:${hs.phone.replace(/\s/g, '')}`}
              />
            )}

            {hs.equipment && (
              <InfoCard
                className="hp-field"
                icon={<FieldIcon field="equipment" size={13} />}
                label="Equipamiento"
                value={hs.equipment}
              />
            )}
          </div>
        </div>

        {/* ── Pie ────────────────────────────────────────────────────── */}
        <div style={{
          padding:'.85rem 1.25rem 1rem',
          borderTop:'1px solid rgba(188,6,19,.1)',
          background:'#fff',
          flexShrink:0,
        }}>
          <button className="hp-close-btn" onClick={close}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            Cerrar
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── InfoCard ───────────────────────────────────────────────────────────── */
function InfoCard({ icon, label, value, href, className = '' }) {
  return (
    <div className={`hp-card ${className}`}>
      <p style={{
        fontSize:'.62rem', fontWeight:700,
        color:'rgba(40,2,5,.38)',
        textTransform:'uppercase', letterSpacing:'.12em',
        marginBottom:'.3rem',
        display:'flex', alignItems:'center', gap:'.35rem',
        fontFamily:'var(--font-body)',
        color:'rgba(188,6,19,.55)',
      }}>
        {icon}
        {label}
      </p>
      {href ? (
        <a href={href} style={{
          fontSize:'.875rem', fontWeight:600,
          color:'#BC0613', lineHeight:1.5,
          fontFamily:'var(--font-body)',
          textDecoration:'none',
          transition:'opacity .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '.75'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          {value}
        </a>
      ) : (
        <p style={{
          fontSize:'.875rem', fontWeight:300,
          color:'rgba(40,2,5,.72)',
          lineHeight:1.55, margin:0,
          fontFamily:'var(--font-body)',
        }}>
          {value}
        </p>
      )}
    </div>
  );
}