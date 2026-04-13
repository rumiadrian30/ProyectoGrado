import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../store/adminStore';
import { buildingsService } from '../services/buildingsService';
import { hotspotsService } from '../services/hotspotsService';
import { authService } from '../services/authService';

const TABS = [
  { id: 'overview',   label: 'Resumen',    icon: '📊' },
  { id: 'hotspots',   label: 'Hotspots',   icon: '📍' },
  { id: 'buildings',  label: 'Edificios',  icon: '🏛️' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAdminStore();
  const [tab, setTab] = useState('overview');
  const [buildings, setBuildings] = useState([]);
  const [hotspots, setHotspots]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showHotspotForm, setShowHotspotForm] = useState(false);
  const [editHotspot, setEditHotspot]         = useState(null);
  const [filterBuilding, setFilterBuilding]   = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bs, hs] = await Promise.all([
        buildingsService.getAll(),
        hotspotsService.getAll(),
      ]);
      setBuildings(bs);
      setHotspots(hs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    try { await authService.logout(); } catch (_) {}
    clearAuth();
    navigate('/', { replace: true });
  };

  const handleDeleteHotspot = async (id) => {
    if (!confirm('¿Eliminar este hotspot?')) return;
    await hotspotsService.remove(id);
    loadData();
  };

  const filteredHotspots = filterBuilding === 'all'
    ? hotspots
    : hotspots.filter(h => h.building_id === filterBuilding);

  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: 'var(--nav-h)',
      background: 'var(--color-bg-soft)',
    }}>

      {/* ── SIDEBAR ADMIN ── */}
      <div style={{ display: 'flex', minHeight: `calc(100vh - var(--nav-h))` }}>

        <aside style={{
          width: 240, flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid var(--color-border)',
          padding: '1.5rem 0',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Info usuario */}
          <div style={{
            padding: '0 1.25rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: '0.75rem',
          }}>
            <div style={{
              width: 40, height: 40,
              background: 'var(--color-primary)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              fontFamily: 'var(--font-display)',
              fontWeight: 700, fontSize: '1rem',
              marginBottom: '0.6rem',
            }}>
              {user?.full_name?.[0]?.toUpperCase() || 'A'}
            </div>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
              {user?.full_name}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-3)' }}>
              {user?.role === 'superadmin' ? 'Superadministrador' : 'Administrador'}
            </p>
          </div>

          {/* Tabs nav */}
          <nav style={{ flex: 1, padding: '0 0.75rem' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.6rem 0.85rem',
                background: tab === t.id ? 'var(--color-primary-50)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-2)',
                fontFamily: 'var(--font-body)',
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                marginBottom: '0.2rem',
                transition: 'all var(--transition)',
              }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </nav>

          {/* Acciones rápidas */}
          <div style={{ padding: '0.75rem' }}>
            <button onClick={() => navigate('/explorar')} style={{
              width: '100%', padding: '0.55rem',
              background: 'var(--color-primary-50)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary-100)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem', fontWeight: 500,
              cursor: 'pointer', marginBottom: '0.4rem',
            }}>🌐 Ver explorador</button>
            <button onClick={handleLogout} style={{
              width: '100%', padding: '0.55rem',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem', fontWeight: 500,
              cursor: 'pointer',
            }}>🚪 Cerrar sesión</button>
          </div>
        </aside>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>

          {/* ─────── TAB: RESUMEN ─────── */}
          {tab === 'overview' && (
            <div style={{ animation: 'fadeIn .3s ease' }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem', fontWeight: 800,
                marginBottom: '0.25rem',
              }}>Panel de gestión</h1>
              <p style={{ color: 'var(--color-text-3)', marginBottom: '2rem' }}>
                FIE Explorer 3D · ESPOCH
              </p>

              {/* Stat cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem', marginBottom: '2.5rem',
              }}>
                {[
                  { icon: '🏛️', label: 'Edificios',     value: buildings.length,    color: '#003087' },
                  { icon: '📍', label: 'Hotspots',      value: hotspots.length,     color: '#0369a1' },
                  { icon: '🔬', label: 'Labs',          value: hotspots.filter(h => h.type === 'lab').length, color: '#16a34a' },
                  { icon: '🏢', label: 'Oficinas',      value: hotspots.filter(h => h.type === 'office').length, color: '#d97706' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    padding: '1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                  }}>
                    <div style={{
                      width: 44, height: 44,
                      background: `${s.color}12`,
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', flexShrink: 0,
                    }}>{s.icon}</div>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.8rem', fontWeight: 800,
                        color: s.color, lineHeight: 1,
                      }}>{loading ? '–' : s.value}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: '2px' }}>
                        {s.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Accesos rápidos */}
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem', marginBottom: '1rem',
              }}>Acciones rápidas</h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <ActionBtn
                  icon="➕"
                  label="Nuevo hotspot"
                  onClick={() => { setEditHotspot(null); setShowHotspotForm(true); setTab('hotspots'); }}
                />
                <ActionBtn
                  icon="🔄"
                  label="Actualizar datos"
                  onClick={loadData}
                />
                <ActionBtn
                  icon="📍"
                  label="Ver hotspots"
                  onClick={() => setTab('hotspots')}
                />
              </div>
            </div>
          )}

          {/* ─────── TAB: HOTSPOTS ─────── */}
          {tab === 'hotspots' && (
            <div style={{ animation: 'fadeIn .3s ease' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
              }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
                    Hotspots
                  </h1>
                  <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
                    {filteredHotspots.length} registros
                  </p>
                </div>
                <button onClick={() => { setEditHotspot(null); setShowHotspotForm(true); }} style={{
                  padding: '0.65rem 1.25rem',
                  background: 'var(--color-primary)',
                  color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600, fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                  ➕ Nuevo hotspot
                </button>
              </div>

              {/* Filtro por edificio */}
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={filterBuilding}
                  onChange={e => setFilterBuilding(e.target.value)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    background: '#fff', cursor: 'pointer',
                  }}
                >
                  <option value="all">Todos los edificios</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Tabla */}
              <div style={{
                background: '#fff',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-soft)' }}>
                      {['Nombre', 'Tipo', 'Edificio', 'Piso', 'Posición', 'Acciones'].map(col => (
                        <th key={col} style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          fontSize: '0.72rem', fontWeight: 700,
                          color: 'var(--color-text-3)',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          borderBottom: '1px solid var(--color-border)',
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-3)' }}>
                        Cargando...
                      </td></tr>
                    ) : filteredHotspots.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-3)' }}>
                        Sin hotspots registrados.
                      </td></tr>
                    ) : filteredHotspots.map((h, i) => (
                      <tr key={h.id} style={{
                        borderBottom: i < filteredHotspots.length - 1
                          ? '1px solid var(--color-border-soft)' : 'none',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-soft)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          {h.name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <TypeBadge type={h.type} />
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--color-text-2)' }}>
                          {h.building_code}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--color-text-3)' }}>
                          {h.floor}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.72rem',
                          fontFamily: 'monospace', color: 'var(--color-text-3)' }}>
                          ({parseFloat(h.pos_x).toFixed(1)}, {parseFloat(h.pos_y).toFixed(1)}, {parseFloat(h.pos_z).toFixed(1)})
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <TblBtn onClick={() => { setEditHotspot(h); setShowHotspotForm(true); }} label="Editar" color="#0369a1"/>
                            <TblBtn onClick={() => handleDeleteHotspot(h.id)} label="Eliminar" color="#dc2626"/>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────── TAB: EDIFICIOS ─────── */}
          {tab === 'buildings' && (
            <div style={{ animation: 'fadeIn .3s ease' }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem',
              }}>Edificios</h1>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem',
              }}>
                {buildings.map(b => (
                  <div key={b.id} style={{
                    background: '#fff',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    padding: '1.25rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600, fontSize: '0.7rem',
                        color: 'var(--color-text-3)',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>{b.code}</span>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: b.is_active ? '#16a34a' : '#dc2626',
                      }}/>
                    </div>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem', fontWeight: 700,
                      marginBottom: '0.4rem',
                    }}>{b.name}</h3>
                    <p style={{
                      fontSize: '0.8rem', color: 'var(--color-text-3)',
                      lineHeight: 1.5, marginBottom: '0.75rem',
                    }}>{b.description}</p>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: '0.75rem', color: 'var(--color-text-3)',
                    }}>
                      <span>{b.floor_count} {b.floor_count === 1 ? 'planta' : 'plantas'}</span>
                      <span style={{ textTransform: 'capitalize' }}>{b.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal formulario hotspot */}
      {showHotspotForm && (
        <HotspotFormModal
          hotspot={editHotspot}
          buildings={buildings}
          onClose={() => setShowHotspotForm(false)}
          onSaved={() => { setShowHotspotForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

/* ── Sub-componentes ── */

function ActionBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.65rem 1.1rem',
      background: '#fff',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-body)',
      fontSize: '0.875rem', fontWeight: 500,
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      color: 'var(--color-text-2)',
      transition: 'all var(--transition)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-2)'; }}
    >
      {icon} {label}
    </button>
  );
}

