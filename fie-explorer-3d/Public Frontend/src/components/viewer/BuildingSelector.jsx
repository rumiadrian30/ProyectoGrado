/**
 * BuildingSelector.jsx — Explorador 3D FIE
 * Modal para elegir el edificio a explorar: búsqueda, filtro por tipo y
 * tarjetas con un resumen útil (espacios registrados, plantas, interior 3D).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

const TYPE_LABELS = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' };
const TYPE_ORDER  = { main: 0, lab: 1, secondary: 2 };

function Icon({ children, size = 12, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

export default function BuildingSelector({ buildings, selectedId = null, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Escape cierra (si se permite cerrar)
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return buildings
      .filter((b) => b.is_active !== false)
      .filter((b) => filter === 'all' || b.type === filter)
      .filter((b) => !q
        || b.name?.toLowerCase().includes(q)
        || b.code?.toLowerCase().includes(q)
        || b.description?.toLowerCase().includes(q))
      .sort((a, b) =>
        (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9)
        || a.name.localeCompare(b.name, 'es'));
  }, [buildings, filter, search]);

  const presentTypes = useMemo(
    () => new Set(buildings.filter((b) => b.is_active !== false).map((b) => b.type)),
    [buildings],
  );

  const typeFilters = [
    { v: 'all',       l: 'Todos' },
    { v: 'main',      l: 'Principal' },
    { v: 'lab',       l: 'Laboratorio' },
    { v: 'secondary', l: 'Secundario' },
  ].filter((f) => f.v === 'all' || presentTypes.has(f.v));

  return (
    <div
      role="presentation"
      onClick={(e) => { if (onClose && e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'absolute', inset: 0, zIndex: 100,
        background: 'rgba(20,1,3,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="bs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bs-title"
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-xl)',
          width: '100%', maxWidth: 720,
          maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.4rem 1.75rem 1.25rem',
          background: '#BC0613',
          flexShrink: 0,
          position: 'relative', overflow: 'hidden',
        }}>
          <div aria-hidden style={{
            position: 'absolute', top: '-50px', right: '-40px',
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,.05)', pointerEvents: 'none',
          }} />

          <div className="bs-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)', margin: '0 0 .35rem' }}>
                Explorador 3D FIE
              </p>
              <h2 id="bs-title" style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem', fontWeight: 800,
                color: '#fff', margin: '0 0 .25rem',
              }}>
                {selectedId ? 'Cambiar de edificio' : '¿Qué edificio quieres explorar?'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', margin: 0 }}>
                {buildings.length} {buildings.length === 1 ? 'edificio disponible' : 'edificios disponibles'} · elige uno para verlo en 3D
              </p>
            </div>
            {onClose && (
              <button className="bs-close" onClick={onClose} aria-label="Cerrar">
                <Icon size={14} strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12" /></Icon>
              </button>
            )}
          </div>

          {/* Búsqueda */}
          <div className="bs-search" style={{ marginTop: '1rem' }}>
            <Icon size={15}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></Icon>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código o descripción…"
              aria-label="Buscar edificio"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpiar búsqueda"
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <Icon size={13} strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12" /></Icon>
              </button>
            )}
          </div>
        </div>

        {/* Filtros por tipo */}
        {typeFilters.length > 2 && (
          <div style={{
            padding: '0.75rem 1.75rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
            background: 'var(--color-bg-soft)',
          }}>
            {typeFilters.map(({ v, l }) => (
              <button
                key={v}
                className={`bs-chip${filter === v ? ' active' : ''}`}
                onClick={() => setFilter(v)}
                aria-pressed={filter === v}
              >
                {l}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '.68rem', color: 'var(--color-text-3)', fontWeight: 600 }}>
              {filtered.length} de {buildings.length}
            </span>
          </div>
        )}

        {/* Lista de edificios */}
        <div className="bs-scroll" style={{ flex: 1, overflow: 'auto', padding: '1rem 1.25rem 1.25rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--color-text-3)' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', margin: '0 auto .75rem',
                background: 'var(--red-06)', border: '1px solid var(--red-10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)',
              }}>
                <Icon size={18}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></Icon>
              </div>
              <p style={{ margin: '0 0 .75rem', fontSize: '.85rem' }}>
                No se encontraron edificios con esa búsqueda.
              </p>
              <button className="bs-chip" onClick={() => { setSearch(''); setFilter('all'); }}>
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="bs-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '0.75rem',
            }}>
              {filtered.map((b) => (
                <BuildingOption
                  key={b.id}
                  building={b}
                  isCurrent={String(b.id) === String(selectedId)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BuildingOption({ building: b, isCurrent, onSelect }) {
  const label = TYPE_LABELS[b.type] || b.type;
  const spaces = Number(b.hotspot_count ?? b.total_hotspot_count ?? 0);
  const floors = Number(b.floor_count) || 0;
  const hasModel = Number(b.model_count ?? 0) > 0;

  return (
    <button
      type="button"
      className={`bs-card bs-sp${isCurrent ? ' is-current' : ''}`}
      onClick={() => onSelect(b)}
      aria-current={isCurrent ? 'true' : undefined}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      style={{ padding: '1rem 1.1rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: '0.55rem' }}>
        <span className={`bs-badge type-${b.type}`}>{label}</span>
        <span style={{
          fontSize: '0.68rem', color: 'var(--color-text-4)',
          fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '.06em',
        }}>
          {b.code}
        </span>
      </div>

      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.98rem', fontWeight: 700,
        color: 'var(--color-text)',
        margin: '0 0 0.3rem', lineHeight: 1.25,
      }}>
        {b.name}
      </h3>

      <p style={{
        fontSize: '0.78rem', color: 'var(--color-text-3)',
        lineHeight: 1.45, margin: 0, minHeight: '2.2em',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {b.description || 'Sin descripción registrada.'}
      </p>

      <div style={{
        marginTop: '0.75rem',
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem',
      }}>
        {floors > 0 && (
          <span className="bs-meta">
            <Icon size={11}><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14" /></Icon>
            {floors} {floors === 1 ? 'planta' : 'plantas'}
          </span>
        )}
        <span className="bs-meta">
          <Icon size={11}><circle cx="12" cy="10" r="3" /><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z" /></Icon>
          {spaces} {spaces === 1 ? 'espacio' : 'espacios'}
        </span>
        {b.has_interior && (
          <span className="bs-meta is-accent">
            <Icon size={11} strokeWidth={2.4}><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></Icon>
            Interior 3D
          </span>
        )}
        {!hasModel && <span className="bs-meta is-muted">Sin modelo 3D</span>}
        {isCurrent && (
          <span className="bs-meta is-current" style={{ marginLeft: 'auto' }}>
            <Icon size={11} strokeWidth={2.6}><path d="M20 6 9 17l-5-5" /></Icon>
            Actual
          </span>
        )}
      </div>
    </button>
  );
}
