/**
 * Home.jsx — FIE Explorer 3D
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { buildingsService } from '../services/buildingsService';

/* ─── Paleta por tipo de edificio ─────────────────────────────────────────── */
// Misma lógica que TYPE_PALETTE en Directorio.jsx
const BUILDING_PALETTE = {
  main: {
    iconBg:     'var(--red-06)',
    iconBorder: 'var(--red-10)',
    iconColor:  'var(--red)',
    accentBar:  'var(--red)',
    badgeBg:    'var(--red-06)',
    badgeBorder:'var(--red-10)',
    badgeColor: 'var(--red)',
  },
  secondary: {
    iconBg:     'rgba(120,53,15,.06)',
    iconBorder: 'rgba(120,53,15,.14)',
    iconColor:  '#92400e',
    accentBar:  '#92400e',
    badgeBg:    'rgba(120,53,15,.06)',
    badgeBorder:'rgba(120,53,15,.14)',
    badgeColor: '#92400e',
  },
  lab: {
    iconBg:     'rgba(14,116,144,.07)',
    iconBorder: 'rgba(14,116,144,.15)',
    iconColor:  '#0e7490',
    accentBar:  '#0e7490',
    badgeBg:    'rgba(14,116,144,.07)',
    badgeBorder:'rgba(14,116,144,.15)',
    badgeColor: '#0e7490',
  },
};

function getPalette(type) {
  return BUILDING_PALETTE[type] || BUILDING_PALETTE.main;
}

