/**
 * AcercaDe.jsx — Explorador 3D FIE
 */

import { Link } from 'react-router-dom';

/* ─── Spotlight helper ──────────────────────────────────────────────────── */
function SpotCard({ children, style, className = '' }) {
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div className={`ab-sp ${className}`} onMouseMove={onMove} style={style}>
      {children}
    </div>
  );
}

/* ─── SVG Icons ─────────────────────────────────────── */
const Icons = {
  React: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
    </svg>
  ),
  Cube: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Server: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  DB: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Zap: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Play: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
};

const TECH = [
  {
    Icon: Icons.Cube,
    label: 'Motor 3D — Three.js + GLTF Pipeline',
    desc: 'Implementación nativa con Three.js. Modelos GLB con compresión Draco, logrando pesos optimizados (<50 MB) que mantienen la integridad geométrica para navegación en tiempo real.',
  },
  {
    Icon: Icons.React,
    label: 'Frontend — React + Vite',
    desc: 'Arquitectura SPA con lazy loading para garantizar que el visor 3D sea el centro de la experiencia sin sacrificar la velocidad de carga.',
  },
  {
    Icon: Icons.Server,
    label: 'Backend — Node.js + Express',
    desc: 'API REST robusta con estrategias de caché en Redis para la entrega inmediata de datos de docentes y servicios del campus.',
  },
  {
    Icon: Icons.DB,
    label: 'Inteligencia Espacial — PostgreSQL + PostGIS',
    desc: 'Gestión de puntos de interés e infraestructura mediante un modelo de datos espacial escalable y seguro.',
  },
  {
    Icon: Icons.Shield,
    label: 'Seguridad multicapa',
    desc: 'Estándares modernos CSP, HSTS y sanitización avanzada para proteger la integridad de los datos de la facultad.',
  },
  {
    Icon: Icons.Zap,
    label: 'Renderizado PBR',
    desc: 'Iluminación y materiales de renderizado físico (PBR) para una representación visual de alta fidelidad y acabado profesional.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Modelado Técnico',
    body: 'Captura de activos mediante fotogrametría y modelado arquitectónico preciso de los edificios y espacios de la facultad.',
  },
  {
    n: '02',
    title: 'Optimización Poligonal',
    body: 'Estrategia de reducción de malla a <300k triángulos por bloque, garantizando una tasa superior a 60 FPS en múltiples dispositivos.',
  },
  {
    n: '03',
    title: 'Renderizado WebGL',
    body: 'Integración directa de los modelos en el visor, aplicando estándares de renderizado físico (PBR) para un acabado profesional.',
  },
  {
    n: '04',
    title: 'Vinculación Dinámica',
    body: 'Conexión directa de cada malla 3D con la base de datos espacial — la información de cada aula es dinámica y fácil de gestionar.',
  },
];

const TICKS = [
  'Motor 3D WebGL', 'Campus ESPOCH', 'Draco Compression', 'Renderizado PBR',
  'Three.js · GLTF', 'Explorador 3D FIE',
  'Motor 3D WebGL', 'Campus ESPOCH', 'Draco Compression', 'Renderizado PBR',
  'Three.js · GLTF', 'Explorador 3D FIE',
];

