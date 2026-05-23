import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapboxViewer from '../components/viewer/MapboxViewer';
import HotspotPanel from '../components/hotspots/HotspotPanel';
import BuildingSelector from '../components/viewer/BuildingSelector';
import { useViewerStore } from '../store/viewerStore';
import { buildingsService } from '../services/buildingsService';
import { hotspotsService } from '../services/hotspotsService';
import { modelsService } from '../services/modelsService';
import { isOpenNow } from '../utils/scheduleUtils';
import { buildingOffsetToGPS } from '../utils/buildingCoords';

const SIDEBAR_W = 280;

// Iconos SVG inline por tipo — sin emojis, paleta corporativa
const TYPE_ICONS_SVG = {
  classroom: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/></svg>',
  lab:       '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6m-3 0v5.5L16.5 17H7.5L12 8.5V3"/><path d="M6.5 17.5h11"/></svg>',
  office:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7M7 16h4"/></svg>',
  service:   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
  access:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h6v16h-6"/><path d="M8 16l-4-4 4-4M4 12h10"/></svg>',
};

const TYPE_LABELS = {
  classroom: 'Aulas',
  lab:       'Labs',
  office:    'Oficinas',
  service:   'Servicios',
  access:    'Accesos',
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function Explorer() {
  const { buildingId } = useParams();
  const navigate       = useNavigate();
  const isMobile       = useIsMobile();

  const {
    selectedBuilding, setSelectedBuilding,
    activeHotspot,    setActiveHotspot,
    hotspots,         setHotspots,
    modelLoading,     modelProgress,
    viewMode,         setViewMode,
    currentFloor,
    searchQuery,      setSearchQuery,
  } = useViewerStore();

  const [buildings,         setBuildings]         = useState([]);
  const [showSelector,      setShowSelector]       = useState(false);
  const [sidebarOpen,       setSidebarOpen]        = useState(true);
  const [allExteriorModels, setAllExteriorModels]  = useState([]);
  const [typeFilter,        setTypeFilter]         = useState('all');
  const [openNowOnly,       setOpenNowOnly]        = useState(false);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);

  // ── Cargar edificios ──────────────────────────────────────
  useEffect(() => {
    buildingsService.getAll()
      .then(res => setBuildings(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(console.error);
  }, []);

  // ── HU-09: validar edificio restaurado desde localStorage ─
  useEffect(() => {
    if (!buildings.length) return;

    if (buildingId) {
      const found = buildings.find(b => String(b.id) === String(buildingId) && b.is_active !== false);
      if (found) {
        setSelectedBuilding(found);
        setShowSelector(false);
      } else {
        setSelectedBuilding(null);
        navigate('/explorar', { replace: true });
        setShowSelector(true);
      }
      return;
    }

    if (selectedBuilding) {
      const stillExists = buildings.find(
        b => String(b.id) === String(selectedBuilding.id) && b.is_active !== false
      );
      if (stillExists) {
        setSelectedBuilding(stillExists);
        setShowSelector(false);
        navigate(`/explorar/${stillExists.id}`, { replace: true });
      } else {
        setSelectedBuilding(null);
        setShowSelector(true);
      }
    } else {
      setShowSelector(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  // ── Cargar modelos exteriores con polling cada 10 s ─────
  // Permite que cambios de escala/rotación del admin aparezcan
  // en el visor sin recargar la página (HT-18: cambios en ≤10 s).
  useEffect(() => {
    let cancelled = false;

    function fetchModels() {
      modelsService.getAllActive('exterior')
        .then(data => { if (!cancelled) setAllExteriorModels(data); })
        .catch(console.error);
    }

    fetchModels(); // carga inicial inmediata
    const interval = setInterval(fetchModels, 10_000); // re-fetch cada 10 s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ── Modelos a renderizar (exteriores — INTERIOR_VIEW_ENABLED = false)
  const modelsToShow = allExteriorModels;

  const modelInfo = selectedBuilding
    ? modelsToShow.find(m => m.building_id === selectedBuilding.id) ?? null
    : null;

  // ── Hotspots del edificio seleccionado ────────────────────
  useEffect(() => {
    if (!selectedBuilding) return;
    setTypeFilter('all');  // resetear filtros al cambiar edificio
    setOpenNowOnly(false);
    setSearchQuery('');       // limpiar búsqueda al cambiar de edificio
    const params = { building_id: selectedBuilding.id };
    // Cuando INTERIOR_VIEW_ENABLED = true: añadir params.floor = currentFloor si viewMode === 'interior'
    hotspotsService.getAll(params)
      .then(res => setHotspots(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(() => setHotspots([]));
  }, [selectedBuilding, currentFloor, setHotspots]);

  // ── Hotspots filtrados + tipos presentes ─────────────────
  const filteredHotspots = hotspots
    .filter(h => typeFilter === 'all' || h.type === typeFilter)
    .filter(h => !openNowOnly || isOpenNow(h.schedule) === true)
    .filter(h => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        h.name?.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.teacher?.toLowerCase().includes(q)
      );
    });

  const presentTypes = [...new Set(hotspots.map(h => h.type))];

  // ── Selección de edificio ─────────────────────────────────
  const handleSelectBuilding = useCallback((b) => {
    setSelectedBuilding(b);
    setShowSelector(false);
    setActiveHotspot(null);
    navigate(`/explorar/${b.id}`, { replace: true });
    if (isMobile) setSidebarOpen(false);
  }, [setSelectedBuilding, setActiveHotspot, navigate, isMobile]);

  const handleHotspotClick = useCallback((hs) => setActiveHotspot(hs), [setActiveHotspot]);

  // ── Posición GPS de cada edificio para los building pins ────────────────
  // Combina buildings y allExteriorModels en el mismo lugar donde ambos están
  // disponibles, evitando problemas de timing y matching de IDs en MapboxViewer.
  //
  // Prioridad: model.building_offset_x/z → building.offset_x/z → 0
  // (La tabla buildings puede tener offset vacío mientras models sí lo tiene)
  const buildingsWithGPS = useMemo(() => {
    return buildings.map(b => {
      const model = allExteriorModels.find(
        m => String(m.building_id) === String(b.id)
      );
      const ox = parseFloat(model?.building_offset_x ?? b.offset_x) || 0;
      const oz = parseFloat(model?.building_offset_z ?? b.offset_z) || 0;
      return { ...b, _lngLat: buildingOffsetToGPS(ox, oz) };
    });
  }, [buildings, allExteriorModels]);

  return (
    <div style={{
      position: 'fixed', inset: 0, top: 'var(--nav-h)',
      overflow: 'hidden',
    }}>

      {/* ── MAPA ─────────────────────────────────────────────────────── */}
      <MapboxViewer
        allModels={modelsToShow}
        buildings={buildingsWithGPS}
        building={selectedBuilding}
        hotspots={selectedBuilding ? hotspots : []}
        onBuildingClick={handleSelectBuilding}
        isMobile={isMobile}
      />

      {/* ── BACKDROP ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'absolute', inset: 0,
            background: isMobile ? 'rgba(0,0,0,0.35)' : 'transparent',
            zIndex: 29,
            pointerEvents: isMobile ? 'auto' : 'none',
          }}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      <aside style={{
        position: 'absolute', top: 0,
        left: sidebarOpen ? 0 : -(SIDEBAR_W + 2),
        height: '100%', width: SIDEBAR_W,
        zIndex: 30,
        transition: 'left 300ms cubic-bezier(.4,0,.2,1)',
        background: 'var(--color-bg)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: sidebarOpen ? 'var(--shadow-xl)' : 'none',
      }}>

        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '0.95rem',
              fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', margin: 0,
            }}>FIE Explorer 3D</h2>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>
              Campus ESPOCH · Riobamba
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{
            width: 30, height: 30, borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Edificio activo */}
        {selectedBuilding ? (
          <div style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-primary-50)',
            flexShrink: 0,
          }}>
            <p style={{
              fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-primary)',
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem',
            }}>Edificio activo</p>
            <p style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.9rem', color: 'var(--color-text)', margin: 0,
            }}>{selectedBuilding.name}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-3)', margin: '2px 0 0' }}>
              {selectedBuilding.code}
              {selectedBuilding.floor_count
                ? ` · ${selectedBuilding.floor_count} ${selectedBuilding.floor_count === 1 ? 'planta' : 'plantas'}`
                : ''}
            </p>
            <div style={{
              marginTop: '0.5rem', fontSize: '0.68rem',
              display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-text-3)',
            }}>
              {modelLoading ? (
                <><span style={{ color: 'var(--color-warning)' }}>●</span> Cargando… {modelProgress}%</>
              ) : modelInfo ? (
                <><span style={{ color: 'var(--color-success)' }}>●</span>
                  Modelo {modelInfo.model_type} · LOD {modelInfo.lod_level}
                  {modelInfo.file_size_mb ? ` · ${modelInfo.file_size_mb} MB` : ''}</>
              ) : (
                <><span style={{ color: 'var(--color-warning)' }}>●</span> Sin modelo — placeholder 3D</>
              )}
            </div>
            {modelLoading && (
              <div style={{
                marginTop: '0.4rem', height: 3,
                background: 'var(--color-primary-100)',
                borderRadius: 'var(--radius-full)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${modelProgress}%`,
                  background: 'var(--color-primary)', borderRadius: 'var(--radius-full)',
                  transition: 'width 300ms ease',
                }}/>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '1.5rem 1.25rem', textAlign: 'center',
            borderBottom: '1px solid var(--color-border)', flexShrink: 0,
          }}>
            <div style={{ marginBottom: '0.5rem', color: 'var(--color-text-4)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
              </svg>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', lineHeight: 1.5, margin: 0 }}>
              Selecciona un edificio para explorarlo en el mapa 3D.
            </p>
          </div>
        )}

        {/* Toggle exterior / interior — oculto hasta implementar vista interior */}
        {false && selectedBuilding && (
          <div style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--color-border)', flexShrink: 0,
          }}>
            <p style={{
              fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem',
            }}>Vista</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {['exterior', 'interior'].map(m => (
                <button key={m} onClick={() => setViewMode(m)} style={{
                  padding: '0.45rem',
                  background: viewMode === m ? 'var(--color-primary)' : 'var(--color-bg-soft)',
                  color: viewMode === m ? '#fff' : 'var(--color-text-2)',
                  border: `1px solid ${viewMode === m ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all var(--transition)',
                }}>
                  {m === 'exterior' ? '' : ''} {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Lista hotspots ─────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {hotspots.length > 0 && (
            <>
              {/* Barra de búsqueda */}
              <div style={{ padding: '0.5rem 0.75rem 0', flexShrink: 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--color-bg-soft)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.4rem 0.65rem',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-text-3)" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, docente…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1, border: 'none', background: 'transparent',
                      fontSize: '0.78rem', color: 'var(--color-text)',
                      fontFamily: 'var(--font-body)', outline: 'none', minWidth: 0,
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar búsqueda"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-text-3)', padding: 0, lineHeight: 1,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Sistema de filtros ─────────────────────────────── */}
              {(presentTypes.length > 1 || hotspots.some(h => h.schedule)) && (
                <div style={{
                  padding: '0.5rem 0.75rem 0',
                  borderBottom: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}>
                  {/* Fila: label + contador activo */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: '0.4rem',
                  }}>
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700,
                      color: 'var(--color-text-3)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>Filtros</span>
                    {(typeFilter !== 'all' || openNowOnly || searchQuery) && (
                      <button
                        onClick={() => {
                          setTypeFilter('all');
                          setOpenNowOnly(false);
                          setSearchQuery('');
                        }}
                        style={{
                          fontSize: '0.62rem', fontWeight: 600,
                          color: 'var(--color-primary)', background: 'none',
                          border: 'none', cursor: 'pointer', padding: 0,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {/* Chips de tipo */}
                  {presentTypes.length > 1 && (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 4,
                      marginBottom: hotspots.some(h => h.schedule) ? '0.4rem' : '0.5rem',
                    }}>
                      <FilterChip
                        active={typeFilter === 'all'}
                        onClick={() => setTypeFilter('all')}
                        label="Todos"
                      />
                      {presentTypes.map(t => (
                        <FilterChip
                          key={t}
                          active={typeFilter === t}
                          onClick={() => setTypeFilter(t)}
                          label={TYPE_LABELS[t] || t}
                          iconSvg={TYPE_ICONS_SVG[t]}
                        />
                      ))}
                    </div>
                  )}

                  {/* Chip: abierto ahora */}
                  {hotspots.some(h => h.schedule) && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <FilterChip
                        active={openNowOnly}
                        onClick={() => setOpenNowOnly(o => !o)}
                        label="Abierto ahora"
                        showDot
                        accent
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Encabezado + contador */}
              <div style={{
                padding: '0.55rem 1.25rem 0.3rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <p style={{
                  fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
                }}>Puntos de interés</p>
                <span style={{
                  fontSize: '0.65rem', color: 'var(--color-text-4)',
                  background: 'var(--color-bg-soft)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-border)',
                }}>
                  {filteredHotspots.length}/{hotspots.length}
                </span>
              </div>
            </>
          )}

          {/* Items */}
          <div style={{ padding: '0 0.75rem 0.75rem', flex: 1 }}>
            {filteredHotspots.length === 0 && hotspots.length > 0 && (
              <div style={{ textAlign: 'center', padding: '1.25rem 1rem', color: 'var(--color-text-3)' }}>
                <div style={{ marginBottom: '0.4rem', color: 'var(--color-text-4)' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                <p style={{ fontSize: '0.78rem', margin: 0 }}>
                  Sin {TYPE_LABELS[typeFilter]?.toLowerCase() || 'resultados'} en este edificio.
                </p>
              </div>
            )}

            {filteredHotspots.map(h => (
              <button
                key={h.id}
                onClick={() => handleHotspotClick(h)}
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.6rem 0.75rem',
                  background: activeHotspot?.id === h.id ? 'var(--color-primary-50)' : 'transparent',
                  border: '1px solid',
                  borderColor: activeHotspot?.id === h.id ? 'var(--color-primary-100)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', marginBottom: 2,
                  transition: 'all var(--transition)', fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  if (activeHotspot?.id !== h.id)
                    e.currentTarget.style.background = 'var(--color-bg-soft)';
                }}
                onMouseLeave={e => {
                  if (activeHotspot?.id !== h.id)
                    e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                    background: activeHotspot?.id === h.id
                      ? 'var(--color-primary-100)' : 'var(--color-bg-soft)',
                    border: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: activeHotspot?.id === h.id
                      ? 'var(--color-primary)' : 'var(--color-text-3)',
                    transition: 'all var(--transition)',
                  }}
                  dangerouslySetInnerHTML={{ __html: TYPE_ICONS_SVG[h.type] || TYPE_ICONS_SVG.service }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    fontWeight: 600, fontSize: '0.8rem',
                    color: activeHotspot?.id === h.id ? 'var(--color-primary)' : 'var(--color-text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                  }}>{h.name}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', margin: 0 }}>
                    Piso {h.floor}
                    {h.teacher ? ` · ${h.teacher.split(' ').slice(-1)[0]}` : ''}
                  </p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-text-4)" strokeWidth="2" strokeLinecap="round"
                  style={{ flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}

            {selectedBuilding && hotspots.length === 0 && !modelLoading && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--color-text-3)' }}>
                <p style={{ fontSize: '0.78rem', margin: 0 }}>Sin hotspots registrados.</p>
              </div>
            )}
          </div>
        </div>

        {/* Cambiar edificio */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
          <button
            onClick={() => setShowSelector(true)}
            style={{
              width: '100%', padding: '0.55rem',
              background: 'var(--color-bg-soft)', color: 'var(--color-text-2)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-border-soft)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-soft)'; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            Cambiar edificio
          </button>
        </div>
      </aside>

      {/* ── BOTÓN TOGGLE ─────────────────────────────────────────────── */}
      <button
        onClick={() => setSidebarOpen(p => !p)}
        title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}
        style={{
          position: 'absolute',
          left: sidebarOpen && !isMobile ? SIDEBAR_W + 8 : 12,
          top: 12, zIndex: 31,
          width: 36, height: 36,
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)', color: 'var(--color-text-2)',
          transition: 'left 300ms cubic-bezier(.4,0,.2,1), background var(--transition)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-soft)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg)'; }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <HotspotPanel />

      {showSelector && (
        <BuildingSelector
          buildings={buildings}
          onSelect={handleSelectBuilding}
          onClose={selectedBuilding ? () => setShowSelector(false) : null}
        />
      )}
    </div>
  );
}

// ── Chip de filtro ────────────────────────────────────────────
function FilterChip({ active, onClick, label, accent = false, iconSvg, showDot }) {
  const activeColor = accent ? '#15803d' : 'var(--color-primary)';
  const activeBg    = accent ? '#dcfce7' : 'var(--color-primary)';
  const activeText  = accent ? '#15803d' : '#fff';
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.25rem 0.6rem',
        fontSize: '0.7rem', fontWeight: 600,
        background: active ? activeBg   : 'var(--color-bg-soft)',
        color:      active ? activeText : 'var(--color-text-3)',
        border: `1px solid ${active ? activeColor : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-full)',
        cursor: 'pointer',
        transition: 'all var(--transition)',
        fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      {showDot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: active ? activeText : '#16a34a',
          display: 'inline-block',
        }} />
      )}
      {iconSvg && (
        <span
          style={{ lineHeight: 0, flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: iconSvg }}
        />
      )}
      {label}
    </button>
  );
}