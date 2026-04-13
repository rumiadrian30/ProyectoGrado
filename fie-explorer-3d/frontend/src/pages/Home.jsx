import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildingsService } from '../services/buildingsService';

export default function Home() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    buildingsService.getAll()
      .then(setBuildings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ paddingTop: 'var(--nav-h)' }}>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '6rem 1.5rem 4rem',
        position: 'relative',
        overflow: 'hidden',
        background: '#fff',
      }}>

        {/* Fondo decorativo sutil */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,48,135,0.06) 0%, transparent 70%),
            radial-gradient(circle at 85% 80%, rgba(232,200,74,0.08) 0%, transparent 50%)
          `,
        }}/>

        {/* Grid decorativo */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, zIndex: 0, opacity: 0.025,
          backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}/>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 780 }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 1rem',
            background: 'var(--color-primary-50)',
            border: '1px solid var(--color-primary-100)',
            borderRadius: 'var(--radius-full)',
            marginBottom: '2rem',
            animation: 'fadeIn .6s ease',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-primary)',
            }}/>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem', fontWeight: 600,
              color: 'var(--color-primary)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>ESPOCH · Facultad de Informática y Electrónica</span>
          </div>

          {/* Título */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            color: 'var(--color-text)',
            marginBottom: '1.5rem',
            animation: 'fadeIn .7s ease .1s both',
          }}>
            Explora la{' '}
            <span style={{
              color: 'var(--color-primary)',
              position: 'relative',
            }}>
              FIE
              <span style={{
                position: 'absolute', bottom: '2px', left: 0, right: 0,
                height: 4, background: 'var(--color-gold)',
                borderRadius: 2, opacity: 0.7,
              }}/>
            </span>
            {' '}en<br />
            tres dimensiones
          </h1>

          <p style={{
            fontSize: '1.15rem', lineHeight: 1.7,
            color: 'var(--color-text-3)',
            maxWidth: 560, margin: '0 auto 2.5rem',
            animation: 'fadeIn .7s ease .2s both',
          }}>
            Recorre los edificios, laboratorios y espacios de la facultad de
            manera interactiva. Encuentra información detallada de cada área
            sin necesidad de estar presencialmente.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex', gap: '1rem', justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'fadeIn .7s ease .3s both',
          }}>
            <Link to="/explorar" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 2rem',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600, fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,48,135,0.25)',
              transition: 'all var(--transition)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Iniciar exploración
            </Link>
            <a href="#edificios" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 2rem',
              background: 'transparent',
              color: 'var(--color-primary)',
              border: '1.5px solid var(--color-primary-100)',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600, fontSize: '1rem',
              textDecoration: 'none',
              transition: 'all var(--transition)',
            }}>
              Ver edificios
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          position: 'relative', zIndex: 1,
          marginTop: '5rem',
          display: 'flex', gap: '3rem',
          flexWrap: 'wrap', justifyContent: 'center',
          animation: 'fadeIn .7s ease .5s both',
        }}>
          {[
            { n: '5', label: 'Edificios' },
            { n: '20+', label: 'Laboratorios' },
            { n: '3D', label: 'Visualización' },
            { n: '360°', label: 'Exploración' },
          ].map(({ n, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800, fontSize: '2rem',
                color: 'var(--color-primary)',
              }}>{n}</div>
              <div style={{
                fontSize: '0.8rem', fontWeight: 500,
                color: 'var(--color-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EDIFICIOS ── */}
      <section id="edificios" style={{
        padding: '5rem 1.5rem',
        background: 'var(--color-bg-soft)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              background: 'var(--color-gold-bg)',
              color: 'var(--color-gold-dark)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: '0.75rem',
            }}>Instalaciones</span>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: 'var(--color-text)',
            }}>Edificios de la FIE</h2>
            <p style={{ color: 'var(--color-text-3)', marginTop: '0.75rem', maxWidth: 500, margin: '0.75rem auto 0' }}>
              Selecciona un edificio para comenzar a explorarlo en 3D
            </p>
          </div>

          {loading ? (
            <BuildingsSkeletons />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}>
              {buildings.map((b) => (
                <BuildingCard key={b.id} building={b} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section style={{ padding: '5rem 1.5rem', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            marginBottom: '3rem',
          }}>¿Cómo funciona?</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2rem',
          }}>
            {[
              {
                icon: '🏛️',
                title: 'Selecciona un edificio',
                desc: 'Elige entre los distintos edificios y bloques de la FIE desde el mapa o la lista.',
              },
              {
                icon: '🔍',
                title: 'Explora en 3D',
                desc: 'Navega alrededor del modelo fotogramétrico con zoom, rotación y paneo completos.',
              },
              {
                icon: '📍',
                title: 'Toca los hotspots',
                desc: 'Descubre puntos de interés marcados: laboratorios, oficinas, servicios y accesos.',
              },
              {
                icon: '📋',
                title: 'Obtén información',
                desc: 'Consulta detalles de cada espacio: descripción, horarios, equipamiento e imágenes.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                padding: '1.75rem',
                background: 'var(--color-bg-soft)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-soft)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{icon}</div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem', marginBottom: '0.5rem',
                }}>{title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-3)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        padding: '2rem 1.5rem',
        background: 'var(--color-primary)',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        fontSize: '0.85rem',
      }}>
        <p style={{ fontFamily: 'var(--font-display)', color: '#fff', marginBottom: '0.25rem', fontWeight: 600 }}>
          FIE Explorer 3D · ESPOCH
        </p>
        <p>Grefa Rivadeneyra Rumi Adrian · Código 7333 · {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}

function BuildingCard({ building }) {
  const typeLabel = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' };
  const typeColor = { main: '#003087', secondary: '#374151', lab: '#0369a1' };

  return (
    <Link to={`/explorar/${building.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all var(--transition)',
        height: '100%',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderColor = 'var(--color-primary-100)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }}
      >
        {/* Icon header */}
        <div style={{
          width: 48, height: 48,
          background: 'var(--color-primary-50)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1rem',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
          </svg>
        </div>

        {/* Type badge */}
        <span style={{
          display: 'inline-block',
          padding: '0.2rem 0.6rem',
          background: `${typeColor[building.type]}15`,
          color: typeColor[building.type],
          borderRadius: 'var(--radius-full)',
          fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: '0.6rem',
        }}>
          {typeLabel[building.type] || building.type}
        </span>

        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.05rem', fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: '0.4rem',
        }}>{building.name}</h3>

        <p style={{
          fontSize: '0.82rem', color: 'var(--color-text-3)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: '1rem',
        }}>{building.description}</p>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--color-border-soft)',
        }}>
          <span style={{
            fontSize: '0.8rem', color: 'var(--color-text-3)',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14"/>
            </svg>
            {building.floor_count} {building.floor_count === 1 ? 'planta' : 'plantas'}
          </span>
          <span style={{
            fontSize: '0.8rem', fontWeight: 600,
            color: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            Explorar
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function BuildingsSkeletons() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '1.25rem',
    }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          height: 200,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}/>
      ))}
    </div>
  );
}