export default function AcercaDe() {
  return (
    <main
      style={{
        paddingTop: 'var(--nav-h, 64px)',
        fontFamily: 'var(--font-body)',
        background: 'var(--cream, #FDFAF9)',
        color: 'var(--red, #BC0613)',
        minHeight: '100dvh',
      }}
    >
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--red, #BC0613)' }}>
        <div aria-hidden style={{ position: 'absolute', top: '-90px', right: '-70px', width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: '-110px', left: '8%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

        <div className="ab-hero-inner" style={{ maxWidth: 1280, margin: '0 auto', padding: '7rem 5vw 5rem', position: 'relative', zIndex: 1 }}>
          <div className="ab-split" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3rem' }}>

            <div style={{ flex: 1, maxWidth: 600 }}>
              <div className="h-0" style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.5rem', padding: '.3rem .9rem', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.22)', borderRadius: '999px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.85)', display: 'block' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '.65rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>
                  Acerca de
                </span>
              </div>

              <h1
                className="ab-s1"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'clamp(2.4rem, 5vw, 4rem)',
                  lineHeight: 1.04,
                  letterSpacing: '-.03em',
                  color: '#fff',
                  margin: '0 0 .2em',
                }}
              >
                Explorador 3D FIE<br />
                <span style={{ color: 'rgba(255,255,255,.65)', fontWeight: 300, fontSize: '.68em' }}>
                  El campus, en tu pantalla
                </span>
              </h1>

              <p className="ab-s2" style={{ fontSize: '.98rem', fontWeight: 300, lineHeight: 1.75, color: 'rgba(255,255,255,.68)', maxWidth: '54ch', margin: '1.25rem 0 2.5rem' }}>
                Visor interactivo de alta fidelidad de la Facultad de Informática y Electrónica
                de la ESPOCH. Navega edificios, laboratorios y espacios académicos con rendimiento
                nativo directamente en tu navegador.
              </p>

              <div className="ab-s3" style={{ display: 'flex', gap: '.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  to="/explorar"
                  className="ab-cta-btn"
                  style={{
                    display: 'inline-flex',
                    padding: '.85rem 1.9rem',
                    background: 'rgba(255,255,255,.15)',
                    border: '1.5px solid rgba(255,255,255,.28)',
                    color: '#fff',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: '.88rem',
                    letterSpacing: '.03em',
                  }}
                >
                  <div className="ab-fill" />
                  <span><Icons.Play /> Explorar campus</span>
                </Link>

                <a
                  href="#stack"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.4rem',
                    padding: '.8rem 1.5rem',
                    borderRadius: '999px',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '.85rem',
                    color: 'rgba(255,255,255,.7)',
                    textDecoration: 'none',
                    border: '1.5px solid rgba(255,255,255,.18)',
                    transition: 'color .2s, border-color .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)'; }}
                >
                  Ver el stack tecnológico
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="ab-split-stats ab-s4" style={{ display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,.15)', paddingLeft: '3rem' }}>
              {[
                { n: '3D',    l: 'Renderizado de alta fidelidad' },
                { n: 'WebGL', l: 'Sin instalación ni plugins' },
                { n: 'PBR',   l: 'Materiales físicamente correctos' },
              ].map(({ n, l }, i) => (
                <div
                  key={l}
                  style={{
                    paddingBottom: i < 2 ? '1.5rem' : 0,
                    marginBottom:  i < 2 ? '1.5rem' : 0,
                    borderBottom:  i < 2 ? '1px solid rgba(255,255,255,.1)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '2rem', color: '#fff', lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: '.62rem', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.42)', marginTop: '.25rem' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Ticker ─────────────────────────────────────────────────── */}
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', userSelect: 'none', borderTop: '2px solid var(--red)', borderBottom: '1px solid var(--rule, rgba(188,6,19,.14))', background: '#fff', padding: '.8rem 0' }}>
        <div className="ab-ticker">
          {TICKS.map((t, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.9rem',
                padding: '0 2rem',
                fontSize: '.7rem',
                fontWeight: 700,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--ink, rgba(80,4,10,.52))',
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── ¿Qué es? ───────────────────────────────────────────────── */}
      <div className="ab-sec" style={{ padding: '5.5rem 5vw', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 'clamp(2rem, 5vw, 4rem)', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '.5rem' }}>¿Qué es?</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-.025em', lineHeight: 1.1, color: 'var(--red)', margin: '0 0 1.5rem' }}>
              Una plataforma de alto rendimiento para explorar la&nbsp;FIE
            </h2>

            <p style={{ fontSize: '.95rem', fontWeight: 300, color: 'var(--ink)', lineHeight: 1.8, marginBottom: '1rem' }}>
              Explorador 3D FIE es una aplicación web de alto rendimiento que democratiza
              el acceso a la infraestructura de la facultad. A través de un motor de
              renderizado 3D basado en WebGL, estudiantes y visitantes exploran el campus
              con una experiencia inmersiva y contextual.
            </p>

            <p style={{ fontSize: '.95rem', fontWeight: 300, color: 'var(--ink)', lineHeight: 1.8, margin: 0 }}>
              Cada espacio es una entidad interactiva que centraliza información académica,
              horarios y contactos en tiempo real — sin necesidad de estar presencialmente
              en el campus.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            {[
              { tag: 'Fluido',     desc: 'Acceso universal sin instalaciones ni plugins. Corre directamente en el navegador.' },
              { tag: 'Optimizado', desc: 'Modelos 3D de alta precisión comprimidos con estándar Draco para una carga instantánea.' },
              { tag: 'Fidelidad',  desc: 'Iluminación y materiales PBR para una representación realista del campus.' },
            ].map(({ tag, desc }) => (
              <SpotCard key={tag} style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: 72, height: 40, borderRadius: '999px',
                  background: 'var(--red-06, rgba(188,6,19,.06))',
                  border: '1px solid var(--red-10, rgba(188,6,19,.10))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--red)', flexShrink: 0,
                  fontWeight: 800, fontSize: '.68rem', letterSpacing: '-.01em',
                }}>
                  {tag}
                </div>
                <span style={{ fontSize: '.88rem', fontWeight: 400, color: 'var(--ink)', lineHeight: 1.55 }}>{desc}</span>
              </SpotCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stack tecnológico ──────────────────────────────────────── */}
      <section id="stack" style={{ borderTop: '1px solid var(--rule)', background: '#fff', padding: '5.5rem 5vw' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.75rem', paddingBottom: '1.25rem', borderBottom: '1.5px solid var(--red)' }}>
            <div>
              <p style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '.45rem' }}>Tecnología</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.5rem,3vw,2.2rem)', letterSpacing: '-.025em', color: 'var(--red)', margin: 0 }}>
                El stack de alto rendimiento
              </h2>
            </div>
          </div>

          <div className="ab-tech-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {TECH.map(({ Icon, label, desc }) => (
              <SpotCard key={label} className="ab-card" style={{ padding: '1.6rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--red-06)', border: '1px solid var(--red-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', marginBottom: '1rem', flexShrink: 0 }}>
                  <Icon />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.95rem', color: 'var(--red)', marginBottom: '.5rem', lineHeight: 1.3 }}>
                  {label}
                </h3>
                <p style={{ fontSize: '.8rem', fontWeight: 300, color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>
                  {desc}
                </p>
              </SpotCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Proceso ────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--rule)', background: 'var(--cream)', padding: '5.5rem 5vw' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: '3rem' }}>
            <p style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '.45rem' }}>Proceso</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.5rem,3vw,2.2rem)', letterSpacing: '-.025em', color: 'var(--red)', margin: 0 }}>
              Ingeniería de campus
            </h2>
          </div>

          <div className="ab-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--rule)', borderRadius: '22px', overflow: 'hidden' }}>
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="ab-step" style={{ position: 'relative', background: '#fff', padding: '2.25rem 2rem', overflow: 'hidden' }}>
                <span
                  className="ab-step-n"
                  style={{
                    position: 'absolute', top: '-.5rem', right: '1.5rem',
                    fontSize: '7rem', fontWeight: 800, lineHeight: 1,
                    color: 'rgba(188,6,19,.05)', fontFamily: 'var(--font-display)',
                    letterSpacing: '-.04em', pointerEvents: 'none', userSelect: 'none',
                  }}
                >
                  {n}
                </span>

                <div style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '.9rem' }}>
                  {n}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--red)', marginBottom: '.55rem', lineHeight: 1.3 }}>
                  {title}
                </h3>
                <p style={{ fontSize: '.85rem', color: 'var(--ink)', lineHeight: 1.75, margin: 0, fontWeight: 300 }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}