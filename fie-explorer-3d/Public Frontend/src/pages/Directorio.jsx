import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { isOpenNow, scheduleToString, parseSchedule } from '../utils/scheduleUtils';
import BuildingAccordion from '../components/ui/BuildingAccordion.jsx';   

const TYPE_LABEL = {
  classroom: 'Aula',
  lab:       'Laboratorio',
  office:    'Oficina',
  service:   'Servicio',
  access:    'Acceso',
};

// ── Paleta por tipo de espacio ──────────────────────────────────────────────
// Cada tipo tiene: bg del ícono, color del ícono, color del borde del ícono
const TYPE_PALETTE = {
  classroom: {
    iconBg:     'var(--red-06)',
    iconBorder: 'var(--red-10)',
    iconColor:  'var(--red)',
  },
  lab: {
    iconBg:     'rgba(14,116,144,.07)',   // teal técnico
    iconBorder: 'rgba(14,116,144,.15)',
    iconColor:  '#0e7490',
  },
  office: {
    iconBg:     'rgba(120,53,15,.06)',    // ámbar cálido
    iconBorder: 'rgba(120,53,15,.14)',
    iconColor:  '#92400e',
  },
  service: {
    iconBg:     'rgba(79,70,229,.07)',    // índigo institucional
    iconBorder: 'rgba(79,70,229,.15)',
    iconColor:  '#4f46e5',
  },
  access: {
    iconBg:     'rgba(5,150,105,.07)',    // verde acceso
    iconBorder: 'rgba(5,150,105,.15)',
    iconColor:  '#059669',
  },
};

function getPalette(type) {
  return TYPE_PALETTE[type] || TYPE_PALETTE.office;
}

function scheduleDisplay(raw) {
  const p = parseSchedule(raw);
  return p ? scheduleToString(p) : raw;
}

