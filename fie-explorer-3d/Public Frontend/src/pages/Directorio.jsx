import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { isOpenNow, scheduleToString, parseSchedule } from '../utils/scheduleUtils';
import BuildingAccordion from '../components/ui/BuildingAccordion.jsx';

const TYPE_LABEL = {
  classroom: 'Aula',
  lab: 'Laboratorio',
  office: 'Oficina',
  service: 'Servicio',
  access: 'Acceso',
};

const TYPE_PALETTE = {
  classroom: {
    iconBg: 'var(--red-06)',
    iconBorder: 'var(--red-10)',
    iconColor: 'var(--red)',
  },
  lab: {
    iconBg: 'rgba(14,116,144,.07)',
    iconBorder: 'rgba(14,116,144,.15)',
    iconColor: '#0e7490',
  },
  office: {
    iconBg: 'rgba(120,53,15,.06)',
    iconBorder: 'rgba(120,53,15,.14)',
    iconColor: '#92400e',
  },
  service: {
    iconBg: 'rgba(79,70,229,.07)',
    iconBorder: 'rgba(79,70,229,.15)',
    iconColor: '#4f46e5',
  },
  access: {
    iconBg: 'rgba(5,150,105,.07)',
    iconBorder: 'rgba(5,150,105,.15)',
    iconColor: '#059669',
  },
};

function getPalette(type) {
  return TYPE_PALETTE[type] || TYPE_PALETTE.office;
}

function scheduleDisplay(raw) {
  const p = parseSchedule(raw);
  return p ? scheduleToString(p) : raw;
}

const Icons = {
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  Floor: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  User: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Clock: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  Phone: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Users: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Arrow: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  Empty: () => (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  Filter: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Chevron: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  TypeIcon: ({ type, size = 15 }) => {
    const d = {
      classroom: <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />,
      lab: (
        <>
          <path d="M10 2v7.31" />
          <path d="M14 9.3V1.99" />
          <path d="M8.5 2h7" />
          <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
        </>
      ),
      office: (
        <>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </>
      ),
      service: (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </>
      ),
      access: (
        <>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </>
      ),
    };

    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {d[type] || d.office}
      </svg>
    );
  },
};