function TblBtn({ onClick, label, color }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.25rem 0.6rem',
      background: `${color}12`,
      color,
      border: `1px solid ${color}30`,
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-body)',
      fontSize: '0.72rem', fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}>{label}</button>
  );
}

function TypeBadge({ type }) {
  const cfg = {
    lab:     { label: 'Lab',      bg: '#dde8ff', color: '#003087' },
    office:  { label: 'Oficina',  bg: '#e0f2fe', color: '#0369a1' },
    service: { label: 'Servicio', bg: '#dcfce7', color: '#16a34a' },
    access:  { label: 'Acceso',   bg: '#fef3c7', color: '#d97706' },
  };
  const c = cfg[type] || cfg.lab;
  return (
    <span style={{
      padding: '0.2rem 0.55rem',
      background: c.bg, color: c.color,
      borderRadius: 'var(--radius-full)',
      fontSize: '0.68rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{c.label}</span>
  );
}

/* ── Formulario modal hotspot ── */
function HotspotFormModal({ hotspot, buildings, onClose, onSaved }) {
  const isEdit = !!hotspot;
  const [form, setForm] = useState({
    building_id: hotspot?.building_id || (buildings[0]?.id || ''),
    name: hotspot?.name || '',
    description: hotspot?.description || '',
    type: hotspot?.type || 'lab',
    floor: hotspot?.floor || 1,
    pos_x: hotspot?.pos_x || 0,
    pos_y: hotspot?.pos_y || 0,
    pos_z: hotspot?.pos_z || 0,
    schedule: hotspot?.schedule || '',
    equipment: hotspot?.equipment || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await hotspotsService.update(hotspot.id, form);
      } else {
        await hotspotsService.create(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = 'text', opts = {}) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600,
        color: 'var(--color-text-2)', marginBottom: '0.35rem' }}>{label}</label>
      <input
        type={type} value={form[key]}
        onChange={e => handleChange(key, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        required={opts.required}
        placeholder={opts.placeholder}
        style={{
          width: '100%', padding: '0.6rem 0.85rem',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)', fontSize: '0.875rem',
          background: '#fff',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
        onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
      />
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-xl)',
        width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: 'var(--shadow-xl)',
        animation: 'scaleIn .2s ease',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700 }}>
            {isEdit ? 'Editar hotspot' : 'Nuevo hotspot'}
          </h2>
          <button onClick={onClose} style={{
            width: 30, height: 30, background: 'var(--color-bg-soft)',
            border: 'none', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
            color: 'var(--color-text-2)',
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              padding: '0.7rem 1rem', background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 'var(--radius-md)',
              color: '#dc2626', fontSize: '0.82rem', marginBottom: '1rem',
            }}>⚠️ {error}</div>
          )}

          {/* Edificio */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600,
              color: 'var(--color-text-2)', marginBottom: '0.35rem' }}>Edificio</label>
            <select value={form.building_id} onChange={e => handleChange('building_id', e.target.value)}
              style={{
                width: '100%', padding: '0.6rem 0.85rem',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                background: '#fff',
              }}>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {field('Nombre del hotspot', 'name', 'text', { required: true, placeholder: 'Ej: Laboratorio de Redes' })}

          {/* Descripción */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600,
              color: 'var(--color-text-2)', marginBottom: '0.35rem' }}>Descripción</label>
            <textarea value={form.description} onChange={e => handleChange('description', e.target.value)}
              rows={3} placeholder="Descripción del espacio..."
              style={{
                width: '100%', padding: '0.6rem 0.85rem',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                resize: 'vertical',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
            />
          </div>

          {/* Tipo y Piso */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600,
                color: 'var(--color-text-2)', marginBottom: '0.35rem' }}>Tipo</label>
              <select value={form.type} onChange={e => handleChange('type', e.target.value)}
                style={{
                  width: '100%', padding: '0.6rem 0.85rem',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                  background: '#fff',
                }}>
                <option value="lab">Laboratorio</option>
                <option value="office">Oficina</option>
                <option value="service">Servicio</option>
                <option value="access">Acceso</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600,
                color: 'var(--color-text-2)', marginBottom: '0.35rem' }}>Piso</label>
              <input type="number" min="0" value={form.floor}
                onChange={e => handleChange('floor', parseInt(e.target.value))}
                style={{
                  width: '100%', padding: '0.6rem 0.85rem',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                }}/>
            </div>
          </div>

          {/* Coordenadas 3D */}
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-3)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>
            Coordenadas 3D (Three.js)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            {['pos_x', 'pos_y', 'pos_z'].map(k => (
              <div key={k}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600,
                  color: 'var(--color-text-2)', marginBottom: '0.25rem' }}>
                  {k.split('_')[1].toUpperCase()}
                </label>
                <input type="number" step="0.1" value={form[k]}
                  onChange={e => handleChange(k, parseFloat(e.target.value))}
                  style={{
                    width: '100%', padding: '0.5rem 0.6rem',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'monospace', fontSize: '0.875rem',
                  }}/>
              </div>
            ))}
          </div>

          {field('Horario', 'schedule', 'text', { placeholder: 'Ej: Lun-Vie 8:00-18:00' })}
          {field('Equipamiento', 'equipment', 'text', { placeholder: 'Ej: 30 PCs, proyector, router Cisco...' })}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{
              padding: '0.65rem 1.25rem',
              background: 'var(--color-bg-soft)',
              color: 'var(--color-text-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.875rem',
              cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              padding: '0.65rem 1.5rem',
              background: saving ? 'var(--color-border)' : 'var(--color-primary)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear hotspot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
