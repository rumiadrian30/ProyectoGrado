import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const TYPE_ICON  = { lab: '', office: '', service: '', access: '' };
const TYPE_LABEL = { lab: 'Laboratorio', office: 'Oficina', service: 'Servicio', access: 'Acceso' };
const TYPE_COLOR = { lab: '#BC0613', office: '#1d4ed8', service: '#16a34a', access: '#d97706' };

export default function Directorio() {
  const [hotspots,  setHotspots]  = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [query,    setQuery]    = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/hotspots').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
      api.get('/buildings').then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])),
    ])
      .then(([h, b]) => { setHotspots(h.filter(x => x.is_active)); setBuildings(b.filter(x => x.is_active)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return hotspots.filter(h => {
      const matchQ = !q || h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q) || h.building_name?.toLowerCase().includes(q);
      const matchT = typeFilter === 'all' || h.type === typeFilter;
      const matchB = buildingFilter === 'all' || h.building_id === buildingFilter;
      return matchQ && matchT && matchB;
    });
  }, [hotspots, query, typeFilter, buildingFilter]);

  // Agrupar por edificio
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(h => {
      const key = h.building_id;
      if (!map[key]) map[key] = { name: h.building_name, code: h.building_code, items: [] };
      map[key].items.push(h);
    });
    return Object.values(map).sort((a, b) => a.name?.localeCompare(b.name));
  }, [filtered]);

  return (
    <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: '#fff' }}>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a5f 100%)',
        padding: '4rem 1.5rem 3rem',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.15)',
            color: '#fff', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '0.3rem 1rem', borderRadius: 'var(--radius-full)', marginBottom: '1.25rem',
          }}>Directorio de espacios</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 800, color: '#fff', marginBottom: '0.75rem',
          }}>Encuentra cualquier espacio<br/>de la FIE</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', marginBottom: '2rem' }}>
            Laboratorios, oficinas, servicios y accesos de todos los edificios.
          </p>

          {/* Barra de búsqueda */}
          <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto' }}>
            <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              placeholder="Buscar laboratorio, oficina, servicio…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
                border: 'none', borderRadius: 'var(--radius-lg)',
                fontSize: '0.95rem', fontFamily: 'var(--font-body)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </section>

      {/* Filtros */}
      <div style={{
        position: 'sticky', top: 'var(--nav-h)', zIndex: 50,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.75rem 1.5rem',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-3)', marginRight: '0.25rem' }}>
            Tipo:
          </span>
          {['all', 'lab', 'office', 'service', 'access'].map(t => (
            <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {t === 'all' ? 'Todos' : `${TYPE_ICON[t]} ${TYPE_LABEL[t]}`}
            </FilterChip>
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 0.25rem' }}/>

          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-3)', marginRight: '0.25rem' }}>
            Edificio:
          </span>
          <FilterChip active={buildingFilter === 'all'} onClick={() => setBuildingFilter('all')}>
            Todos
          </FilterChip>
          {buildings.map(b => (
            <FilterChip key={b.id} active={buildingFilter === b.id} onClick={() => setBuildingFilter(b.id)}>
              {b.code}
            </FilterChip>
          ))}

          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-3)' }}>
            Cargando directorio…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Sin resultados
            </p>
            <p style={{ color: 'var(--color-text-3)' }}>
              Prueba con otro término o cambia los filtros.
            </p>
          </div>
        )}

        {!loading && grouped.map(group => (
          <div key={group.code} style={{ marginBottom: '2.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              marginBottom: '1rem', paddingBottom: '0.5rem',
              borderBottom: '2px solid var(--color-primary)',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.15rem',
                fontWeight: 700, color: 'var(--color-text)',
              }}>{group.name}</h2>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                background: 'var(--color-primary-50)', color: 'var(--color-primary)',
                borderRadius: 'var(--radius-full)',
              }}>{group.code}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', marginLeft: 'auto' }}>
                {group.items.length} espacio{group.items.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.85rem',
            }}>
              {group.items.map(h => (
                <Link
                  key={h.id}
                  to={`/explorar/${h.building_id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem 1.15rem',
                    background: '#fff',
                    transition: 'all 200ms',
                    cursor: 'pointer',
                    display: 'flex', gap: '0.85rem', alignItems: 'flex-start',
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = TYPE_COLOR[h.type] || 'var(--color-primary)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span style={{
                      fontSize: '1.5rem', flexShrink: 0,
                      width: 40, height: 40, borderRadius: 'var(--radius-md)',
                      background: `${TYPE_COLOR[h.type]}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {TYPE_ICON[h.type] || '📍'}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.07em', color: TYPE_COLOR[h.type] || 'var(--color-primary)',
                        }}>{TYPE_LABEL[h.type]}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)' }}>· Piso {h.floor}</span>
                      </div>
                      <p style={{
                        fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)',
                        marginBottom: '0.25rem', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{h.name}</p>
                      {h.description && (
                        <p style={{
                          fontSize: '0.78rem', color: 'var(--color-text-3)', lineHeight: 1.4,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{h.description}</p>
                      )}
                      {h.schedule && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-3)', marginTop: '0.3rem' }}>
                          🕐 {h.schedule}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function FilterChip({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 500,
      border: '1px solid', cursor: 'pointer', borderRadius: 'var(--radius-full)',
      transition: 'all 150ms', fontFamily: 'var(--font-body)',
      background: active ? 'var(--color-primary)' : 'transparent',
      color: active ? '#fff' : 'var(--color-text-2)',
      borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
    }}>{children}</button>
  );
}
