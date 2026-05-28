/**
 * Ayuda.jsx — FIE Explorer 3D
 * Rediseño con consistencia total al sistema de diseño de AcercaDe:
 * Outfit, var(--red), spotlight cards, bordes redondeados,
 * animaciones stagger, sin emojis, misma gramática visual.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const HELP_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

  @keyframes hy-up {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .hy-s0 { animation: hy-up .6s cubic-bezier(.16,1,.3,1) .04s both; }
  .hy-s1 { animation: hy-up .6s cubic-bezier(.16,1,.3,1) .14s both; }
  .hy-s2 { animation: hy-up .6s cubic-bezier(.16,1,.3,1) .24s both; }
  .hy-s3 { animation: hy-up .6s cubic-bezier(.16,1,.3,1) .36s both; }
  .hy-s4 { animation: hy-up .6s cubic-bezier(.16,1,.3,1) .48s both; }

  @keyframes hy-card {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .hy-card { animation: hy-card .5s cubic-bezier(.16,1,.3,1) both; }
  .hy-card:nth-child(1) { animation-delay:.06s }
  .hy-card:nth-child(2) { animation-delay:.13s }
  .hy-card:nth-child(3) { animation-delay:.20s }
  .hy-card:nth-child(4) { animation-delay:.27s }
  .hy-card:nth-child(5) { animation-delay:.34s }
  .hy-card:nth-child(6) { animation-delay:.41s }

  /* Spotlight card */
  .hy-sp {
    position: relative; overflow: hidden;
    border: 1px solid var(--rule, rgba(188,6,19,.14));
    border-radius: var(--r-lg, 22px);
    background: var(--white, #fff);
    transition: border-color .25s cubic-bezier(.16,1,.3,1),
                box-shadow   .25s cubic-bezier(.16,1,.3,1),
                transform    .25s cubic-bezier(.16,1,.3,1);
  }
  .hy-sp::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: radial-gradient(220px circle at var(--mx,50%) var(--my,50%),
                  rgba(188,6,19,.08), transparent 75%);
    opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 0;
  }
  .hy-sp:hover {
    border-color: rgba(188,6,19,.30);
    box-shadow: 0 8px 32px rgba(188,6,19,.09), 0 2px 8px rgba(188,6,19,.05);
    transform: translateY(-3px);
  }
  .hy-sp:hover::before { opacity: 1; }
  .hy-sp > * { position: relative; z-index: 1; }

  /* Ticker */
  @keyframes hy-tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  .hy-ticker { display:inline-flex; animation: hy-tick 28s linear infinite; }
  .hy-ticker:hover { animation-play-state: paused; }

  /* Step hover top-border */
  .hy-step {
    border-top: 2px solid transparent;
    transition: border-top-color .22s cubic-bezier(.16,1,.3,1);
  }
  .hy-step:hover { border-top-color: var(--red, #BC0613); }

  /* FAQ accordion */
  .hy-faq-btn {
    width:100%; text-align:left;
    display:flex; align-items:center; justify-content:space-between;
    border:none; cursor:pointer; gap:1rem;
    font-family: 'Outfit', sans-serif;
    transition: background .18s;
  }
  .hy-faq-btn:hover { background: rgba(188,6,19,.03) !important; }

  /* CTA btn */
  .hy-cta-btn {
    position: relative; overflow: hidden;
    border-radius: 999px;
    transition: transform .2s cubic-bezier(.16,1,.3,1);
  }
  .hy-cta-btn .hy-fill {
    position: absolute; inset: 0;
    background: rgba(255,255,255,.15);
    transform: translateX(-101%);
    transition: transform .32s cubic-bezier(.16,1,.3,1);
    z-index: 0;
  }
  .hy-cta-btn:hover .hy-fill { transform: translateX(0); }
  .hy-cta-btn:hover { transform: translateY(-1px); }
  .hy-cta-btn span { position:relative; z-index:1; display:inline-flex; align-items:center; gap:.45rem; }

  /* kbd */
  .hy-kbd {
    display:inline-block; padding:.22rem .55rem;
    background:#fff;
    border:1px solid rgba(188,6,19,.18);
    border-bottom:3px solid rgba(188,6,19,.22);
    border-radius:6px;
    font-size:.72rem; font-family:monospace; font-weight:700;
    color:var(--red, #BC0613); white-space:nowrap;
    transition: border-color .15s;
  }

  /* Responsive */
  @media (max-width: 767px) {
    .hy-hero-inner  { padding: 6rem 1.25rem 4rem !important; }
    .hy-split       { flex-direction: column !important; }
    .hy-split-stats { border-left:none !important; padding-left:0 !important;
                      border-top:1px solid rgba(255,255,255,.14) !important;
                      padding-top:1.5rem !important; flex-direction:row !important;
                      flex-wrap:wrap; gap:1.5rem !important; }
    .hy-steps-grid  { grid-template-columns: 1fr !important; }
    .hy-ctrl-grid   { grid-template-columns: 1fr !important; }
    .hy-sec         { padding: 4rem 1.25rem !important; }
    .hy-step-n      { font-size: 5rem !important; right: .75rem !important; }
    .hy-cta-inner   { flex-direction: column !important; align-items: flex-start !important; }
  }
  @media (min-width: 768px) and (max-width: 1023px) {
    .hy-ctrl-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;

function InjectCSS() {
  useEffect(() => {
    const id = 'fie-help-v1';
    if (document.getElementById(id)) return;
    const el = Object.assign(document.createElement('style'), { id, textContent: HELP_CSS });
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

/* ─── Spotlight helper ──────────────────────────────────────────────────── */
function SpotCard({ children, style, className = '' }) {
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return <div className={`hy-sp ${className}`} onMouseMove={onMove} style={style}>{children}</div>;
}

/* ─── SVG Icons ─────────────────────────────────────────────────────────── */
const Icons = {
  Building:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>,
  Map:       () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  Pin:       () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Filter:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Mouse:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="7"/><line x1="12" y1="6" x2="12" y2="10"/></svg>,
  Keyboard:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="7" width="20" height="11" rx="2"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="6" y1="15" x2="18" y2="15"/></svg>,
  Touch:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>,
  Question:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Play:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  ArrowDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>,
  ArrowRight:() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  Plus:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X:         () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

/* ─── DATA ──────────────────────────────────────────────────────────────── */
const STEPS = [
  { n:'01', Icon: Icons.Building, title:'Selecciona un edificio',   body:'Elige entre los bloques activos desde el selector de entrada — el mapa vuela automáticamente hasta el edificio.' },
  { n:'02', Icon: Icons.Map,      title:'Navega por el mapa 3D',    body:'Usa el ratón o los dedos en móvil. En escritorio puedes usar W/A/S/D para avanzar y los botones del panel derecho para zoom y pitch.' },
  { n:'03', Icon: Icons.Pin,      title:'Haz clic en un hotspot',   body:'Los puntos de interés sobre el modelo abren una ficha completa: nombre, docente, horario, teléfono y descripción del espacio.' },
  { n:'04', Icon: Icons.Filter,   title:'Filtra desde el panel',    body:'El panel izquierdo lista todos los hotspots. Usa los filtros por tipo o activa "Abierto ahora" para ver solo los espacios disponibles.' },
];

const KEYBOARD_CONTROLS = [
  { keys:['W','↑'],          desc:'Avanzar hacia el norte' },
  { keys:['S','↓'],          desc:'Retroceder hacia el sur' },
  { keys:['A','←'],          desc:'Desplazar hacia la izquierda' },
  { keys:['D','→'],          desc:'Desplazar hacia la derecha' },
  { keys:['Q'],              desc:'Rotar cámara izquierda (bearing)' },
  { keys:['E'],              desc:'Rotar cámara derecha (bearing)' },
  { keys:['R'],              desc:'Subir ángulo de visión (pitch)' },
  { keys:['F'],              desc:'Bajar ángulo de visión (pitch)' },
  { keys:['Shift','W/A/S/D'],desc:'Movimiento rápido (×4)' },
];

const POINTER_CONTROLS = [
  { keys:['Arrastrar'],       desc:'Rotar y desplazar el mapa' },
  { keys:['Scroll'],          desc:'Zoom in / zoom out' },
  { keys:['Ctrl+arrastrar'],  desc:'Inclinar la cámara (pitch)' },
  { keys:['1 dedo'],          desc:'Rotar y mover — táctil' },
  { keys:['2 dedos'],         desc:'Zoom — pellizco táctil' },
  { keys:['Clic hotspot'],    desc:'Ver información del espacio' },
  { keys:['≡'],               desc:'Abrir / cerrar panel lateral' },
  { keys:['⌂'],               desc:'Volver a la vista del campus' },
];

const FAQ = [
  { q:'¿Necesito instalar algo para usar el visor 3D?',           a:'No. FIE Explorer 3D funciona completamente en el navegador. Solo necesitas Chrome, Firefox, Edge o Safari actualizados con soporte para WebGL.' },
  { q:'¿Por qué no aparece el modelo 3D de un edificio?',         a:'Puede que ese edificio aún no tenga un modelo 3D registrado o que sus coordenadas GPS no estén configuradas. En ese caso el visor muestra un cubo rojo de demostración.' },
  { q:'¿Cómo funciona la vista Exterior e Interior?',             a:'Con los botones del panel izquierdo puedes alternar entre la vista exterior del edificio y la vista interior por planta. Cada vista puede tener su propio modelo GLB registrado.' },
  { q:'¿Puedo usar el visor en el móvil?',                        a:'Sí. El visor es completamente responsivo. En pantallas pequeñas el panel lateral se oculta automáticamente y puedes abrirlo con el botón ≡ de la esquina superior izquierda.' },
  { q:'¿Qué significa el badge "Abierto ahora"?',                 a:'Cada hotspot puede tener un horario configurado. El sistema calcula en tiempo real si el espacio está dentro de ese horario y muestra el badge verde "Abierto" o rojo "Cerrado".' },
  { q:'¿Cómo reporto información incorrecta?',                    a:'Contacta al equipo de administración de la Facultad. Los datos se gestionan desde el panel de administración y se reflejan en el visor de inmediato.' },
];

const TICKS = [
  'Centro de ayuda','Primeros pasos','Controles 3D','Preguntas frecuentes',
  'FIE Explorer','Guía de uso',
  'Centro de ayuda','Primeros pasos','Controles 3D','Preguntas frecuentes',
  'FIE Explorer','Guía de uso',
];

/* ─── Sub-components ────────────────────────────────────────────────────── */
function ControlRow({ keys, desc }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'1rem',
      padding:'.7rem 0',
      borderBottom:'1px solid var(--rule, rgba(188,6,19,.1))',
    }}>
      <div style={{ display:'flex', gap:'.3rem', flexShrink:0, flexWrap:'wrap', minWidth:120 }}>
        {keys.map(k => (
          <span key={k} className="hy-kbd">{k}</span>
        ))}
      </div>
      <span style={{ fontSize:'.83rem', fontWeight:300, color:'var(--ink, rgba(80,4,10,.65))', lineHeight:1.5 }}>{desc}</span>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <SpotCard style={{ marginBottom:'.5rem', borderRadius:16 }}>
      <button
        className="hy-faq-btn"
        onClick={() => setOpen(o => !o)}
        style={{
          padding:'1.15rem 1.5rem',
          background: open ? 'rgba(188,6,19,.03)' : '#fff',
        }}
      >
        <span style={{
          fontFamily:"'Outfit', sans-serif",
          fontWeight:600, fontSize:'.9rem',
          color: open ? 'var(--red, #BC0613)' : 'var(--ink-dark, rgba(40,2,5,.85))',
          lineHeight:1.4,
        }}>{q}</span>
        <span style={{
          width:26, height:26, flexShrink:0, borderRadius:'50%',
          background: open ? 'var(--red, #BC0613)' : 'rgba(188,6,19,.07)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color: open ? '#fff' : 'var(--red)',
          transition:'all .2s cubic-bezier(.16,1,.3,1)',
          transform: open ? 'rotate(45deg)' : 'none',
        }}>
          <Icons.Plus />
        </span>
      </button>
      {open && (
        <div style={{
          padding:'.1rem 1.5rem 1.25rem',
          borderTop:'1px solid var(--rule, rgba(188,6,19,.1))',
        }}>
          <p style={{
            fontSize:'.875rem', fontWeight:300,
            color:'var(--ink, rgba(80,4,10,.65))',
            lineHeight:1.78, margin:0, paddingTop:'.9rem',
          }}>{a}</p>
        </div>
      )}
    </SpotCard>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function Ayuda() {
  return (
    <main style={{
      paddingTop:'var(--nav-h, 64px)',
      fontFamily:"'Outfit', sans-serif",
      background:'var(--cream, #FDFAF9)',
      color:'var(--red, #BC0613)',
      minHeight:'100dvh',
    }}>
      <InjectCSS />

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <section style={{ position:'relative', overflow:'hidden', background:'var(--red, #BC0613)' }}>
        <div aria-hidden style={{ position:'absolute', top:'-90px', right:'-70px', width:340, height:340, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div aria-hidden style={{ position:'absolute', bottom:'-110px', left:'8%', width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>

        <div className="hy-hero-inner" style={{ maxWidth:1280, margin:'0 auto', padding:'7rem 5vw 5rem', position:'relative', zIndex:1 }}>
          <div className="hy-split" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'3rem' }}>

            {/* Texto */}
            <div style={{ flex:1, maxWidth:580 }}>
              <div className="hy-s0" style={{
                display:'inline-flex', alignItems:'center', gap:'.5rem',
                marginBottom:'1.5rem', padding:'.3rem .9rem',
                background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.22)',
                borderRadius:'999px',
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,.85)', display:'block' }}/>
                <span style={{ fontSize:'.65rem', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.8)' }}>
                  Centro de ayuda
                </span>
              </div>

              <h1 className="hy-s1" style={{
                fontWeight:800, fontSize:'clamp(2.4rem, 5vw, 4rem)',
                lineHeight:1.04, letterSpacing:'-.03em',
                color:'#fff', margin:'0 0 .2em',
              }}>
                ¿Cómo usar{' '}
                <span style={{ color:'rgba(255,255,255,.65)', fontWeight:300, fontSize:'.68em' }}>
                  FIE Explorer 3D?
                </span>
              </h1>

              <p className="hy-s2" style={{
                fontSize:'.98rem', fontWeight:300, lineHeight:1.75,
                color:'rgba(255,255,255,.68)', maxWidth:'50ch',
                margin:'1.25rem 0 2.5rem',
              }}>
                Guía rápida para navegar por el visor interactivo del campus,
                controlar la cámara 3D y encontrar los espacios de la Facultad.
              </p>

              <div className="hy-s3" style={{ display:'flex', gap:'.85rem', flexWrap:'wrap', alignItems:'center' }}>
                <Link to="/explorar" className="hy-cta-btn" style={{
                  display:'inline-flex', padding:'.85rem 1.9rem',
                  background:'rgba(255,255,255,.15)',
                  border:'1.5px solid rgba(255,255,255,.28)',
                  color:'#fff', textDecoration:'none',
                  fontWeight:700, fontSize:'.88rem', letterSpacing:'.03em',
                }}>
                  <div className="hy-fill"/>
                  <span><Icons.Play /> Explorar campus</span>
                </Link>
                <a href="#faq" style={{
                  display:'inline-flex', alignItems:'center', gap:'.4rem',
                  padding:'.8rem 1.5rem', borderRadius:'999px',
                  fontWeight:600, fontSize:'.85rem',
                  color:'rgba(255,255,255,.7)', textDecoration:'none',
                  border:'1.5px solid rgba(255,255,255,.18)',
                  transition:'color .2s, border-color .2s',
                }}
                onMouseEnter={e=>{ e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='rgba(255,255,255,.45)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,.7)'; e.currentTarget.style.borderColor='rgba(255,255,255,.18)'; }}>
                  Ver preguntas frecuentes
                  <Icons.ArrowDown />
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="hy-split-stats hy-s4" style={{
              display:'flex', flexDirection:'column', gap:0,
              flexShrink:0, borderLeft:'1px solid rgba(255,255,255,.15)', paddingLeft:'3rem',
            }}>
              {[
                { n:'4',    l:'Pasos de inicio'    },
                { n:'3D',   l:'Navegación en mapa' },
                { n:'FAQ',  l:'Respuestas rápidas' },
              ].map(({ n, l }, i) => (
                <div key={l} style={{
                  paddingBottom: i < 2 ? '1.5rem' : 0,
                  marginBottom:  i < 2 ? '1.5rem' : 0,
                  borderBottom:  i < 2 ? '1px solid rgba(255,255,255,.1)' : 'none',
                }}>
                  <div style={{ fontWeight:800, fontSize:'2rem', color:'#fff', lineHeight:1 }}>{n}</div>
                  <div style={{ fontSize:'.62rem', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.42)', marginTop:'.25rem' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ TICKER ══════════════════════════════════════════════════════ */}
      <div style={{
        overflow:'hidden', whiteSpace:'nowrap', userSelect:'none',
        borderTop:'2px solid var(--red)', borderBottom:'1px solid var(--rule, rgba(188,6,19,.14))',
        background:'#fff', padding:'.8rem 0',
      }}>
        <div className="hy-ticker">
          {TICKS.map((t, i) => (
            <span key={i} style={{
              display:'inline-flex', alignItems:'center', gap:'.9rem',
              padding:'0 2rem',
              fontSize:'.7rem', fontWeight:700, letterSpacing:'.14em',
              textTransform:'uppercase', color:'var(--ink, rgba(80,4,10,.52))',
            }}>
              <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--red)', flexShrink:0 }}/>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ══ PRIMEROS PASOS ══════════════════════════════════════════════ */}
      <section style={{ borderTop:'1px solid var(--rule)', background:'var(--cream)', padding:'5.5rem 5vw' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ marginBottom:'3rem' }}>
            <p style={{ fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--ink)', marginBottom:'.45rem' }}>Proceso</p>
            <h2 style={{ fontWeight:800, fontSize:'clamp(1.5rem, 3vw, 2.2rem)', letterSpacing:'-.025em', color:'var(--red)', margin:0 }}>
              En 4 pasos sencillos.
            </h2>
          </div>

          <div className="hy-steps-grid" style={{
            display:'grid', gridTemplateColumns:'repeat(2, 1fr)',
            gap:'1px', background:'var(--rule)',
            borderRadius:22, overflow:'hidden',
          }}>
            {STEPS.map(({ n, Icon, title, body }) => (
              <div key={n} className="hy-step" style={{
                position:'relative', background:'#fff', padding:'2.25rem 2rem', overflow:'hidden',
              }}>
                <span className="hy-step-n" style={{
                  position:'absolute', top:'-.5rem', right:'1.5rem',
                  fontSize:'7rem', fontWeight:800, lineHeight:1,
                  color:'rgba(188,6,19,.05)',
                  letterSpacing:'-.04em', pointerEvents:'none', userSelect:'none',
                }}>{n}</span>
                {/* Icon badge */}
                <div style={{
                  width:40, height:40, borderRadius:'50%',
                  background:'rgba(188,6,19,.06)', border:'1px solid rgba(188,6,19,.1)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--red)', marginBottom:'1rem', position:'relative', zIndex:1,
                }}>
                  <Icon />
                </div>
                <h3 style={{ fontWeight:700, fontSize:'1.05rem', color:'var(--red)', marginBottom:'.55rem', lineHeight:1.3 }}>{title}</h3>
                <p style={{ fontSize:'.85rem', color:'var(--ink)', lineHeight:1.75, margin:0, fontWeight:300 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTROLES ═══════════════════════════════════════════════════ */}
      <section style={{ borderTop:'1px solid var(--rule)', background:'#fff', padding:'5.5rem 5vw' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          {/* Section header */}
          <div style={{
            display:'flex', alignItems:'flex-end', justifyContent:'space-between',
            flexWrap:'wrap', gap:'1rem', marginBottom:'2.75rem',
            paddingBottom:'1.25rem', borderBottom:'1.5px solid var(--red)',
          }}>
            <div>
              <p style={{ fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--ink)', marginBottom:'.45rem' }}>Referencia</p>
              <h2 style={{ fontWeight:800, fontSize:'clamp(1.5rem, 3vw, 2.2rem)', letterSpacing:'-.025em', color:'var(--red)', margin:0 }}>
                Controles de navegación.
              </h2>
            </div>
          </div>

          <div className="hy-ctrl-grid" style={{
            display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'1.5rem',
          }}>
            {/* Teclado */}
            <SpotCard className="hy-card" style={{ padding:'1.75rem 2rem' }}>
              <div style={{
                display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'1.5rem',
              }}>
                <div style={{
                  width:40, height:40, borderRadius:'50%',
                  background:'rgba(188,6,19,.06)', border:'1px solid rgba(188,6,19,.1)',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'var(--red)',
                }}>
                  <Icons.Keyboard />
                </div>
                <div>
                  <p style={{ fontSize:'.62rem', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--red)', margin:0 }}>Escritorio</p>
                  <h3 style={{ fontWeight:700, fontSize:'1rem', color:'var(--red)', margin:0, lineHeight:1.3 }}>Teclado</h3>
                </div>
              </div>
              {KEYBOARD_CONTROLS.map(c => <ControlRow key={c.desc} {...c} />)}
            </SpotCard>

            {/* Ratón y móvil */}
            <SpotCard className="hy-card" style={{ padding:'1.75rem 2rem' }}>
              <div style={{
                display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'1.5rem',
              }}>
                <div style={{
                  width:40, height:40, borderRadius:'50%',
                  background:'rgba(188,6,19,.06)', border:'1px solid rgba(188,6,19,.1)',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'var(--red)',
                }}>
                  <Icons.Touch />
                </div>
                <div>
                  <p style={{ fontSize:'.62rem', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--red)', margin:0 }}>Ratón y móvil</p>
                  <h3 style={{ fontWeight:700, fontSize:'1rem', color:'var(--red)', margin:0, lineHeight:1.3 }}>Gestos y puntero</h3>
                </div>
              </div>
              {POINTER_CONTROLS.map(c => <ControlRow key={c.desc} {...c} />)}
            </SpotCard>
          </div>
        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════════════════════ */}
      <section id="faq" style={{ borderTop:'1px solid var(--rule)', background:'var(--cream)', padding:'5.5rem 5vw' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          {/* Split layout: etiqueta izquierda + preguntas derecha */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap:'clamp(2rem, 5vw, 5rem)',
            alignItems:'start',
          }}>
            {/* Columna izquierda — sticky label */}
            <div style={{ position:'sticky', top:'calc(var(--nav-h, 64px) + 2rem)' }}>
              <p style={{ fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--ink)', marginBottom:'.45rem' }}>Soporte</p>
              <h2 style={{ fontWeight:800, fontSize:'clamp(1.5rem, 3vw, 2.2rem)', letterSpacing:'-.025em', color:'var(--red)', margin:'0 0 1.25rem' }}>
                Preguntas<br/>frecuentes.
              </h2>
              <p style={{ fontSize:'.88rem', fontWeight:300, color:'var(--ink)', lineHeight:1.75, maxWidth:'32ch' }}>
                Respuestas a las dudas más comunes sobre el visor interactivo 3D y sus funciones.
              </p>

              {/* Decorative pill */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'.5rem',
                marginTop:'2rem', padding:'.35rem .9rem',
                border:'1px solid var(--rule)', borderRadius:'999px',
                background:'#fff',
              }}>
                <Icons.Question />
                <span style={{ fontSize:'.72rem', fontWeight:600, letterSpacing:'.06em', color:'var(--red)' }}>{FAQ.length} preguntas</span>
              </div>
            </div>

            {/* Columna derecha — acordeón */}
            <div>
              {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════════════════ */}
      <section style={{ borderTop:'1px solid var(--rule)', background:'var(--red, #BC0613)', padding:'5rem 5vw', position:'relative', overflow:'hidden' }}>
        <div aria-hidden style={{ position:'absolute', top:'-80px', right:'-60px', width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div className="hy-cta-inner" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'2.5rem', flexWrap:'wrap' }}>
            <div style={{ flex:1, maxWidth:520 }}>
              <p style={{ fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'rgba(255,255,255,.55)', marginBottom:'.6rem' }}>¿Todo listo?</p>
              <h2 style={{ fontWeight:800, fontSize:'clamp(1.6rem, 3.5vw, 2.8rem)', letterSpacing:'-.025em', color:'#fff', lineHeight:1.08, margin:'0 0 .75rem' }}>
                Comienza a explorar<br/>
                <span style={{ color:'rgba(255,255,255,.65)', fontWeight:300 }}>los edificios de la FIE.</span>
              </h2>
            </div>

            <div style={{ display:'flex', gap:'.85rem', flexWrap:'wrap', flexShrink:0 }}>
              <Link to="/directorio" style={{
                display:'inline-flex', alignItems:'center', gap:'.4rem',
                padding:'.85rem 1.75rem', borderRadius:'999px',
                background:'rgba(255,255,255,.12)',
                border:'1.5px solid rgba(255,255,255,.25)',
                color:'rgba(255,255,255,.85)', textDecoration:'none',
                fontWeight:600, fontSize:'.88rem', letterSpacing:'.02em',
                transition:'border-color .2s, color .2s',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.5)'; e.currentTarget.style.color='#fff'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.25)'; e.currentTarget.style.color='rgba(255,255,255,.85)'; }}>
                Ver directorio
              </Link>
              <Link to="/explorar" className="hy-cta-btn" style={{
                display:'inline-flex', padding:'.85rem 1.9rem',
                background:'#fff',
                border:'1.5px solid rgba(255,255,255,.4)',
                color:'var(--red, #BC0613)', textDecoration:'none',
                fontWeight:800, fontSize:'.88rem', letterSpacing:'.02em',
              }}>
                <div className="hy-fill" style={{ background:'rgba(188,6,19,.08)' }}/>
                <span style={{ color:'var(--red)' }}>
                  Explorar 3D <Icons.ArrowRight />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}