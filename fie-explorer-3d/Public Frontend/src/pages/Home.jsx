import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { buildingsService } from '../services/buildingsService';

const BUILDING_PALETTE = {
  main: {
    iconBg: 'var(--red-06)',
    iconBorder: 'var(--red-10)',
    iconColor: 'var(--red)',
    accentBar: 'var(--red)',
    badgeBg: 'var(--red-06)',
    badgeBorder: 'var(--red-10)',
    badgeColor: 'var(--red)',
  },
  secondary: {
    iconBg: 'rgba(120,53,15,.06)',
    iconBorder: 'rgba(120,53,15,.14)',
    iconColor: '#92400e',
    accentBar: '#92400e',
    badgeBg: 'rgba(120,53,15,.06)',
    badgeBorder: 'rgba(120,53,15,.14)',
    badgeColor: '#92400e',
  },
  lab: {
    iconBg: 'rgba(14,116,144,.07)',
    iconBorder: 'rgba(14,116,144,.15)',
    iconColor: '#0e7490',
    accentBar: '#0e7490',
    badgeBg: 'rgba(14,116,144,.07)',
    badgeBorder: 'rgba(14,116,144,.15)',
    badgeColor: '#0e7490',
  },
};

function getPalette(type) {
  return BUILDING_PALETTE[type] || BUILDING_PALETTE.main;
}