/* ─── CSS global ──────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

  :root {
    --red:      #BC0613;
    --red-h:    #A3050F;
    --red-10:   rgba(188,6,19,.10);
    --red-18:   rgba(188,6,19,.18);
    --red-06:   rgba(188,6,19,.06);
    --red-03:   rgba(188,6,19,.03);
    --cream:    #FDFAF9;
    --ink:      rgba(80,4,10,.55);
    --rule:     rgba(188,6,19,.14);
    --white:    #FFFFFF;
    --ease:     cubic-bezier(.16,1,.3,1);
    --r-sm:     10px;
    --r-md:     16px;
    --r-lg:     22px;
    --r-xl:     32px;
    --r-full:   999px;
  }

  /* ─── Stagger load-in ─────────────────────────────────────────────────── */
  @keyframes slide-up {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .s0{animation:slide-up .6s var(--ease) .04s both;}
  .s1{animation:slide-up .6s var(--ease) .14s both;}
  .s2{animation:slide-up .6s var(--ease) .24s both;}
  .s3{animation:slide-up .6s var(--ease) .36s both;}
  .s4{animation:slide-up .6s var(--ease) .50s both;}

  /* ─── Stagger para grids ──────────────────────────────────────────────── */
  @keyframes card-in {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .g-item { animation:card-in .55s var(--ease) both; }
  .g-item:nth-child(1){animation-delay:.05s}
  .g-item:nth-child(2){animation-delay:.12s}
  .g-item:nth-child(3){animation-delay:.19s}
  .g-item:nth-child(4){animation-delay:.26s}
  .g-item:nth-child(5){animation-delay:.33s}
  .g-item:nth-child(6){animation-delay:.40s}

  /* ─── Ticker ─────────────────────────────────────────────────────────── */
  @keyframes tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  .ticker-track { display:inline-flex; animation:tick 32s linear infinite; }
  .ticker-track:hover { animation-play-state:paused; }

  /* ─── Shimmer skeleton ────────────────────────────────────────────────── */
  @keyframes shimmer {
    0%,100%{background-position:200% 0}
    50%    {background-position:-200% 0}
  }

  /* ─── Spotlight card ─────────────────────────────────────────────────── */
  .sp-card {
    position:relative; overflow:hidden;
    border:1px solid var(--rule);
    border-radius:var(--r-lg);
    transition:border-color .28s var(--ease), box-shadow .28s var(--ease), transform .28s var(--ease), opacity .28s var(--ease);
  }
  .sp-card::before {
    content:'';
    position:absolute; inset:0; border-radius:inherit;
    background:radial-gradient(260px circle at var(--mx,50%) var(--my,50%), var(--red-10), transparent 80%);
    opacity:0;
    transition:opacity .3s;
    pointer-events:none; z-index:0;
  }
  .sp-card:hover { border-color:rgba(188,6,19,.35); box-shadow:0 10px 36px rgba(188,6,19,.10), 0 2px 8px rgba(188,6,19,.05); transform:translateY(-3px); }
  .sp-card:hover::before { opacity:1; }
  .sp-card:active { transform:translateY(-1px) scale(.997); }
  .sp-card > * { position:relative; z-index:1; }

  /* ─── Directional hover CTA ──────────────────────────────────────────── */
  .dir-btn {
    position:relative; overflow:hidden;
    border-radius:var(--r-full);
    transition:color .25s var(--ease);
  }
  .dir-btn .fill {
    position:absolute; inset:0;
    background:var(--red-h);
    transform:translateX(-101%);
    transition:transform .32s var(--ease);
    z-index:0;
  }
  .dir-btn.from-right .fill { transform:translateX(101%); }
  .dir-btn:hover .fill,
  .dir-btn.entering .fill  { transform:translateX(0); }
  .dir-btn span { position:relative; z-index:1; display:inline-flex; align-items:center; gap:.5rem; }

  /* ─── Step number decoration ─────────────────────────────────────────── */
  .step-num {
    font-size:7rem; font-weight:800; line-height:1;
    color:var(--red-06);
    font-family:'Outfit',sans-serif;
    pointer-events:none; user-select:none;
    letter-spacing:-.04em;
    position:absolute; top:-.5rem; right:1.5rem;
  }

  /* ─── Pulse dot ──────────────────────────────────────────────────────── */
  @keyframes pulse-ring {
    0%   { transform:scale(1);   opacity:.8; }
    100% { transform:scale(2.8); opacity:0; }
  }

  /* ─── Responsive ─────────────────────────────────────────────────────── */
  @media (max-width:767px) {
    .hero-grid   { grid-template-columns:1fr !important; }
    .hero-img    { display:none !important; }
    .hero-inner  { padding:6.5rem 1.25rem 4rem !important; }
    .bento-grid  { grid-template-columns:1fr !important; }
    .bento-grid .featured { grid-column:span 1 !important; }
    .steps-grid  { grid-template-columns:1fr !important; }
    .cta-row     { flex-direction:column; align-items:stretch !important; }
    .cta-row .dir-btn { text-align:center; justify-content:center !important; }
    .sec-pad     { padding:4.5rem 1.25rem !important; }
    .step-num    { font-size:5rem !important; right:.75rem !important; }
    .hero-stats  { flex-wrap:wrap; gap:1.5rem !important; }
    .stat-sep    { display:none; }
  }
  @media (min-width:768px) and (max-width:1023px) {
    .bento-grid  { grid-template-columns:1fr 1fr !important; }
    .bento-grid .featured { grid-column:span 2; }
    .hero-inner  { padding:7rem 3rem 4.5rem !important; }
  }
`;

function InjectCSS() {
  useEffect(() => {
    const id = 'fie-v5';
    if (document.getElementById(id)) return;
    const el = Object.assign(document.createElement('style'), { id, textContent: CSS });
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

/* ─── Directional hover hook ─────────────────────────────────────────────── */
function useDirHover(ref) {
  const enter = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const fromRight = e.clientX > r.left + r.width / 2;
    el.classList.toggle('from-right', fromRight);
    el.classList.add('entering');
  }, [ref]);
  const leave = useCallback(() => {
    ref.current?.classList.remove('entering');
  }, [ref]);
  return { onMouseEnter: enter, onMouseLeave: leave };
}

/* ─── Spotlight card ─────────────────────────────────────────────────────── */
function SpotlightCard({ children, style, className = '' }) {
  const handleMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div className={`sp-card ${className}`} onMouseMove={handleMove} style={style}>
      {children}
    </div>
  );
}

/* ─── CountUp ─────────────────────────────────────────────────────────────── */
function CountUp({ end, suffix = '' }) {
  const [v, setV] = useState(0);
  const ref = useRef();
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const n = parseInt(end, 10);
      if (isNaN(n)) { setV(end); return; }
      let cur = 0;
      const step = Math.max(1, Math.ceil(n / 30));
      const id = setInterval(() => {
        cur = Math.min(cur + step, n);
        setV(cur);
        if (cur >= n) clearInterval(id);
      }, 38);
    }, { threshold: .5 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{v}{suffix}</span>;
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function Home() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buildingsService.getAll()
      .then(r => setBuildings(Array.isArray(r) ? r : (r?.data ?? [])))
      .catch(() => setBuildings([]))
      .finally(() => setLoading(false));
  }, []);

  const TICKS = [
    'Visualización 3D','Campus ESPOCH','Modelos GLB',
    'Laboratorios interactivos','WebGL · Three.js','FIE Explorer',
    'Visualización 3D','Campus ESPOCH','Modelos GLB',
    'Laboratorios interactivos','WebGL · Three.js','FIE Explorer',
  ];

  return (
    <main style={{ paddingTop:'var(--nav-h,64px)', fontFamily:"'Outfit',sans-serif", background:'var(--cream)', color:'var(--red)' }}>
      <InjectCSS />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section style={{
        position:'relative', minHeight:'100dvh', overflow:'hidden',
        backgroundImage:'url(https://www.espoch.edu.ec/wp-content/uploads/2022/08/Fie-scaled.jpg)',
        backgroundSize:'cover', backgroundPosition:'center',
      }}>
        <div aria-hidden style={{
          position:'absolute', inset:0, zIndex:0,
          background:'linear-gradient(100deg, rgba(253,250,249,.97) 0%, rgba(253,250,249,.92) 42%, rgba(253,250,249,.52) 68%, rgba(253,250,249,.12) 100%)',
        }}/>
        <div aria-hidden style={{
          position:'absolute', left:0, top:0, bottom:0, width:3, zIndex:1,
          background:'linear-gradient(to bottom, transparent 0%, var(--red) 25%, var(--red) 75%, transparent 100%)',
        }}/>

        <div className="hero-inner" style={{
          position:'relative', zIndex:2,
          maxWidth:1320, margin:'0 auto',
          padding:'8rem 5vw 5rem',
          display:'flex', flexDirection:'column',
          alignItems:'flex-start',
          minHeight:'100dvh', justifyContent:'center',
        }}>
          <div style={{ maxWidth:580 }}>
            <div className="s0" style={{ display:'inline-flex', alignItems:'center', gap:'.55rem', marginBottom:'1.75rem' }}>
              <span style={{ position:'relative', display:'flex', alignItems:'center' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--red)', display:'block', flexShrink:0 }}/>
                <span aria-hidden style={{ position:'absolute', inset:0, borderRadius:'50%', background:'var(--red)', animation:'pulse-ring 2.2s ease-out infinite' }}/>
              </span>
              <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.7rem', fontWeight:600, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--red)' }}>
                ESPOCH · Facultad de Informática y Electrónica
              </span>
            </div>

            <h1 className="s1" style={{
              fontFamily:"'Outfit',sans-serif", fontWeight:800,
              fontSize:'clamp(2.6rem,5.5vw,4.4rem)',
              lineHeight:1.04, letterSpacing:'-.03em',
              color:'var(--red)', margin:'0 0 .2em',
            }}>
              Recorre la&nbsp;FIE<br/>
              <span style={{ color:'rgba(80,4,10,.75)', fontWeight:700 }}>sin estar ahí.</span>
            </h1>

            <p className="s2" style={{
              fontSize:'1.02rem', fontWeight:300, lineHeight:1.75,
              color:'var(--ink)', maxWidth:'52ch', margin:'1.4rem 0 2.25rem',
            }}>
              Navega edificios, laboratorios y espacios en tres dimensiones.
              Toca cualquier sala para ver horarios, docentes y equipamiento en tiempo real.
            </p>

            <div className="s3 cta-row" style={{ display:'flex', gap:'.85rem', alignItems:'center' }}>
              <PrimaryBtn to="/explorar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Iniciar exploración
              </PrimaryBtn>
              <a href="#edificios" style={{
                display:'inline-flex', alignItems:'center', gap:'.4rem',
                padding:'.8rem 1.5rem',
                fontFamily:"'Outfit',sans-serif", fontWeight:600, fontSize:'.88rem',
                color:'var(--red)', textDecoration:'none',
                border:'1.5px solid var(--rule)', borderRadius:'var(--r-full)',
                background:'rgba(253,250,249,.7)', backdropFilter:'blur(6px)',
                transition:'border-color .25s var(--ease), background .25s var(--ease)',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(188,6,19,.45)'; e.currentTarget.style.background='var(--white)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--rule)'; e.currentTarget.style.background='rgba(253,250,249,.7)'; }}>
                Ver edificios
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </a>
            </div>

            <div className="s4 hero-stats" style={{
              display:'flex', gap:'0', marginTop:'3.25rem',
              paddingTop:'2rem', borderTop:'1px solid var(--rule)',
            }}>
              {[
                { n:'5',   sx:'',   l:'Edificios'    },
                { n:'20',  sx:'+',  l:'Laboratorios' },
                { n:'360', sx:'°',  l:'Exploración'  },
              ].map(({ n, sx, l }, i) => (
                <div key={l} style={{ flex:1, textAlign:'left', position:'relative', paddingLeft: i > 0 ? '1.5rem' : 0 }}>
                  {i > 0 && <span className="stat-sep" style={{ position:'absolute', left:0, top:'10%', bottom:'10%', width:1, background:'var(--rule)' }}/>}
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:'1.9rem', color:'var(--red)', lineHeight:1 }}>
                    <CountUp end={n} suffix={sx}/>
                  </div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.68rem', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--ink)', marginTop:'.3rem' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ TICKER ════════════════════════════════════════════════════════ */}
      <div style={{
        overflow:'hidden', whiteSpace:'nowrap', userSelect:'none',
        borderTop:'2px solid var(--red)', borderBottom:'1px solid var(--rule)',
        background:'var(--white)', padding:'.8rem 0',
      }}>
        <div className="ticker-track">
          {TICKS.map((t, i) => (
            <span key={i} style={{
              display:'inline-flex', alignItems:'center', gap:'.9rem',
              padding:'0 2rem',
              fontFamily:"'Outfit',sans-serif", fontSize:'.7rem', fontWeight:700,
              letterSpacing:'.14em', textTransform:'uppercase', color:'var(--ink)',
            }}>
              <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--red)', flexShrink:0 }}/>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ══ EDIFICIOS — bento asimétrico ══════════════════════════════════ */}
      <section id="edificios" className="sec-pad" style={{ padding:'5.5rem 5vw', background:'var(--cream)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{
            display:'flex', alignItems:'flex-end', justifyContent:'space-between',
            flexWrap:'wrap', gap:'1rem', marginBottom:'2.75rem',
            paddingBottom:'1.25rem', borderBottom:'1.5px solid var(--red)',
          }}>
            <div>
              <p style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--ink)', marginBottom:'.45rem' }}>Instalaciones</p>
              <h2 style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:'clamp(1.7rem,3.2vw,2.5rem)', letterSpacing:'-.025em', color:'var(--red)', margin:0 }}>Edificios de la FIE</h2>
            </div>
            <Link to="/explorar" style={{
              fontFamily:"'Outfit',sans-serif", fontSize:'.76rem', fontWeight:700,
              letterSpacing:'.08em', textTransform:'uppercase',
              color:'var(--ink)', textDecoration:'none',
              display:'flex', alignItems:'center', gap:'.35rem',
              transition:'color .2s var(--ease)',
            }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--ink)'}>
              Mapa completo
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>

          {loading ? <BentoSkeleton /> : <BentoGrid buildings={buildings} />}
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ═════════════════════════════════════════════════ */}
      <section className="sec-pad" style={{ padding:'5.5rem 5vw', background:'var(--white)', borderTop:'1px solid var(--rule)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ marginBottom:'3.5rem' }}>
            <p style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.68rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'var(--ink)', marginBottom:'.45rem' }}>Proceso</p>
            <h2 style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:'clamp(1.7rem,3.2vw,2.5rem)', letterSpacing:'-.025em', color:'var(--red)', margin:0 }}>¿Cómo funciona?</h2>
          </div>

          <div className="steps-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', background:'var(--rule)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
            {[
              { n:'01', title:'Selecciona un edificio',  body:'Elige entre los distintos edificios y bloques desde el mapa 3D o la lista de instalaciones del campus.' },
              { n:'02', title:'Navega en 3D',            body:'Rota, acerca y desplaza el modelo fotogramétrico con libertad total. Three.js y WebGL procesan cada frame.' },
              { n:'03', title:'Activa los hotspots',     body:'Cada sala, laboratorio u oficina tiene una malla nombrada. Haz clic para revelar su ficha completa.' },
              { n:'04', title:'Consulta la información', body:'Horarios, equipamiento, docentes e imágenes del espacio, sin necesidad de estar presencialmente.' },
            ].map(({ n, title, body }) => (
              <div key={n} style={{
                position:'relative', background:'var(--white)', padding:'2.25rem 2rem', overflow:'hidden',
                borderTop:'2px solid transparent', transition:'border-top-color .25s var(--ease)',
              }}
              onMouseEnter={e=>e.currentTarget.style.borderTopColor='var(--red)'}
              onMouseLeave={e=>e.currentTarget.style.borderTopColor='transparent'}>
                <span className="step-num">{n}</span>
                <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.62rem', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--red)', marginBottom:'1.1rem' }}>{n}</div>
                <h3 style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'1.05rem', color:'var(--red)', marginBottom:'.6rem', lineHeight:1.3 }}>{title}</h3>
                <p style={{ fontSize:'.85rem', color:'var(--ink)', lineHeight:1.7, margin:0, fontWeight:300 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ════════════════════════════════════════════════════ */}
      <section style={{ padding:'5rem 5vw', background:'var(--red)', borderRadius:0 }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'2rem' }}>
          <div>
            <p style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.7rem', fontWeight:700, letterSpacing:'.15em', textTransform:'uppercase', color:'rgba(255,255,255,.55)', marginBottom:'.75rem' }}>Comienza ahora</p>
            <h2 style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:'clamp(1.9rem,4vw,3rem)', lineHeight:1.05, letterSpacing:'-.025em', color:'#fff', margin:0 }}>
              Tu campus,<br/>en tres dimensiones.
            </h2>
          </div>
          <PrimaryBtnWhite to="/explorar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Explorar campus
          </PrimaryBtnWhite>
        </div>
      </section>
    </main>
  );
}

/* ─── Botón primario (directional hover-aware) ────────────────────────────── */
function PrimaryBtn({ to, children }) {
  const ref = useRef();
  const { onMouseEnter, onMouseLeave } = useDirHover(ref);
  return (
    <Link to={to} ref={ref} className="dir-btn" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      style={{
        display:'inline-flex', padding:'.85rem 1.9rem',
        background:'var(--red)', color:'#fff', textDecoration:'none',
        fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'.9rem',
        letterSpacing:'.03em', border:'none',
      }}>
      <div className="fill"/>
      <span>{children}</span>
    </Link>
  );
}

function PrimaryBtnWhite({ to, children }) {
  return (
    <Link to={to} style={{
      display:'inline-flex', alignItems:'center', gap:'.5rem',
      padding:'.9rem 2rem', borderRadius:'var(--r-full)',
      background:'var(--white)', color:'var(--red)',
      textDecoration:'none',
      fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'.9rem',
      letterSpacing:'.03em', flexShrink:0,
      transition:'background .22s var(--ease)',
    }}
    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.88)'}
    onMouseLeave={e=>e.currentTarget.style.background='var(--white)'}>
      {children}
    </Link>
  );
}

/* ─── Bento grid ─────────────────────────────────────────────────────────── */
function BentoGrid({ buildings }) {
  if (!buildings.length) return <EmptyBuildings />;
  const [featured, ...rest] = buildings;

  return (
    <div className="bento-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'1rem' }}>
      <div className="featured g-item" style={{ gridColumn:'span 2' }}>
        <BuildingCard building={featured} featured />
      </div>
      {rest.map(b => (
        <div key={b.id} className="g-item">
          <BuildingCard building={b} />
        </div>
      ))}
    </div>
  );
}

/* ─── BuildingCard — con paleta por tipo ─────────────────────────────────── */
function BuildingCard({ building, featured = false }) {
  const TYPE_LABEL = { main:'Principal', secondary:'Secundario', lab:'Laboratorio' };
  const palette = getPalette(building.type);

  return (
    <Link to={`/explorar/${building.id}`} style={{ textDecoration:'none', display:'block', height:'100%' }}>
      <SpotlightCard style={{
        background:'var(--white)',
        padding: featured ? '2.25rem 2.5rem' : '1.75rem',
        height:'100%', boxSizing:'border-box',
        display:'flex',
        flexDirection: featured ? 'row' : 'column',
        alignItems: featured ? 'flex-end' : 'flex-start',
        gap: featured ? '3rem' : 0,
      }}>
        {featured ? (
          /* ── Featured: horizontal ── */
          <>
            <div style={{ flex:1 }}>
              <BuildingHeader building={building} typeLabel={TYPE_LABEL} palette={palette} />
              <p style={{ fontSize:'.9rem', fontWeight:300, color:'var(--ink)', lineHeight:1.7, maxWidth:'55ch', marginTop:'.75rem' }}>
                {building.description}
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'.75rem', flexShrink:0 }}>
              <FloorBadge building={building} />
              <ExploreArrow palette={palette} />
            </div>
          </>
        ) : (
          /* ── Normal: vertical ── */
          <>
            {/* Barra de acento superior (color por tipo) */}
            <div style={{
              position:'absolute', top:0, left:'1.5rem', right:'1.5rem', height:3,
              background: palette.accentBar,
              borderRadius:'0 0 var(--r-sm) var(--r-sm)',
              opacity:.35,
            }}/>
            <BuildingHeader building={building} typeLabel={TYPE_LABEL} palette={palette} />
            <p style={{
              fontSize:'.82rem', fontWeight:300, color:'var(--ink)', lineHeight:1.65,
              flex:1, marginTop:'.5rem', marginBottom:'1.25rem',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
            }}>
              {building.description}
            </p>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              width:'100%', paddingTop:'.85rem', borderTop:'1px solid var(--rule)',
            }}>
              <FloorBadge building={building} />
              <ExploreArrow palette={palette} />
            </div>
          </>
        )}
      </SpotlightCard>
    </Link>
  );
}

/* ── Sub-componentes de BuildingCard ── */

function BuildingHeader({ building, typeLabel, palette }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.9rem' }}>
        {/* Ícono circular con color por tipo */}
        <div style={{
          width:34, height:34, borderRadius:'50%',
          background: palette.iconBg,
          border:     `1px solid ${palette.iconBorder}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color: palette.iconColor, flexShrink:0,
        }}>
          <BuildingIcon />
        </div>
        {/* Badge de tipo */}
        <span style={{
          fontFamily:"'Outfit',sans-serif", fontSize:'.6rem', fontWeight:700,
          letterSpacing:'.12em', textTransform:'uppercase',
          color:       palette.badgeColor,
          padding:'.18rem .6rem',
          border:     `1px solid ${palette.badgeBorder}`,
          background:  palette.badgeBg,
          borderRadius:'var(--r-full)',
        }}>
          {typeLabel[building.type] || building.type}
        </span>
        <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.6rem', fontWeight:600, color:'var(--ink)', letterSpacing:'.1em' }}>
          #{String(building.id).padStart(2,'0')}
        </span>
      </div>
      <h3 style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'1.05rem', color:'var(--red)', lineHeight:1.25, margin:0 }}>
        {building.name}
      </h3>
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
    </svg>
  );
}