export default function Directorio() {
  const [hotspots, setHotspots] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/hotspots').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
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
    <main
      style={{
        paddingTop: 'var(--nav-h, 64px)',
        minHeight: '100dvh',
        background: 'var(--cream, #FDFAF9)',
        fontFamily: 'var(--font-body)',
        color: 'var(--red, #BC0613)',
      }}
    >
      {/* ══ HERO — MISMA ESTRUCTURA QUE AYUDA / ACERCA DE ═════════════ */}
      <section className="dir-hero" style={{ position: 'relative', overflow: 'hidden', background: 'var(--red, #BC0613)' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-90px',
            right: '-70px',
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.05)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: '-110px',
            left: '8%',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.04)',
            pointerEvents: 'none',
          }}
        />

        <div
          className="hy-hero-inner"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '7rem 5vw 5rem',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            className="hy-split"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '3rem',
            }}
          >
            <div style={{ flex: 1, maxWidth: 580 }}>
              <div
                className="hy-s0"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  marginBottom: '1.5rem',
                  padding: '.3rem .9rem',
                  background: 'rgba(255,255,255,.15)',
                  border: '1px solid rgba(255,255,255,.22)',
                  borderRadius: '999px',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.85)', display: 'block' }} />
                <span style={{ fontSize: '.65rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>
                  Directorio
                </span>
              </div>

              <h1
                className="hy-s1"
                style={{
                  fontWeight: 800,
                  fontSize: 'clamp(2.4rem, 5vw, 4rem)',
                  lineHeight: 1.04,
                  letterSpacing: '-.03em',
                  color: '#fff',
                  margin: '0 0 .2em',
                }}
              >
                GeoESPOCH 3D<br />
                <span style={{ color: 'rgba(255,255,255,.65)', fontWeight: 300, fontSize: '.68em' }}>
                  Encuentra cualquier espacio
                </span>
              </h1>

              <p
                className="hy-s2"
                style={{
                  fontSize: '.98rem',
                  fontWeight: 300,
                  lineHeight: 1.75,
                  color: 'rgba(255,255,255,.68)',
                  maxWidth: '50ch',
                  margin: '1.25rem 0 2rem',
                }}
              >
                Consulta aulas, laboratorios, oficinas, servicios y accesos de la Facultad,
                con horarios, docentes y disponibilidad en tiempo real.
              </p>

              <div className="hy-s3 dir-hero-search" style={{ position: 'relative', maxWidth: 460 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '1.1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,.45)',
                    display: 'flex',
                    pointerEvents: 'none',
                  }}
                >
                  <Icons.Search />
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

            <div
              className="hy-split-stats hy-s4"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                flexShrink: 0,
                borderLeft: '1px solid rgba(255,255,255,.15)',
                paddingLeft: '3rem',
              }}
            >
              {[
                { n: hotspots.length || '—', l: 'Espacios totales' },
                { n: buildings.length || '—', l: 'Edificios' },
                { n: presentTypes.length || '—', l: 'Tipos de espacio' },
              ].map(({ n, l }, i) => (
                <div
                  key={l}
                  style={{
                    paddingBottom: i < 2 ? '1.5rem' : 0,
                    marginBottom: i < 2 ? '1.5rem' : 0,
                    borderBottom: i < 2 ? '1px solid rgba(255,255,255,.1)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '2rem', color: '#fff', lineHeight: 1 }}>
                    {n}
                  </div>
                  <div
                    style={{
                      fontSize: '.62rem',
                      fontWeight: 600,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,.42)',
                      marginTop: '.25rem',
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="filter-bar">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '.7rem 5vw' }}>
          <button
            className="filter-toggle"
            onClick={() => setFiltersOpen(v => !v)}
            type="button"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}>
              <Icons.Filter />
              Filtros
            </span>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              <span
                style={{
                  display: 'inline-flex',
                  transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform .2s ease',
                }}
              >
                <Icons.Chevron />
              </span>
            </span>
          </button>

          <div
            className={`filter-wrap ${filtersOpen ? 'open' : ''}`}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '.4rem',
            }}
          >
            <span className="filter-label">Tipo</span>

            <button className={`f-chip${typeFilter === 'all' ? ' active' : ''}`} onClick={() => setTypeFilter('all')} type="button">
              Todos
            </button>

            {presentTypes.map(t => (
              <button key={t} className={`f-chip${typeFilter === t ? ' active' : ''}`} onClick={() => setTypeFilter(t)} type="button">
                <Icons.TypeIcon type={t} />{TYPE_LABEL[t]}
              </button>
            ))}

            <span className="filter-separator" />

            <span className="filter-label">Edificio</span>

            <button className={`b-chip${buildingFilter === 'all' ? ' active' : ''}`} onClick={() => setBuildingFilter('all')} type="button">
              Todos
            </button>

            {buildings.map(b => (
              <button key={b.id} className={`b-chip${buildingFilter === b.id ? ' active' : ''}`} onClick={() => setBuildingFilter(b.id)} type="button">
                {b.code}
              </button>
            ))}

            <span className="filter-result">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '3.5rem 5vw 5rem' }}>
        {loading && <DirectorioSkeleton />}

        {!loading && filtered.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '6rem 2rem',
              textAlign: 'center',
              border: '1.5px dashed var(--rule)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <span style={{ color: 'var(--color-primary-100)', marginBottom: '1.25rem' }}><Icons.Empty /></span>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--red)', marginBottom: '.4rem' }}>Sin resultados</p>
            <p style={{ fontWeight: 300, fontSize: '.88rem', color: 'var(--ink)', margin: 0 }}>
              Prueba con otro término o cambia los filtros.
            </p>
          </div>
        )}

        {!loading && grouped.map((group, i) => (
          <BuildingAccordion key={group.code} group={group} defaultOpen={i === 0}>
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

function SpaceCard({ hotspot: h }) {
  const openStatus = isOpenNow(h.schedule);
  const scheduleStr = h.schedule ? scheduleDisplay(h.schedule) : null;
  const palette = getPalette(h.type);
  const isClosed = openStatus === false;

  const handleMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <Link
      to={`/explorar/${h.building_id}`}
      className={`d-card sp-card${isClosed ? ' is-closed' : ''}`}
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', padding: '1.4rem' }}
      onMouseMove={handleMove}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.6rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
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
            <Icons.TypeIcon type={h.type} />
          </div>

          <div>
            <span
              style={{
                fontSize: '.58rem',
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: palette.iconColor,
                display: 'block',
                marginBottom: '.1rem',
              }}
            >
              {TYPE_LABEL[h.type]}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              <span style={{ color: 'var(--color-primary-100)', display: 'flex' }}><Icons.Floor /></span>
              <span style={{ fontSize: '.65rem', color: 'var(--ink)' }}>Piso {h.floor}</span>
            </div>
          </div>
        </div>

        {openStatus !== null && (
          <span
            style={{
              flexShrink: 0,
              borderRadius: '999px',
              fontSize: '.58rem',
              fontWeight: 700,
              padding: '.22rem .65rem',
              background: openStatus ? 'var(--red-06)' : 'rgba(80,4,10,.05)',
              color: openStatus ? 'var(--red)' : 'var(--ink)',
              border: `1px solid ${openStatus ? 'var(--color-primary-100)' : 'rgba(80,4,10,.1)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '.3rem',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: openStatus ? 'var(--red)' : 'rgba(80,4,10,.3)', display: 'block' }} />
            {openStatus ? 'Abierto' : 'Cerrado'}
          </span>
        )}
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '.95rem',
          lineHeight: 1.3,
          color: 'var(--red)',
          margin: '0 0 .4rem',
        }}
      >
        {h.name}
      </h3>

      {h.description && (
        <p
          style={{
            fontSize: '.78rem',
            fontWeight: 300,
            color: 'var(--ink)',
            lineHeight: 1.65,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
            margin: '0 0 .85rem',
          }}
        >
          {h.description}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.28rem', marginTop: 'auto' }}>
        {h.capacity && <MetaRow icon={<Icons.Users />} text={`${h.capacity} personas`} />}
        {h.teacher && <MetaRow icon={<Icons.User />} text={h.teacher} />}
        {scheduleStr && <MetaRow icon={<Icons.Clock />} text={scheduleStr} />}
        {h.phone && <MetaRow icon={<Icons.Phone />} text={h.phone} />}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '1rem',
          paddingTop: '.85rem',
          borderTop: '1px solid var(--rule)',
        }}
      >
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
          Ver en mapa <Icons.Arrow />
        </span>
      </div>
    </Link>
  );
}

function MetaRow({ icon, text }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
      <span style={{ color: 'var(--color-primary-100)', flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: '.72rem', fontWeight: 400, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {text}
      </span>
    </span>
  );
}

function DirectorioSkeleton() {
  return (
    <div>
      {[1, 2].map(g => (
        <div key={g} style={{ marginBottom: '4rem' }}>
          <div
            style={{
              height: 76,
              borderRadius: 'var(--radius-md)',
              marginBottom: '2rem',
              backgroundImage: 'linear-gradient(90deg,var(--cream) 25%,#fff 50%,var(--cream) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease infinite',
              border: '1px solid var(--rule)',
            }}
          />

          <div className="dir-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: '1rem' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                style={{
                  height: 200,
                  borderRadius: 'var(--r-lg)',
                  backgroundImage: 'linear-gradient(90deg,var(--cream) 25%,#fff 50%,var(--cream) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s ease infinite',
                  border: '1px solid var(--rule)',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}