import React, { useState } from 'react';

const TYPE_LABELS = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' };
const TYPE_COLORS = { main: '#BC0613', secondary: '#374151', lab: '#d41a2b' };

export default function BuildingSelector({ buildings, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = buildings.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === 'all' || b.type === filter;
    return matchSearch && matchType;
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-xl)',
        width: '100%', maxWidth: 700,
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        animation: 'scaleIn .2s ease',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.5rem 1.75rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-primary)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem', fontWeight: 800,
                color: '#fff', marginBottom: '0.25rem',
              }}>Seleccionar edificio</h2>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
                Elige un edificio para comenzar la exploración 3D
              </p>
            </div>
            {onClose && (
              <button onClick={onClose} style={{
                width: 32, height: 32,
                background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700,
              }}>×</button>
            )}
          </div>

          {/* Búsqueda */}
          <div style={{ marginTop: '1rem', position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código..."
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Filtros por tipo */}
        <div style={{
          padding: '0.75rem 1.75rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', gap: '0.5rem',
          background: 'var(--color-bg-soft)',
        }}>
          {[
            { v: 'all', l: 'Todos' },
            { v: 'main', l: 'Principal' },
            { v: 'lab', l: 'Laboratorio' },
            { v: 'secondary', l: 'Secundario' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding: '0.3rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: filter === v ? 'var(--color-primary)' : 'var(--color-border)',
              background: filter === v ? 'var(--color-primary)' : '#fff',
              color: filter === v ? '#fff' : 'var(--color-text-2)',
              fontSize: '0.78rem', fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all var(--transition)',
            }}>{l}</button>
          ))}
        </div>

        {/* Lista de edificios */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.25rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-3)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
              <p>No se encontraron edificios con esa búsqueda.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.75rem',
            }}>
              {filtered.map(b => (
                <BuildingOption key={b.id} building={b} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BuildingOption({ building: b, onSelect }) {
  const color = TYPE_COLORS[b.type] || '#374151';
  const label = TYPE_LABELS[b.type] || b.type;

  return (
    <button
      onClick={() => onSelect(b)}
      style={{
        textAlign: 'left',
        padding: '1rem 1.1rem',
        background: '#fff',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'all var(--transition)',
        width: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--color-primary)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <span style={{
          padding: '0.15rem 0.55rem',
          background: `${color}15`,
          color,
          borderRadius: 'var(--radius-full)',
          fontSize: '0.68rem', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>{label}</span>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--color-text-4)',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
        }}>{b.code}</span>
      </div>

      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.95rem', fontWeight: 700,
        color: 'var(--color-text)',
        marginBottom: '0.3rem',
      }}>{b.name}</h3>

      <p style={{
        fontSize: '0.78rem', color: 'var(--color-text-3)',
        lineHeight: 1.4,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>{b.description}</p>

      <div style={{
        marginTop: '0.6rem',
        fontSize: '0.72rem', color: 'var(--color-text-4)',
        display: 'flex', alignItems: 'center', gap: '0.3rem',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14"/>
        </svg>
        {b.floor_count} {b.floor_count === 1 ? 'planta' : 'plantas'}
      </div>
    </button>
  );
}
