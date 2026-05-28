/**
 * AcercaDe.jsx — FIE Explorer 3D
 * Rediseño con consistencia total al sistema de diseño: Outfit, var(--red),
 * spotlight cards, bordes redondeados, animaciones stagger, sin emojis.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const ABOUT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

  /* Stagger reveal */
  @keyframes ab-up {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .ab-s0 { animation: ab-up .6s cubic-bezier(.16,1,.3,1) .04s both; }
  .ab-s1 { animation: ab-up .6s cubic-bezier(.16,1,.3,1) .14s both; }
  .ab-s2 { animation: ab-up .6s cubic-bezier(.16,1,.3,1) .24s both; }
  .ab-s3 { animation: ab-up .6s cubic-bezier(.16,1,.3,1) .36s both; }
  .ab-s4 { animation: ab-up .6s cubic-bezier(.16,1,.3,1) .48s both; }

  /* Card stagger */
  @keyframes ab-card {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .ab-card { animation: ab-card .5s cubic-bezier(.16,1,.3,1) both; }
  .ab-card:nth-child(1) { animation-delay:.06s }
  .ab-card:nth-child(2) { animation-delay:.13s }
  .ab-card:nth-child(3) { animation-delay:.20s }
  .ab-card:nth-child(4) { animation-delay:.27s }
  .ab-card:nth-child(5) { animation-delay:.34s }
  .ab-card:nth-child(6) { animation-delay:.41s }

  /* Spotlight card */
  .ab-sp {
    position: relative; overflow: hidden;
    border: 1px solid var(--rule);
    border-radius: var(--r-lg, 22px);
    background: var(--white, #fff);
    transition: border-color .25s cubic-bezier(.16,1,.3,1),
                box-shadow   .25s cubic-bezier(.16,1,.3,1),
                transform    .25s cubic-bezier(.16,1,.3,1);
  }
  .ab-sp::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: radial-gradient(220px circle at var(--mx,50%) var(--my,50%),
                  rgba(188,6,19,.08), transparent 75%);
    opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 0;
  }
  .ab-sp:hover {
    border-color: rgba(188,6,19,.30);
    box-shadow: 0 8px 32px rgba(188,6,19,.09), 0 2px 8px rgba(188,6,19,.05);
    transform: translateY(-3px);
  }
  .ab-sp:hover::before { opacity: 1; }
  .ab-sp > * { position: relative; z-index: 1; }

  /* Ticker */
  @keyframes ab-tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  .ab-ticker { display:inline-flex; animation: ab-tick 28s linear infinite; }
  .ab-ticker:hover { animation-play-state: paused; }

  /* Pulse dot */
  @keyframes ab-pulse {
    0%   { transform:scale(1);   opacity:.8; }
    100% { transform:scale(2.6); opacity:0;  }
  }

  /* Step hover top-border */
  .ab-step {
    border-top: 2px solid transparent;
    transition: border-top-color .22s cubic-bezier(.16,1,.3,1);
  }
  .ab-step:hover { border-top-color: var(--red, #BC0613); }

  /* CTA btn hover */
  .ab-cta-btn {
    position: relative; overflow: hidden;
    border-radius: 999px;
    transition: transform .2s cubic-bezier(.16,1,.3,1);
  }
  .ab-cta-btn .ab-fill {
    position: absolute; inset: 0;
    background: rgba(255,255,255,.15);
    transform: translateX(-101%);
    transition: transform .32s cubic-bezier(.16,1,.3,1);
    z-index: 0;
  }
  .ab-cta-btn:hover .ab-fill { transform: translateX(0); }
  .ab-cta-btn:hover { transform: translateY(-1px); }
  .ab-cta-btn span { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: .45rem; }
  .ab-cta-inner { flex-direction: column !important; align-items: flex-start !important; }

  /* Responsive */
  @media (max-width: 767px) {
    .ab-hero-inner  { padding: 6rem 1.25rem 4rem !important; }
    .ab-split       { flex-direction: column !important; }
    .ab-split-stats { border-left: none !important; padding-left: 0 !important;
                      border-top: 1px solid rgba(255,255,255,.14) !important;
                      padding-top: 1.5rem !important; flex-direction: row !important;
                      flex-wrap: wrap; gap: 1.5rem !important; }
    .ab-steps-grid  { grid-template-columns: 1fr !important; }
    .ab-tech-grid   { grid-template-columns: 1fr !important; }
    .ab-team-grid   { grid-template-columns: 1fr !important; }
    .ab-sec         { padding: 4rem 1.25rem !important; }
    .ab-step-n      { font-size: 5rem !important; right: .75rem !important; }
  }
  @media (min-width: 768px) and (max-width: 1023px) {
    .ab-tech-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .ab-team-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;

function InjectCSS() {
  useEffect(() => {
    const id = 'fie-about-v1';
    if (document.getElementById(id)) return;
    const el = Object.assign(document.createElement('style'), { id, textContent: ABOUT_CSS });
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
  return <div className={`ab-sp ${className}`} onMouseMove={onMove} style={style}>{children}</div>;
}

/* ─── SVG Icons ─────────────────────────────────────── */
const Icons = {
  React:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/></svg>,
  Map:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  Server:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  DB:      () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Shield:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Cube:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  User:    () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  GradCap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Arrow:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  Play:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Check:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  ArrowRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
};

/* ─── TECH STACK DATA ─────────────────────────────────────────────────────── */
const TECH = [
  { Icon: Icons.React,  label: 'React + Vite',             desc: 'SPA con lazy loading, Zustand para estado global y HMR instantáneo en desarrollo.' },
  { Icon: Icons.Map,    label: 'Mapbox GL + Three.js',      desc: 'Modelos GLB sobre capas WebGL personalizadas. Proyección Mercator para precisión geoespacial.' },
  { Icon: Icons.Server, label: 'Node.js + Express',         desc: 'API REST con JWT, cookies HttpOnly, rate limiting por IP y caché Redis.' },
  { Icon: Icons.DB,     label: 'PostgreSQL + PostGIS',       desc: 'BD relacional con soporte espacial, AES-256 en columnas sensibles y audit_logs inmutables.' },
  { Icon: Icons.Shield, label: 'Seguridad multicapa',       desc: 'Helmet (CSP, HSTS, nosniff), sanitización de entradas y bloqueo progresivo de cuentas admin.' },
  { Icon: Icons.Cube,   label: 'Fotogrametría GLB',         desc: 'Modelos capturados por fotogrametría y exportados en GLB optimizado para streaming web.' },
];

/* ─── TEAM DATA ───────────────────────────────────────────────────────────── */
const TEAM = [
  {
    Icon: Icons.User,
    name: 'Adrian Grefa Rivadeneyra',
    role: 'Desarrollo · Proyecto de Titulación',
    detail: 'Escuela de Ingeniería en Sistemas · EIS — ESPOCH · Código 7333',
  },
  {
    Icon: Icons.GradCap,
    name: 'Director de Tesis',
    role: 'Tutor académico',
    detail: 'Facultad de Informática y Electrónica · ESPOCH',
  },
];

/* ─── HOW IT WORKS ────────────────────────────────────────────────────────── */
const STEPS = [
  { n:'01', title:'Selecciona un edificio',   body:'Elige entre los distintos bloques desde el mapa 3D o la lista de instalaciones del campus.' },
  { n:'02', title:'Navega en 3D',             body:'Rota, acerca y desplaza el modelo con libertad total. Three.js y WebGL procesan cada frame a 60 fps.' },
  { n:'03', title:'Activa los hotspots',      body:'Cada sala tiene una malla nombrada. Haz clic para revelar la ficha completa del espacio.' },
  { n:'04', title:'Consulta la información',  body:'Horarios, equipamiento, docentes e imágenes del espacio en tiempo real, sin estar presencialmente.' },
];

const TICKS = [
  'Visualización 3D','Campus ESPOCH','Modelos GLB','Laboratorios interactivos',
  'WebGL · Three.js','FIE Explorer',
  'Visualización 3D','Campus ESPOCH','Modelos GLB','Laboratorios interactivos',
  'WebGL · Three.js','FIE Explorer',
];

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function AcercaDe() {
  return (
    <main style={{
      paddingTop: 'var(--nav-h, 64px)',
      fontFamily: "'Outfit', sans-serif",
      background: 'var(--cream, #FDFAF9)',
      color: 'var(--red, #BC0613)',
      minHeight: '100dvh',
    }}>
      <InjectCSS />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--red, #BC0613)',
      }}>
        {/* Círculos decorativos */}
        <div aria-hidden style={{ position:'absolute', top:'-90px', right:'-70px', width:340, height:340, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div aria-hidden style={{ position:'absolute', bottom:'-110px', left:'8%',  width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>

        <div className="ab-hero-inner" style={{ maxWidth:1280, margin:'0 auto', padding:'7rem 5vw 5rem', position:'relative', zIndex:1 }}>
          <div className="ab-split" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'3rem' }}>

            {/* Texto */}
            <div style={{ flex:1, maxWidth:580 }}>
              {/* Eyebrow */}
              <div className="h-0" style={{
                display:'inline-flex', alignItems:'center', gap:'.5rem',
                marginBottom:'1.5rem', padding:'.3rem .9rem',
                background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.22)',
                borderRadius:'999px',
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,.85)', display:'block' }}/>
                <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.65rem', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.8)' }}>
                  Acerca de
                </span>
              </div>

              <h1 className="ab-s1" style={{
                fontFamily:"'Outfit', sans-serif", fontWeight:800,
                fontSize:'clamp(2.4rem, 5vw, 4rem)',
                lineHeight:1.04, letterSpacing:'-.03em',
                color:'#fff', margin:'0 0 .2em',
              }}>
                FIE Explorer 3D.<br/>
                <span style={{ color:'rgba(255,255,255,.65)', fontWeight:300, fontSize:'.68em' }}>
                  El campus, en tu pantalla.
                </span>
              </h1>

              <p className="ab-s2" style={{
                fontSize:'.98rem', fontWeight:300, lineHeight:1.75,
                color:'rgba(255,255,255,.68)', maxWidth:'50ch',
                margin:'1.25rem 0 2.5rem',
              }}>
                Visor interactivo 3D de la Facultad de Informática y Electrónica
                de la Escuela Superior Politécnica de Chimborazo.
                Navega edificios, laboratorios y espacios en el navegador, sin instalaciones.
              </p>

              {/* CTA */}
              <div className="ab-s3" style={{ display:'flex', gap:'.85rem', flexWrap:'wrap', alignItems:'center' }}>
                <Link to="/explorar" className="ab-cta-btn" style={{
                  display:'inline-flex', padding:'.85rem 1.9rem',
                  background:'rgba(255,255,255,.15)',
                  border:'1.5px solid rgba(255,255,255,.28)',
                  color:'#fff', textDecoration:'none',
                  fontFamily:"'Outfit', sans-serif", fontWeight:700, fontSize:'.88rem',
                  letterSpacing:'.03em',
                }}>
                  <div className="ab-fill"/>
                  <span><Icons.Play /> Explorar campus</span>
                </Link>
                <a href="#stack" style={{
                  display:'inline-flex', alignItems:'center', gap:'.4rem',
                  padding:'.8rem 1.5rem', borderRadius:'999px',
                  fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:'.85rem',
                  color:'rgba(255,255,255,.7)', textDecoration:'none',
                  border:'1.5px solid rgba(255,255,255,.18)',
                  transition:'color .2s, border-color .2s',
                }}
                onMouseEnter={e=>{ e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='rgba(255,255,255,.45)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,.7)'; e.currentTarget.style.borderColor='rgba(255,255,255,.18)'; }}>
                  Ver el stack tecnológico
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="ab-split-stats ab-s4" style={{
              display:'flex', flexDirection:'column', gap:'0',
              flexShrink:0,
              borderLeft:'1px solid rgba(255,255,255,.15)',
              paddingLeft:'3rem',
            }}>
              {[
                { n:'3D',   l:'Visualización interactiva' },
                { n:'360°', l:'Navegación libre'          },
                { n:'Web',  l:'Sin instalación'           },
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

      {/* ══ TICKER ════════════════════════════════════════════════════════ */}
      <div style={{
        overflow:'hidden', whiteSpace:'nowrap', userSelect:'none',
        borderTop:'2px solid var(--red)', borderBottom:'1px solid var(--rule, rgba(188,6,19,.14))',
        background:'#fff', padding:'.8rem 0',
      }}>
        <div className="ab-ticker">
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

      {/* ══ split asimétrico ══════════════════════════════════ */}
      <div className="ab-sec" style={{ padding:'5.5rem 5vw', maxWidth:1280, margin:'0 auto' }}>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          gap:'clamp(2rem, 5vw, 4rem)',
          alignItems:'center',
        }}>
          {/* Texto izquierda */}
          <div>
            <p style={{ fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--ink)', marginBottom:'.5rem' }}>¿Qué es?</p>
            <h2 style={{
              fontFamily:"'Outfit', sans-serif", fontWeight:800,
              fontSize:'clamp(1.6rem, 3vw, 2.4rem)',
              letterSpacing:'-.025em', lineHeight:1.1,
              color:'var(--red)', margin:'0 0 1.5rem',
            }}>
              Una nueva forma de conocer la&nbsp;FIE.
            </h2>
            <p style={{ fontSize:'.95rem', fontWeight:300, color:'var(--ink)', lineHeight:1.8, marginBottom:'1rem' }}>
              FIE Explorer 3D es una aplicación web que permite explorar de forma interactiva
              los edificios, laboratorios, oficinas y espacios de servicio de la Facultad mediante
              modelos 3D navegables directamente en el navegador.
            </p>
            <p style={{ fontSize:'.95rem', fontWeight:300, color:'var(--ink)', lineHeight:1.8, margin:0 }}>
              Cada punto de interés contiene información descriptiva, horario de atención,
              docente responsable y datos de contacto — pensado para orientar a estudiantes,
              docentes y visitantes del campus.
            </p>
          </div>

          {/* Columna de features */}
          <div style={{ display:'flex', flexDirection:'column', gap:'.85rem' }}>
            {[
              { tag:'3D',   desc:'Visualización interactiva en tiempo real mediante WebGL' },
              { tag:'360°', desc:'Navegación libre — rota, acerca y desplaza el modelo' },
              { tag:'Web',  desc:'Sin instalación · corre directamente en el navegador' },
            ].map(({ tag, desc }) => (
              <SpotCard key={tag} style={{ padding:'1.25rem 1.5rem', display:'flex', alignItems:'center', gap:'1.25rem' }}>
                <div style={{
                  width:48, height:48, borderRadius:'50%',
                  background:'var(--red-06, rgba(188,6,19,.06))',
                  border:'1px solid var(--red-10, rgba(188,6,19,.10))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--red)', flexShrink:0,
                  fontWeight:800, fontSize:'.78rem', letterSpacing:'-.01em',
                }}>
                  {tag}
                </div>
                <span style={{ fontSize:'.88rem', fontWeight:400, color:'var(--ink)', lineHeight:1.55 }}>{desc}</span>
              </SpotCard>
            ))}
          </div>
        </div>
      </div>

      {/* ══ STACK TECNOLÓGICO ═════════════════════════════════════════════ */}
      <section id="stack" style={{ borderTop:'1px solid var(--rule)', background:'#fff', padding:'5.5rem 5vw' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          {/* Header */}
          <div style={{
            display:'flex', alignItems:'flex-end', justifyContent:'space-between',
            flexWrap:'wrap', gap:'1rem', marginBottom:'2.75rem',
            paddingBottom:'1.25rem', borderBottom:'1.5px solid var(--red)',
          }}>
            <div>
              <p style={{ fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--ink)', marginBottom:'.45rem' }}>Tecnología</p>
              <h2 style={{ fontFamily:"'Outfit', sans-serif", fontWeight:800, fontSize:'clamp(1.5rem,3vw,2.2rem)', letterSpacing:'-.025em', color:'var(--red)', margin:0 }}>
                Construido con tecnología web moderna.
              </h2>
            </div>
          </div>

          {/* Grid 3-col */}
          <div className="ab-tech-grid" style={{
            display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem',
          }}>
            {TECH.map(({ Icon, label, desc }) => (
              <SpotCard key={label} className="ab-card" style={{ padding:'1.6rem' }}>
                {/* Ícono */}
                <div style={{
                  width:40, height:40, borderRadius:'50%',
                  background:'var(--red-06)', border:'1px solid var(--red-10)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--red)', marginBottom:'1rem', flexShrink:0,
                }}>
                  <Icon />
                </div>
                <h3 style={{
                  fontFamily:"'Outfit', sans-serif", fontWeight:700, fontSize:'.95rem',
                  color:'var(--red)', marginBottom:'.5rem', lineHeight:1.3,
                }}>{label}</h3>
                <p style={{ fontSize:'.8rem', fontWeight:300, color:'var(--ink)', lineHeight:1.7, margin:0 }}>{desc}</p>
              </SpotCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ═════════════════════════════════════════════════ */}
      <section style={{ borderTop:'1px solid var(--rule)', background:'var(--cream)', padding:'5.5rem 5vw' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ marginBottom:'3rem' }}>
            <p style={{ fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--ink)', marginBottom:'.45rem' }}>Proceso</p>
            <h2 style={{ fontFamily:"'Outfit', sans-serif", fontWeight:800, fontSize:'clamp(1.5rem,3vw,2.2rem)', letterSpacing:'-.025em', color:'var(--red)', margin:0 }}>
              ¿Cómo funciona?
            </h2>
          </div>

          <div className="ab-steps-grid" style={{
            display:'grid', gridTemplateColumns:'repeat(2, 1fr)',
            gap:'1px', background:'var(--rule)',
            borderRadius:'22px', overflow:'hidden',
          }}>
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="ab-step" style={{
                position:'relative', background:'#fff', padding:'2.25rem 2rem', overflow:'hidden',
              }}>
                <span className="ab-step-n" style={{
                  position:'absolute', top:'-.5rem', right:'1.5rem',
                  fontSize:'7rem', fontWeight:800, lineHeight:1,
                  color:'rgba(188,6,19,.05)',
                  fontFamily:"'Outfit', sans-serif",
                  letterSpacing:'-.04em', pointerEvents:'none', userSelect:'none',
                }}>{n}</span>
                <div style={{ fontSize:'.62rem', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--red)', marginBottom:'.9rem' }}>{n}</div>
                <h3 style={{ fontFamily:"'Outfit', sans-serif", fontWeight:700, fontSize:'1.05rem', color:'var(--red)', marginBottom:'.55rem', lineHeight:1.3 }}>{title}</h3>
                <p style={{ fontSize:'.85rem', color:'var(--ink)', lineHeight:1.75, margin:0, fontWeight:300 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* ══ CTA ════════════════════════════════════════════════════════ */}
      <section style={{ borderTop:'1px solid var(--rule)', background:'var(--red, #BC0613)', padding:'5rem 5vw', position:'relative', overflow:'hidden' }}>
        <div aria-hidden style={{ position:'absolute', top:'-80px', right:'-60px', width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div className="ab-cta-inner" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'2.5rem', flexWrap:'wrap' }}>
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
              <Link to="/explorar" className="ab-cta-btn" style={{
                display:'inline-flex', padding:'.85rem 1.9rem',
                background:'#fff',
                border:'1.5px solid rgba(255,255,255,.4)',
                color:'var(--red, #BC0613)', textDecoration:'none',
                fontWeight:800, fontSize:'.88rem', letterSpacing:'.02em',
              }}>
                <div className="ab-fill" style={{ background:'rgba(188,6,19,.08)' }}/>
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