function useDirHover(ref) {
  const enter = useCallback(e => {
    const el = ref.current;
    if (!el) return;

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

function CountUp({ end, suffix = '' }) {
  const [v, setV] = useState(0);
  const ref = useRef();

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;

      obs.disconnect();

      const n = parseInt(end, 10);
      if (isNaN(n)) {
        setV(end);
        return;
      }

      let cur = 0;
      const step = Math.max(1, Math.ceil(n / 30));

      const id = setInterval(() => {
        cur = Math.min(cur + step, n);
        setV(cur);
        if (cur >= n) clearInterval(id);
      }, 38);
    }, { threshold: .5 });

    if (ref.current) obs.observe(ref.current);

    return () => obs.disconnect();
  }, [end]);

  return <span ref={ref}>{v}{suffix}</span>;
}

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
    'Visualización 3D', 'Campus ESPOCH', 'Modelos GLB',
    'Laboratorios interactivos', 'WebGL · Three.js', 'Explorador 3D FIE',
    'Visualización 3D', 'Campus ESPOCH', 'Modelos GLB',
    'Laboratorios interactivos', 'WebGL · Three.js', 'Explorador 3D FIE',
  ];

  return (
    <main
      style={{
        paddingTop: 'var(--nav-h,64px)',
        fontFamily: 'var(--font-body)',
        background: 'var(--cream)',
        color: 'var(--red)',
      }}
    >
      <section
        className="home-hero"
        style={{
          position: 'relative',
          minHeight: '100dvh',
          overflow: 'hidden',
          backgroundImage: 'url(https://www.espoch.edu.ec/wp-content/uploads/2022/08/Fie-scaled.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          aria-hidden
          className="home-hero-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: 'linear-gradient(100deg, rgba(253,250,249,.97) 0%, rgba(253,250,249,.92) 42%, rgba(253,250,249,.52) 68%, rgba(253,250,249,.12) 100%)',
          }}
        />

        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            zIndex: 1,
            background: 'linear-gradient(to bottom, transparent 0%, var(--red) 25%, var(--red) 75%, transparent 100%)',
          }}
        />

        <div
          className="home-hero-inner"
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: 1320,
            margin: '0 auto',
            padding: '8rem 5vw 5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            minHeight: '100dvh',
            justifyContent: 'center',
          }}
        >
          <div style={{ maxWidth: 580 }}>
            <div className="s0" style={{ display: 'inline-flex', alignItems: 'center', gap: '.55rem', marginBottom: '1.75rem' }}>
              <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'block', flexShrink: 0 }} />
                <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-ring 2.2s ease-out infinite' }} />
              </span>

              <span
                style={{
                  fontSize: '.7rem',
                  fontWeight: 600,
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  color: 'var(--red)',
                }}
              >
                ESPOCH
              </span>
            </div>

            <h1
              className="s1 home-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(2.6rem,5.5vw,4.4rem)',
                lineHeight: 1.04,
                letterSpacing: '-.03em',
                color: 'var(--red)',
                margin: '0 0 .2em',
              }}
            >
              Recorre la&nbsp;FIE<br />
              <span style={{ color: 'rgba(80,4,10,.75)', fontWeight: 700 }}>
                sin estar ahí
              </span>
            </h1>

            <p
              className="s2 home-subtitle"
              style={{
                fontSize: '1.02rem',
                fontWeight: 300,
                lineHeight: 1.75,
                color: 'var(--ink)',
                maxWidth: '52ch',
                margin: '1.4rem 0 2.25rem',
              }}
            >
              Navega edificios, laboratorios y espacios en tres dimensiones.
              Toca cualquier sala para ver horarios, docentes y equipamiento en tiempo real.
            </p>

            <div className="s3 cta-row" style={{ display: 'flex', gap: '.85rem', alignItems: 'center' }}>
              <PrimaryBtn to="/explorar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Iniciar exploración
              </PrimaryBtn>

              <a
                href="#edificios"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.4rem',
                  padding: '.8rem 1.5rem',
                  fontWeight: 600,
                  fontSize: '.88rem',
                  color: 'var(--red)',
                  textDecoration: 'none',
                  border: '1.5px solid var(--rule)',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(253,250,249,.7)',
                  backdropFilter: 'blur(6px)',
                  transition: 'border-color .25s var(--transition), background .25s var(--transition)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(188,6,19,.45)';
                  e.currentTarget.style.background = 'var(--white)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--rule)';
                  e.currentTarget.style.background = 'rgba(253,250,249,.7)';
                }}
              >
                Ver edificios
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </a>
            </div>

            <div
              className="s4 home-hero-stats"
              style={{
                display: 'flex',
                gap: 0,
                marginTop: '3.25rem',
                paddingTop: '2rem',
                borderTop: '1px solid var(--rule)',
              }}
            >
              {[
                { n: '5', sx: '', l: 'Edificios' },
                { n: '20', sx: '+', l: 'Laboratorios' },
                { n: '360', sx: '°', l: 'Exploración' },
              ].map(({ n, sx, l }, i) => (
                <div key={l} style={{ flex: 1, textAlign: 'left', position: 'relative', paddingLeft: i > 0 ? '1.5rem' : 0 }}>
                  {i > 0 && (
                    <span
                      className="stat-sep"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '10%',
                        bottom: '10%',
                        width: 1,
                        background: 'var(--rule)',
                      }}
                    />
                  )}

                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.9rem', color: 'var(--red)', lineHeight: 1 }}>
                    <CountUp end={n} suffix={sx} />
                  </div>

                  <div style={{ fontSize: '.68rem', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink)', marginTop: '.3rem' }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          borderTop: '2px solid var(--red)',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--white)',
          padding: '.8rem 0',
        }}
      >
        <div className="ticker-track">
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
                color: 'var(--ink)',
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
              {t}
            </span>
          ))}
        </div>
      </div>

      <section id="edificios" className="sec-pad" style={{ padding: '5.5rem 5vw', background: 'var(--cream)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            className="home-section-head"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '2.75rem',
              paddingBottom: '1.25rem',
              borderBottom: '1.5px solid var(--red)',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '.68rem',
                  fontWeight: 700,
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                  marginBottom: '.45rem',
                }}
              >
                Instalaciones
              </p>

              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'clamp(1.7rem,3.2vw,2.5rem)',
                  letterSpacing: '-.025em',
                  color: 'var(--red)',
                  margin: 0,
                }}
              >
                Edificios de la FIE
              </h2>
            </div>

            <Link
              to="/explorar"
              style={{
                fontSize: '.76rem',
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--ink)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '.35rem',
                transition: 'color .2s var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink)'; }}
            >
              Mapa completo
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {loading ? <BentoSkeleton /> : <BentoGrid buildings={buildings} />}
        </div>
      </section>

      <section className="sec-pad" style={{ padding: '5.5rem 5vw', background: 'var(--white)', borderTop: '1px solid var(--rule)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: '3.5rem' }}>
            <p
              style={{
                fontSize: '.68rem',
                fontWeight: 700,
                letterSpacing: '.15em',
                textTransform: 'uppercase',
                color: 'var(--ink)',
                marginBottom: '.45rem',
              }}
            >
              Proceso
            </p>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(1.7rem,3.2vw,2.5rem)',
                letterSpacing: '-.025em',
                color: 'var(--red)',
                margin: 0,
              }}
            >
              ¿Cómo funciona?
            </h2>
          </div>

          <div
            className="steps-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1px',
              background: 'var(--rule)',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
            }}
          >
            {[
              { n: '01', title: 'Selecciona un edificio', body: 'Elige entre los distintos edificios y bloques desde el mapa 3D o la lista de instalaciones del campus.' },
              { n: '02', title: 'Navega en 3D', body: 'Rota, acerca y desplaza el modelo fotogramétrico con libertad total. Three.js y WebGL procesan cada frame.' },
              { n: '03', title: 'Activa los hotspots', body: 'Cada sala, laboratorio u oficina tiene una malla nombrada. Haz clic para revelar su ficha completa.' },
              { n: '04', title: 'Consulta la información', body: 'Horarios, equipamiento, docentes e imágenes del espacio, sin necesidad de estar presencialmente.' },
            ].map(({ n, title, body }) => (
              <div
                key={n}
                style={{
                  position: 'relative',
                  background: 'var(--white)',
                  padding: '2.25rem 2rem',
                  overflow: 'hidden',
                  borderTop: '2px solid transparent',
                  transition: 'border-top-color .25s var(--transition)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderTopColor = 'var(--red)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderTopColor = 'transparent'; }}
              >
                <span className="step-num">{n}</span>

                <div
                  style={{
                    fontSize: '.62rem',
                    fontWeight: 700,
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--red)',
                    marginBottom: '1.1rem',
                  }}
                >
                  {n}
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: 'var(--red)',
                    marginBottom: '.6rem',
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </h3>

                <p style={{ fontSize: '.85rem', color: 'var(--ink)', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
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

function PrimaryBtn({ to, children }) {
  const ref = useRef();
  const { onMouseEnter, onMouseLeave } = useDirHover(ref);

  return (
    <Link
      to={to}
      ref={ref}
      className="dir-btn"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'inline-flex',
        padding: '.85rem 1.9rem',
        background: 'var(--red)',
        color: '#fff',
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: '.9rem',
        letterSpacing: '.03em',
        border: 'none',
      }}
    >
      <div className="fill" />
      <span>{children}</span>
    </Link>
  );
}

function BentoGrid({ buildings }) {
  if (!buildings.length) return <EmptyBuildings />;

  const [featured, ...rest] = buildings;

  return (
    <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
      <div className="featured g-item" style={{ gridColumn: 'span 2' }}>
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

function BuildingCard({ building, featured = false }) {
  const TYPE_LABEL = {
    main: 'Principal',
    secondary: 'Secundario',
    lab: 'Laboratorio',
  };

  const palette = getPalette(building.type);

  return (
    <Link to={`/explorar/${building.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <SpotlightCard
        className={featured ? 'building-card-featured' : ''}
        style={{
          background: 'var(--white)',
          padding: featured ? '2.25rem 2.5rem' : '1.75rem',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: featured ? 'row' : 'column',
          alignItems: featured ? 'flex-end' : 'flex-start',
          gap: featured ? '3rem' : 0,
        }}
      >
        {featured ? (
          <>
            <div style={{ flex: 1 }}>
              <BuildingHeader building={building} typeLabel={TYPE_LABEL} palette={palette} />

              <p style={{ fontSize: '.9rem', fontWeight: 300, color: 'var(--ink)', lineHeight: 1.7, maxWidth: '55ch', marginTop: '.75rem' }}>
                {building.description}
              </p>
            </div>

            <div className="building-card-featured-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.75rem', flexShrink: 0 }}>
              <FloorBadge building={building} />
              <ExploreArrow palette={palette} />
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '1.5rem',
                right: '1.5rem',
                height: 3,
                background: palette.accentBar,
                borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                opacity: .35,
              }}
            />

            <BuildingHeader building={building} typeLabel={TYPE_LABEL} palette={palette} />

            <p
              style={{
                fontSize: '.82rem',
                fontWeight: 300,
                color: 'var(--ink)',
                lineHeight: 1.65,
                flex: 1,
                marginTop: '.5rem',
                marginBottom: '1.25rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {building.description}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingTop: '.85rem',
                borderTop: '1px solid var(--rule)',
              }}
            >
              <FloorBadge building={building} />
              <ExploreArrow palette={palette} />
            </div>
          </>
        )}
      </SpotlightCard>
    </Link>
  );
}

function BuildingHeader({ building, typeLabel, palette }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.9rem' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: palette.iconBg,
            border: `1px solid ${palette.iconBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: palette.iconColor,
            flexShrink: 0,
          }}
        >
          <BuildingIcon />
        </div>

        <span
          style={{
            fontSize: '.6rem',
            fontWeight: 700,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: palette.badgeColor,
            padding: '.18rem .6rem',
            border: `1px solid ${palette.badgeBorder}`,
            background: palette.badgeBg,
            borderRadius: 'var(--radius-full)',
          }}
        >
          {typeLabel[building.type] || building.type}
        </span>
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.05rem',
          color: 'var(--red)',
          lineHeight: 1.25,
          margin: 0,
        }}
      >
        {building.name}
      </h3>
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" />
    </svg>
  );
}

function FloorBadge({ building }) {
  return (
    <span style={{ fontSize: '.7rem', fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14" />
      </svg>
      {building.floor_count} {building.floor_count === 1 ? 'planta' : 'plantas'}
    </span>
  );
}

function ExploreArrow({ palette }) {
  return (
    <span
      style={{
        fontSize: '.74rem',
        fontWeight: 700,
        color: palette.iconColor,
        display: 'flex',
        alignItems: 'center',
        gap: '.3rem',
        letterSpacing: '.05em',
      }}
    >
      Explorar
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </span>
  );
}

function BentoSkeleton() {
  return (
    <div className="bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem' }}>
      <div
        className="featured"
        style={{
          gridColumn: 'span 2',
          height: 160,
          borderRadius: 'var(--r-lg)',
          backgroundImage: 'linear-gradient(90deg,var(--cream) 25%,var(--white) 50%,var(--cream) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease infinite',
          border: '1px solid var(--rule)',
        }}
      />

      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          style={{
            height: 180,
            borderRadius: 'var(--r-lg)',
            backgroundImage: 'linear-gradient(90deg,var(--cream) 25%,var(--white) 50%,var(--cream) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s ease infinite',
            border: '1px solid var(--rule)',
          }}
        />
      ))}
    </div>
  );
}

function EmptyBuildings() {
  return (
    <div style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed var(--rule)', borderRadius: 'var(--radius-xl)' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-100)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: '1rem' }}>
        <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" />
      </svg>

      <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '.9rem', margin: 0 }}>
        No hay edificios registrados aún
      </p>
    </div>
  );
}