function FloorBadge({ building }) {
  return (
    <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.7rem', fontWeight:500, color:'var(--ink)', display:'flex', alignItems:'center', gap:'.3rem' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14"/></svg>
      {building.floor_count} {building.floor_count === 1 ? 'planta' : 'plantas'}
    </span>
  );
}

function ExploreArrow({ palette }) {
  return (
    <span style={{
      fontFamily:"'Outfit',sans-serif", fontSize:'.74rem', fontWeight:700,
      color: palette.iconColor,
      display:'flex', alignItems:'center', gap:'.3rem', letterSpacing:'.05em',
    }}>
      Explorar
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </span>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────────────── */
function BentoSkeleton() {
  return (
    <div className="bento-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'1rem' }}>
      <div className="featured" style={{
        gridColumn:'span 2', height:160, borderRadius:'var(--r-lg)',
        backgroundImage:'linear-gradient(90deg,var(--cream) 25%,var(--white) 50%,var(--cream) 75%)',
        backgroundSize:'200% 100%', animation:'shimmer 1.6s ease infinite',
        border:'1px solid var(--rule)',
      }}/>
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          height:180, borderRadius:'var(--r-lg)',
          backgroundImage:'linear-gradient(90deg,var(--cream) 25%,var(--white) 50%,var(--cream) 75%)',
          backgroundSize:'200% 100%', animation:'shimmer 1.6s ease infinite',
          border:'1px solid var(--rule)',
        }}/>
      ))}
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────── */
function EmptyBuildings() {
  return (
    <div style={{ textAlign:'center', padding:'5rem 2rem', border:'1px dashed var(--rule)', borderRadius:'var(--r-xl)' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--red-18)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom:'1rem' }}>
        <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
      </svg>
      <p style={{ fontFamily:"'Outfit',sans-serif", fontWeight:500, color:'var(--ink)', fontSize:'.9rem', margin:0 }}>No hay edificios registrados aún</p>
    </div>
  );
}