/* ─── SVG icons ──────────────────────────────────────────────────────────── */
const Icons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Building: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
    </svg>
  ),
  Floor:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,
  User:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Clock:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Phone:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Users:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Arrow:  () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  Empty:  () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  TypeIcon: ({ type, size = 15 }) => {
    const d = {
      classroom: <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>,
      lab:       <><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></>,
      office:    <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
      service:   <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></>,
      access:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    };
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{d[type] || d.office}</svg>;
  },
};

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const DIR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

  :root {
    --red:    #BC0613;
    --red-h:  #A3050F;
    --red-10: rgba(188,6,19,.10);
    --red-06: rgba(188,6,19,.06);
    --red-03: rgba(188,6,19,.03);
    --red-18: rgba(188,6,19,.18);
    --cream:  #FDFAF9;
    --ink:    rgba(80,4,10,.52);
    --rule:   rgba(188,6,19,.11);
    --white:  #FFFFFF;
    --ease:   cubic-bezier(.16,1,.3,1);
    --r-sm:   10px;
    --r-md:   16px;
    --r-lg:   22px;
    --r-xl:   32px;
    --r-full: 999px;
  }

  @keyframes card-in {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .d-card { animation:card-in .5s var(--ease) both; }
  .d-card:nth-child(1){animation-delay:.04s}
  .d-card:nth-child(2){animation-delay:.10s}
  .d-card:nth-child(3){animation-delay:.16s}
  .d-card:nth-child(4){animation-delay:.22s}
  .d-card:nth-child(5){animation-delay:.28s}
  .d-card:nth-child(6){animation-delay:.34s}
  .d-card:nth-child(7){animation-delay:.40s}
  .d-card:nth-child(8){animation-delay:.46s}

  @keyframes slide-up {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .h-0{animation:slide-up .55s var(--ease) .04s both;}
  .h-1{animation:slide-up .55s var(--ease) .14s both;}
  .h-2{animation:slide-up .55s var(--ease) .24s both;}
  .h-3{animation:slide-up .55s var(--ease) .36s both;}

  @keyframes shimmer {
    0%,100%{background-position:200% 0}
    50%    {background-position:-200% 0}
  }

  /* ── Spotlight card ── */
  .sp-card {
    position:relative; overflow:hidden;
    border:1px solid var(--rule);
    border-radius:var(--r-lg);
    background:var(--white);
    transition:border-color .25s var(--ease), box-shadow .25s var(--ease), transform .25s var(--ease), opacity .25s var(--ease);
  }
  .sp-card::before {
    content:''; position:absolute; inset:0; border-radius:inherit;
    background:radial-gradient(200px circle at var(--mx,50%) var(--my,50%), var(--red-06), transparent 75%);
    opacity:0; transition:opacity .3s; pointer-events:none; z-index:0;
  }
  .sp-card:hover {
    border-color:rgba(188,6,19,.28);
    box-shadow:0 8px 32px rgba(188,6,19,.10), 0 2px 8px rgba(188,6,19,.06);
    transform:translateY(-3px);
  }
  .sp-card:hover::before { opacity:1; }
  .sp-card:active { transform:translateY(-1px) scale(.997); }
  .sp-card > * { position:relative; z-index:1; }

  /* ── Closed card dims down ── */
  .sp-card.is-closed {
    opacity:.62;
    border-color:rgba(120,120,120,.15);
    background:#fafafa;
  }
  .sp-card.is-closed:hover {
    opacity:.80;
    border-color:rgba(120,120,120,.28);
    box-shadow:0 4px 16px rgba(0,0,0,.06);
  }

  /* ── Filter chips — tipo (cápsulas) ── */
  .f-chip {
    display:inline-flex; align-items:center; gap:.35rem;
    padding:.32rem .85rem;
    font-family:'Outfit',sans-serif; font-size:.72rem; font-weight:600;
    cursor:pointer;
    border:1px solid var(--rule);
    border-radius:var(--r-full);
    background:transparent; color:var(--ink);
    transition:background .18s var(--ease), color .18s, border-color .18s, transform .12s;
    white-space:nowrap;
  }
  .f-chip:hover  { background:var(--red-06); border-color:var(--red-18); color:var(--red); }
  .f-chip.active { background:var(--red); color:#fff; border-color:var(--red); }
  .f-chip:active { transform:scale(.95); }

  /* ── Filter chips — edificio (rectángulos) ── */
  .b-chip {
    display:inline-flex; align-items:center; gap:.35rem;
    padding:.28rem .65rem;
    font-family:'Outfit',sans-serif; font-size:.7rem; font-weight:700;
    cursor:pointer;
    border:1px solid var(--rule);
    border-radius:6px;
    background:transparent; color:var(--ink);
    letter-spacing:.04em; text-transform:uppercase;
    transition:background .18s var(--ease), color .18s, border-color .18s, transform .12s;
    white-space:nowrap;
  }
  .b-chip:hover  { background:var(--red-06); border-color:var(--red-18); color:var(--red); }
  .b-chip.active { background:var(--red); color:#fff; border-color:var(--red); }
  .b-chip:active { transform:scale(.95); }

  /* ── Search ── */
  .d-search {
    width:100%; padding:.85rem 1.1rem .85rem 2.75rem;
    font-family:'Outfit',sans-serif; font-size:.9rem; font-weight:400;
    color:#fff; background:rgba(255,255,255,.13);
    border:1.5px solid rgba(255,255,255,.22);
    border-radius:var(--r-full);
    outline:none; box-sizing:border-box;
    transition:background .2s, border-color .2s;
    caret-color:#fff;
  }
  .d-search::placeholder { color:rgba(255,255,255,.4); }
  .d-search:focus { background:rgba(255,255,255,.2); border-color:rgba(255,255,255,.5); }

  /* ── Sticky filter bar ── */
  .filter-bar {
    position:sticky; top:var(--nav-h,64px); z-index:40;
    background:rgba(253,250,249,.95); backdrop-filter:blur(14px);
    border-bottom:1px solid var(--rule);
  }

  /* ── Building group header ── */
  .building-header {
    display:flex; align-items:center; gap:.75rem; flex-wrap:wrap;
    margin-bottom:2rem; padding:1.25rem 1.5rem;
    background:var(--red-03);
    border:1.5px solid var(--red-10);
    border-radius:var(--r-md);
  }

  /* ── Responsive ── */
  @media (max-width:767px) {
    .hero-inner  { padding:5.5rem 1.25rem 3.5rem !important; }
    .hero-split  { flex-direction:column !important; gap:2rem !important; }
    .hero-stats  { flex-direction:row !important; border-left:none !important; padding-left:0 !important; border-top:1px solid rgba(255,255,255,.15) !important; padding-top:1.5rem !important; flex-wrap:wrap; gap:1.5rem !important; }
    .dir-grid    { grid-template-columns:1fr !important; }
    .filter-wrap { gap:.3rem !important; }
  }
  @media (min-width:768px) and (max-width:1023px) {
    .dir-grid { grid-template-columns:repeat(2,1fr) !important; }
  }
`;

function InjectCSS() {
  useEffect(() => {
    const id = 'fie-dir-v3';
    if (document.getElementById(id)) return;
    const el = Object.assign(document.createElement('style'), { id, textContent: DIR_CSS });
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function Directorio() {
  const [hotspots,       setHotspots]       = useState([]);
  const [buildings,      setBuildings]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [query,          setQuery]          = useState('');
  const [typeFilter,     setTypeFilter]     = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/hotspots').then(r  => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
      api.get('/buildings').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    ])
      .then(([h, b]) => {
        setHotspots(h.filter(x => x.is_active));
        setBuildings(b.filter(x => x.is_active));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return hotspots.filter(h => {
      const matchQ = !q ||
        h.name?.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.teacher?.toLowerCase().includes(q) ||
        h.building_name?.toLowerCase().includes(q);
      const matchT = typeFilter === 'all' || h.type === typeFilter;
      const matchB = buildingFilter === 'all' || h.building_id === buildingFilter;
      return matchQ && matchT && matchB;
    });
  }, [hotspots, query, typeFilter, buildingFilter]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(h => {
      const key = h.building_id;
      if (!map[key]) map[key] = { name: h.building_name, code: h.building_code, items: [] };
      map[key].items.push(h);
    });
    return Object.values(map).sort((a, b) => a.name?.localeCompare(b.name));
  }, [filtered]);

  const presentTypes = [...new Set(hotspots.map(h => h.type))];

  return (
    <main style={{ paddingTop:'var(--nav-h,64px)', minHeight:'100dvh', background:'var(--cream)', fontFamily:"'Outfit',sans-serif", color:'var(--red)' }}>
      <InjectCSS />

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section style={{ background:'var(--red)', position:'relative', overflow:'hidden' }}>
        <div aria-hidden style={{ position:'absolute', top:'-80px', right:'-60px', width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div aria-hidden style={{ position:'absolute', bottom:'-100px', left:'10%', width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>

        <div className="hero-inner" style={{ maxWidth:1280, margin:'0 auto', padding:'5.5rem 5vw 4rem', position:'relative', zIndex:1 }}>
          <div className="hero-split" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'3rem' }}>
            <div style={{ flex:1 }}>
              <div className="h-0" style={{
                display:'inline-flex', alignItems:'center', gap:'.5rem',
                marginBottom:'1.5rem', padding:'.3rem .9rem',
                background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.22)',
                borderRadius:'999px',
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,.85)', display:'block' }}/>
                <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.65rem', fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.8)' }}>
                  Directorio de espacios
                </span>
              </div>

              <h1 className="h-1" style={{
                fontFamily:"'Outfit',sans-serif",
                fontWeight:800, fontSize:'clamp(2rem,4.5vw,3.6rem)',
                lineHeight:1.05, letterSpacing:'-.03em',
                color:'#fff', margin:'0 0 1rem',
              }}>
                Encuentra cualquier<br/>espacio de la FIE.
              </h1>

              <p className="h-2" style={{
                fontSize:'.98rem', fontWeight:300, lineHeight:1.75,
                color:'rgba(255,255,255,.68)', maxWidth:'46ch', margin:'0 0 2rem',
              }}>
                Aulas, laboratorios, oficinas, servicios y accesos de todos
                los edificios, con horarios y docentes en tiempo real.
              </p>

              <div className="h-3" style={{ position:'relative', maxWidth:460 }}>
                <span style={{ position:'absolute', left:'1.1rem', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.45)', display:'flex', pointerEvents:'none' }}>
                  <Icons.Search/>
                </span>
                <input
                  className="d-search"
                  type="search"
                  placeholder="Buscar espacio, docente, edificio…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="hero-stats" style={{
              display:'flex', flexDirection:'column', gap:'0',
              flexShrink:0, borderLeft:'1px solid rgba(255,255,255,.14)', paddingLeft:'3rem',
            }}>
              {[
                { n: hotspots.length || '—', label:'Espacios totales' },
                { n: buildings.length || '—', label:'Edificios' },
                { n: presentTypes.length || '—', label:'Tipos de espacio' },
              ].map(({ n, label }, i) => (
                <div key={label} style={{
                  paddingBottom: i < 2 ? '1.5rem' : 0,
                  marginBottom:  i < 2 ? '1.5rem' : 0,
                  borderBottom:  i < 2 ? '1px solid rgba(255,255,255,.1)' : 'none',
                }}>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:'2rem', color:'#fff', lineHeight:1 }}>{n}</div>
                  <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.62rem', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.42)', marginTop:'.25rem' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FILTROS STICKY ════════════════════════════════════════════════ */}
      <div className="filter-bar">
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'.7rem 5vw' }}>
          <div className="filter-wrap" style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:'.4rem' }}>

            {/* Fila tipo — cápsulas */}
            <span style={{ fontSize:'.6rem', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--ink)', flexShrink:0 }}>Tipo</span>
            <button className={`f-chip${typeFilter==='all'?' active':''}`} onClick={()=>setTypeFilter('all')}>Todos</button>
            {presentTypes.map(t => (
              <button key={t} className={`f-chip${typeFilter===t?' active':''}`} onClick={()=>setTypeFilter(t)}>
                <Icons.TypeIcon type={t}/>{TYPE_LABEL[t]}
              </button>
            ))}

            {/* Separador */}
            <span style={{ width:1, height:16, background:'var(--rule)', flexShrink:0, margin:'0 .15rem' }}/>

            {/* Fila edificio — rectángulos */}
            <span style={{ fontSize:'.6rem', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--ink)', flexShrink:0 }}>Edificio</span>
            <button className={`b-chip${buildingFilter==='all'?' active':''}`} onClick={()=>setBuildingFilter('all')}>Todos</button>
            {buildings.map(b => (
              <button key={b.id} className={`b-chip${buildingFilter===b.id?' active':''}`} onClick={()=>setBuildingFilter(b.id)}>
                {b.code}
              </button>
            ))}

            <span style={{ marginLeft:'auto', fontFamily:"'Outfit',sans-serif", fontSize:'.72rem', fontWeight:600, color:'var(--ink)', flexShrink:0 }}>
              {filtered.length} resultado{filtered.length!==1?'s':''}
            </span>
          </div>
        </div>
      </div>

      {/* ══ CONTENIDO ═════════════════════════════════════════════════════ */}
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'3.5rem 5vw 5rem' }}>

        {loading && <DirectorioSkeleton/>}

        {!loading && filtered.length === 0 && (
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            padding:'6rem 2rem', textAlign:'center',
            border:'1.5px dashed var(--rule)', borderRadius:'var(--r-xl)',
          }}>
            <span style={{ color:'var(--red-18)', marginBottom:'1.25rem' }}><Icons.Empty/></span>
            <p style={{ fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:'1.05rem', color:'var(--red)', marginBottom:'.4rem' }}>Sin resultados</p>
            <p style={{ fontFamily:"'Outfit',sans-serif", fontWeight:300, fontSize:'.88rem', color:'var(--ink)', margin:0 }}>
              Prueba con otro término o cambia los filtros.
            </p>
          </div>
        )}

        {!loading && grouped.map((group, i) => (
          <BuildingAccordion
            key={group.code}
            group={group}
            defaultOpen={i === 0}       
          >
            {/* Grid de tarjetas — igual que antes, ahora dentro del acordeón */}
            <div
              className="dir-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
                gap: '1rem',
              }}
            >
              {group.items.map(h => <SpaceCard key={h.id} hotspot={h} />)}
            </div>
          </BuildingAccordion>
        ))}
      </div>
    </main>
  );
}

/* ─── SpaceCard ──────────────────────────────────────────────────────────── */
function SpaceCard({ hotspot: h }) {
  const openStatus  = isOpenNow(h.schedule);
  const scheduleStr = h.schedule ? scheduleDisplay(h.schedule) : null;
  const palette     = getPalette(h.type);
  const isClosed    = openStatus === false; // null = sin horario, false = cerrado

  const handleMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <Link
      to={`/explorar/${h.building_id}`}
      className={`d-card sp-card${isClosed ? ' is-closed' : ''}`}
      style={{ textDecoration:'none', display:'flex', flexDirection:'column', padding:'1.4rem' }}
      onMouseMove={handleMove}
    >
      {/* Cabecera: icono + tipo + badge open */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'.6rem', marginBottom:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
          {/* Ícono con color según tipo */}
          <div style={{
            width:36, height:36, borderRadius:'50%',
            background: palette.iconBg,
            border:     `1px solid ${palette.iconBorder}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:  palette.iconColor,
            flexShrink:0,
          }}>
            <Icons.TypeIcon type={h.type}/>
          </div>
          <div>
            <span style={{
              fontFamily:"'Outfit',sans-serif", fontSize:'.58rem', fontWeight:700,
              letterSpacing:'.1em', textTransform:'uppercase',
              color: palette.iconColor,
              display:'block', marginBottom:'.1rem',
            }}>
              {TYPE_LABEL[h.type]}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:'.3rem' }}>
              <span style={{ color:'var(--red-18)', display:'flex' }}><Icons.Floor/></span>
              <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.65rem', color:'var(--ink)' }}>Piso {h.floor}</span>
            </div>
          </div>
        </div>

        {/* Badge abierto/cerrado */}
        {openStatus !== null && (
          <span style={{
            flexShrink:0, borderRadius:'999px',
            fontFamily:"'Outfit',sans-serif",
            fontSize:'.58rem', fontWeight:700,
            padding:'.22rem .65rem',
            background: openStatus ? 'var(--red-06)'         : 'rgba(80,4,10,.05)',
            color:       openStatus ? 'var(--red)'            : 'var(--ink)',
            border:     `1px solid ${openStatus ? 'var(--red-18)' : 'rgba(80,4,10,.1)'}`,
            display:'flex', alignItems:'center', gap:'.3rem',
          }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background: openStatus ? 'var(--red)' : 'rgba(80,4,10,.3)', display:'block' }}/>
            {openStatus ? 'Abierto' : 'Cerrado'}
          </span>
        )}
      </div>

      {/* Nombre */}
      <h3 style={{
        fontFamily:"'Outfit',sans-serif", fontWeight:700,
        fontSize:'.95rem', lineHeight:1.3,
        color:'var(--red)', margin:'0 0 .4rem',
      }}>{h.name}</h3>

      {/* Descripción */}
      {h.description && (
        <p style={{
          fontFamily:"'Outfit',sans-serif", fontSize:'.78rem', fontWeight:300,
          color:'var(--ink)', lineHeight:1.65,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
          flex:1, margin:'0 0 .85rem',
        }}>{h.description}</p>
      )}

      {/* Meta */}
      <div style={{ display:'flex', flexDirection:'column', gap:'.28rem', marginTop:'auto' }}>
        {h.capacity  && <MetaRow icon={<Icons.Users/>} text={`${h.capacity} personas`}/>}
        {h.teacher   && <MetaRow icon={<Icons.User/>}  text={h.teacher}/>}
        {scheduleStr && <MetaRow icon={<Icons.Clock/>} text={scheduleStr}/>}
        {h.phone     && <MetaRow icon={<Icons.Phone/>} text={h.phone}/>}
      </div>

      {/* Footer CTA */}
      <div style={{
        display:'flex', justifyContent:'flex-end',
        marginTop:'1rem', paddingTop:'.85rem',
        borderTop:'1px solid var(--rule)',
      }}>
        <span style={{
          fontFamily:"'Outfit',sans-serif", fontSize:'.72rem', fontWeight:700,
          color:'var(--red)', display:'flex', alignItems:'center', gap:'.3rem',
        }}>
          Ver en mapa <Icons.Arrow/>
        </span>
      </div>
    </Link>
  );
}

function MetaRow({ icon, text }) {
  return (
    <span style={{ display:'flex', alignItems:'center', gap:'.4rem' }}>
      <span style={{ color:'var(--red-18)', flexShrink:0, display:'flex' }}>{icon}</span>
      <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:'.72rem', fontWeight:400, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{text}</span>
    </span>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function DirectorioSkeleton() {
  return (
    <div>
      {[1,2].map(g => (
        <div key={g} style={{ marginBottom:'4rem' }}>
          <div style={{ height:76, borderRadius:'var(--r-md)', marginBottom:'2rem', backgroundImage:'linear-gradient(90deg,var(--cream) 25%,#fff 50%,var(--cream) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s ease infinite', border:'1px solid var(--rule)' }}/>
          <div className="dir-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'1rem' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height:200, borderRadius:'var(--r-lg)', backgroundImage:'linear-gradient(90deg,var(--cream) 25%,#fff 50%,var(--cream) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s ease infinite', border:'1px solid var(--rule)' }}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}