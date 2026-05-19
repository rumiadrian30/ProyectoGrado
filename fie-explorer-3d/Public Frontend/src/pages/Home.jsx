import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildingsService } from '../services/buildingsService';

/* ─── Responsive styles inyectados globalmente ─────────────────────────────── */
const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.4); }
  }

  .home-hero-title   { font-size: clamp(2.2rem, 8vw, 4.5rem); }
  .home-hero-sub     { font-size: clamp(0.95rem, 3vw, 1.15rem); }
  .home-cta-wrap     { flex-direction: row; }
  .home-stats-wrap   { gap: 3rem; }
  .home-steps-grid   { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .home-buildings-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .home-skeletons      { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }

  /* ── Mobile overrides ── */
  @media (max-width: 600px) {
    .home-hero-section  { padding: 5rem 1.2rem 3rem !important; }
    .home-cta-wrap      { flex-direction: column; align-items: stretch !important; }
    .home-cta-wrap a    { text-align: center; justify-content: center; }
    .home-stats-wrap    { gap: 1.5rem; }
    .home-stat-item     { min-width: 70px; }
    .home-steps-grid    { grid-template-columns: 1fr !important; gap: 1rem !important; }
    .home-buildings-grid{ grid-template-columns: 1fr !important; }
    .home-skeletons     { grid-template-columns: 1fr !important; }
    .home-section-pad   { padding: 3.5rem 1.2rem !important; }
    .building-card-inner{ padding: 1.25rem !important; }
    .home-footer        { padding: 1.5rem 1.2rem !important; }
  }

  @media (max-width: 400px) {
    .home-hero-title    { font-size: 2rem !important; }
    .home-badge-text    { font-size: 0.7rem !important; }
  }

  @media (min-width: 601px) and (max-width: 900px) {
    .home-buildings-grid{ grid-template-columns: repeat(2, 1fr) !important; }
    .home-skeletons     { grid-template-columns: repeat(2, 1fr) !important; }
    .home-steps-grid    { grid-template-columns: repeat(2, 1fr) !important; }
    .home-hero-section  { padding: 5.5rem 2rem 3.5rem !important; }
    .home-section-pad   { padding: 4rem 2rem !important; }
  }

  /* Card hover — solo desktop */
  @media (hover: hover) {
    .building-card-inner:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,48,135,0.13);
      border-color: var(--color-primary-100, #bfcfee) !important;
    }
  }
  .building-card-inner {
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  }
`;

function InjectStyles() {
  useEffect(() => {
    if (document.getElementById('home-responsive-styles')) return;
    const el = document.createElement('style');
    el.id = 'home-responsive-styles';
    el.textContent = STYLES;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

/* ─── Componente principal ──────────────────────────────────────────────────── */
export default function Home() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    buildingsService.getAll()
      .then(res => {
        if (Array.isArray(res))        setBuildings(res);
        else if (Array.isArray(res?.data)) setBuildings(res.data);
        else                           setBuildings([]);
      })
      .catch(() => setBuildings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ paddingTop: 'var(--nav-h, 64px)' }}>
      <InjectStyles />

      {/* ══ HERO ══ */}
      <section className="home-hero-section" style={{
        minHeight: '100svh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '6rem 1.5rem 4rem',
        position: 'relative', overflow: 'hidden',
        background: '#fff',
      }}>
        {/* Fondos decorativos */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,48,135,0.06) 0%, transparent 70%),
            radial-gradient(circle at 85% 80%, rgba(232,200,74,0.08) 0%, transparent 50%)
          `,
        }}/>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0, opacity: 0.025,
          backgroundImage: `
            linear-gradient(var(--color-primary, #003087) 1px, transparent 1px),
            linear-gradient(90deg, var(--color-primary, #003087) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}/>

        <div style={{
          position: 'relative', zIndex: 1,
          textAlign: 'center', maxWidth: 780,
          width: '100%',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 0.9rem',
            background: 'var(--color-primary-50, #eef2fb)',
            border: '1px solid var(--color-primary-100, #bfcfee)',
            borderRadius: '999px',
            marginBottom: '1.75rem',
            animation: 'fadeUp .6s ease both',
            maxWidth: '100%',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: 'var(--color-primary, #003087)',
              animation: 'pulse-dot 2s ease infinite',
            }}/>
            <span className="home-badge-text" style={{
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize: '0.78rem', fontWeight: 600,
              color: 'var(--color-primary, #003087)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>ESPOCH · Facultad de Informática y Electrónica</span>
          </div>

          {/* Título */}
          <h1 className="home-hero-title" style={{
            fontFamily: 'var(--font-display, serif)',
            fontWeight: 800,
            lineHeight: 1.05,
            color: 'var(--color-text, #0f172a)',
            marginBottom: '1.25rem',
            animation: 'fadeUp .7s ease .1s both',
          }}>
            Explora la{' '}
            <span style={{
              color: 'var(--color-primary, #003087)',
              position: 'relative',
              display: 'inline-block',
            }}>
              FIE
              <span aria-hidden style={{
                position: 'absolute', bottom: '3px', left: 0, right: 0,
                height: 4, background: 'rgba(0,48,135,0.12)',
                borderRadius: 2,
              }}/>
            </span>
            {' '}en{' '}
            <br />
            tres dimensiones
          </h1>

          {/* Subtítulo */}
          <p className="home-hero-sub" style={{
            lineHeight: 1.7,
            color: 'var(--color-text-3, #64748b)',
            maxWidth: 520, margin: '0 auto 2.25rem',
            animation: 'fadeUp .7s ease .2s both',
          }}>
            Recorre los edificios, laboratorios y espacios de la facultad
            de manera interactiva. Encuentra información detallada de cada
            área sin necesidad de estar presencialmente.
          </p>

          {/* CTAs */}
          <div className="home-cta-wrap" style={{
            display: 'flex', gap: '0.85rem',
            justifyContent: 'center',
            animation: 'fadeUp .7s ease .3s both',
          }}>
            <Link to="/explorar" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 1.75rem',
              background: 'var(--color-primary, #003087)',
              color: '#fff',
              borderRadius: '999px',
              fontWeight: 600, fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,48,135,0.25)',
              whiteSpace: 'nowrap',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Iniciar exploración
            </Link>
            <a href="#edificios" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 1.75rem',
              background: 'transparent',
              color: 'var(--color-primary, #003087)',
              border: '1.5px solid var(--color-primary-100, #bfcfee)',
              borderRadius: '999px',
              fontWeight: 600, fontSize: '0.95rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              Ver edificios
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="home-stats-wrap" style={{
          position: 'relative', zIndex: 1,
          marginTop: '4rem',
          display: 'flex',
          flexWrap: 'wrap', justifyContent: 'center',
          animation: 'fadeUp .7s ease .5s both',
        }}>
          {[
            { n: '5',    label: 'Edificios' },
            { n: '20+',  label: 'Laboratorios' },
            { n: '3D',   label: 'Visualización' },
            { n: '360°', label: 'Exploración' },
          ].map(({ n, label }) => (
            <div key={label} className="home-stat-item" style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display, serif)',
                fontWeight: 800, fontSize: 'clamp(1.6rem, 5vw, 2rem)',
                color: 'var(--color-primary, #003087)',
              }}>{n}</div>
              <div style={{
                fontSize: '0.75rem', fontWeight: 500,
                color: 'var(--color-text-3, #64748b)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginTop: '0.2rem',
              }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ EDIFICIOS ══ */}
      <section id="edificios" className="home-section-pad" style={{
        padding: '5rem 1.5rem',
        background: 'var(--color-bg-soft, #f8fafc)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Encabezado */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              background: 'var(--color-primary-50, #eef2fb)',
              color: 'var(--color-primary, #003087)',
              borderRadius: '999px',
              fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: '0.75rem',
            }}>Instalaciones</span>
            <h2 style={{
              fontFamily: 'var(--font-display, serif)',
              fontSize: 'clamp(1.6rem, 4vw, 2.5rem)',
              color: 'var(--color-text, #0f172a)',
              margin: '0 0 0.75rem',
            }}>Edificios de la FIE</h2>
            <p style={{
              color: 'var(--color-text-3, #64748b)',
              maxWidth: 480, margin: '0 auto',
              fontSize: '0.95rem', lineHeight: 1.6,
            }}>
              Selecciona un edificio para comenzar a explorarlo en 3D
            </p>
          </div>

          {loading
            ? <BuildingsSkeletons />
            : (
              <div className="home-buildings-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
              }}>
                {buildings.map(b => <BuildingCard key={b.id} building={b} />)}
              </div>
            )
          }
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ══ */}
      <section className="home-section-pad" style={{
        padding: '5rem 1.5rem',
        background: '#fff',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontFamily: 'var(--font-display, serif)',
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            marginBottom: '2.5rem',
            color: 'var(--color-text, #0f172a)',
          }}>¿Cómo funciona?</h2>

          <div className="home-steps-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
          }}>
            {[
              { icon: '🏛️', title: 'Selecciona un edificio',
                desc: 'Elige entre los distintos edificios y bloques de la FIE desde el mapa o la lista.' },
              { icon: '🔍', title: 'Explora en 3D',
                desc: 'Navega alrededor del modelo fotogramétrico con zoom, rotación y paneo completos.' },
              { icon: '📍', title: 'Toca los hotspots',
                desc: 'Descubre puntos de interés marcados: laboratorios, oficinas, servicios y accesos.' },
              { icon: '📋', title: 'Obtén información',
                desc: 'Consulta detalles de cada espacio: descripción, horarios, equipamiento e imágenes.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                padding: '1.5rem',
                background: 'var(--color-bg-soft, #f8fafc)',
                borderRadius: 'var(--radius-lg, 12px)',
                border: '1px solid var(--color-border-soft, #e2e8f0)',
              }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.85rem' }}>{icon}</div>
                <h3 style={{
                  fontFamily: 'var(--font-display, serif)',
                  fontSize: '1rem', marginBottom: '0.45rem',
                  color: 'var(--color-text, #0f172a)',
                }}>{title}</h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-3, #64748b)',
                  lineHeight: 1.6, margin: 0,
                }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="home-footer" style={{
        padding: '2rem 1.5rem',
        background: 'var(--color-primary, #003087)',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        fontSize: '0.82rem',
      }}>
        <p style={{
          fontFamily: 'var(--font-display, serif)',
          color: '#fff', marginBottom: '0.25rem', fontWeight: 600,
          fontSize: '0.95rem',
        }}>
          FIE Explorer 3D · ESPOCH
        </p>
        <p style={{ margin: 0 }}>
          Grefa Rivadeneyra Rumi Adrian · Código 7333 · {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}

/* ─── BuildingCard ──────────────────────────────────────────────────────────── */
function BuildingCard({ building }) {
  const typeLabel = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' };
  const typeColor = { main: '#BC0613', secondary: '#374151', lab: '#d41a2b' };
  const color = typeColor[building.type] || '#374151';

  return (
    <Link to={`/explorar/${building.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div className="building-card-inner" style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border, #e2e8f0)',
        padding: '1.5rem',
        height: '100%',
        boxSizing: 'border-box',
        cursor: 'pointer',
      }}>
        {/* Ícono */}
        <div style={{
          width: 46, height: 46,
          background: 'var(--color-primary-50, #eef2fb)',
          borderRadius: 'var(--radius-md, 8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '0.9rem', flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-primary, #003087)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
          </svg>
        </div>

        {/* Badge tipo */}
        <span style={{
          display: 'inline-block',
          padding: '0.18rem 0.55rem',
          background: `${color}15`,
          color,
          borderRadius: '999px',
          fontSize: '0.68rem', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: '0.55rem',
        }}>
          {typeLabel[building.type] || building.type}
        </span>

        <h3 style={{
          fontFamily: 'var(--font-display, serif)',
          fontSize: '1rem', fontWeight: 700,
          color: 'var(--color-text, #0f172a)',
          marginBottom: '0.4rem',
          lineHeight: 1.3,
        }}>{building.name}</h3>

        <p style={{
          fontSize: '0.82rem',
          color: 'var(--color-text-3, #64748b)',
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: '1rem',
        }}>{building.description}</p>

        {/* Footer card */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--color-border-soft, #f1f5f9)',
          marginTop: 'auto',
        }}>
          <span style={{
            fontSize: '0.78rem', color: 'var(--color-text-3, #64748b)',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14"/>
            </svg>
            {building.floor_count} {building.floor_count === 1 ? 'planta' : 'plantas'}
          </span>
          <span style={{
            fontSize: '0.78rem', fontWeight: 600,
            color: 'var(--color-primary, #003087)',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            Explorar
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Skeleton loader ───────────────────────────────────────────────────────── */
function BuildingsSkeletons() {
  return (
    <div className="home-skeletons" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '1.25rem',
    }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          height: 190,
          borderRadius: 'var(--radius-lg, 12px)',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}/>
      ))}
    </div>
  );
}