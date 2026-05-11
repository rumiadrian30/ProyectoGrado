import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MapboxViewer from '../components/viewer/MapboxViewer';
import HotspotPanel from '../components/hotspots/HotspotPanel';
import BuildingSelector from '../components/viewer/BuildingSelector';
import { useViewerStore } from '../store/viewerStore';
import { buildingsService } from '../services/buildingsService';
import { hotspotsService } from '../services/hotspotsService';
import { modelsService } from '../services/modelsService';

const SIDEBAR_W = 280;

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
  } = useViewerStore();

  const [buildings,    setBuildings]    = useState([]);
  const [showSelector, setShowSelector] = useState(!buildingId);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [allExteriorModels, setAllExteriorModels] = useState([]);
  const [interiorModel,     setInteriorModel]     = useState(null);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);

  useEffect(() => {
    buildingsService.getAll()
      .then(res => setBuildings(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (buildingId && buildings.length) {
      const found = buildings.find(b => b.id === buildingId);
      if (found) { setSelectedBuilding(found); setShowSelector(false); }
    }
  }, [buildingId, buildings, setSelectedBuilding]);

  // Cargar TODOS los modelos exteriores una sola vez al montar
  useEffect(() => {
    modelsService.getAllActive('exterior')
      .then(setAllExteriorModels)
      .catch(console.error);
  }, []);

  // Modelo interior: solo para el edificio seleccionado cuando se activa esa vista
  useEffect(() => {
    if (viewMode !== 'interior' || !selectedBuilding) { setInteriorModel(null); return; }
    modelsService.getActive(selectedBuilding.id, 'interior', 0)
      .then(setInteriorModel)
      .catch(() => setInteriorModel(null));
  }, [selectedBuilding, viewMode]);

  // Modelos que el visor debe renderizar en cada momento
  const modelsToShow = viewMode === 'exterior'
    ? allExteriorModels
    : (interiorModel ? [interiorModel] : []);

  // Info del modelo del edificio seleccionado (para la barra lateral)
  const modelInfo = selectedBuilding
    ? modelsToShow.find(m => m.building_id === selectedBuilding.id) ?? null
    : null;

  useEffect(() => {
    if (!selectedBuilding) return;
    const params = { building_id: selectedBuilding.id };
    if (viewMode === 'interior') params.floor = currentFloor;
    hotspotsService.getAll(params)
      .then(res => setHotspots(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(() => setHotspots([]));
  }, [selectedBuilding, currentFloor, viewMode, setHotspots]);

  const handleSelectBuilding = useCallback((b) => {
    setSelectedBuilding(b);
    setShowSelector(false);
    setActiveHotspot(null);
    navigate(`/explorar/${b.id}`, { replace: true });
    if (isMobile) setSidebarOpen(false);
  }, [setSelectedBuilding, setActiveHotspot, navigate, isMobile]);

  const handleHotspotClick = useCallback((hs) => setActiveHotspot(hs), [setActiveHotspot]);

  const TYPE_ICONS = { lab: '🔬', office: '🏢', service: '⚙️', access: '🚪' };

  return (
    /**
     * El mapa ocupa SIEMPRE el 100% del área (position: relative, flex: 1).
     * El sidebar es SIEMPRE position: absolute sobre el mapa, en ambos breakpoints.
     * Así el canvas Mapbox nunca cambia de tamaño al abrir/cerrar el panel
     * y no hay ningún flash blanco.
     */
    <div style={{
      position: 'fixed', inset: 0, top: 'var(--nav-h)',
      overflow: 'hidden',
    }}>

      {/* ── MAPA: siempre 100% del espacio disponible ────────────────────── */}
      <MapboxViewer
        allModels={modelsToShow}
        building={selectedBuilding}
        hotspots={hotspots}
        onHotspotClick={handleHotspotClick}
        isMobile={isMobile}
      />

      {/* ── BACKDROP (móvil y desktop con sidebar abierto) ───────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position:   'absolute', inset: 0,
            // En móvil backdrop oscuro; en desktop transparente para no molestar
            background:  isMobile ? 'rgba(0,0,0,0.35)' : 'transparent',
            zIndex:      29,
            // Solo bloquear clicks en móvil
            pointerEvents: isMobile ? 'auto' : 'none',
          }}
        />
      )}

      {/* ── SIDEBAR: absoluto sobre el mapa, deslizante ─────────────────── */}
      <aside
        style={{
          position:   'absolute',
          top:         0,
          left:        sidebarOpen ? 0 : -(SIDEBAR_W + 2),
          height:     '100%',
          width:       SIDEBAR_W,
          zIndex:      30,
          transition: 'left 300ms cubic-bezier(.4,0,.2,1)',
          background: 'var(--color-bg)',
          borderRight:'1px solid var(--color-border)',
          display:    'flex',
          flexDirection: 'column',
          boxShadow:  sidebarOpen ? 'var(--shadow-xl)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          padding:      '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border)',
          background:   'var(--color-primary)',
          display:      'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink:   0,
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
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              width: 30, height: 30, borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Edificio activo */}
        {selectedBuilding ? (
          <div style={{
            padding:      '0.85rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            background:   'var(--color-primary-50)',
            flexShrink:   0,
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
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏛️</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', lineHeight: 1.5, margin: 0 }}>
              Selecciona un edificio para explorarlo en el mapa 3D.
            </p>
          </div>
        )}

        {/* Toggle exterior / interior */}
        {selectedBuilding && (
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
                  padding:     '0.45rem',
                  background:  viewMode === m ? 'var(--color-primary)' : 'var(--color-bg-soft)',
                  color:       viewMode === m ? '#fff' : 'var(--color-text-2)',
                  border:      `1px solid ${viewMode === m ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  fontFamily:  'var(--font-body)', fontSize: '0.78rem', fontWeight: 600,
                  cursor:      'pointer', transition: 'all var(--transition)',
                }}>
                  {m === 'exterior' ? '🏛️' : '🏠'} {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista hotspots */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem 0.75rem' }}>
          {hotspots.length > 0 && (
            <p style={{
              fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              margin: '0.5rem 0.5rem 0.4rem',
            }}>Puntos de interés</p>
          )}
          {hotspots.map(h => (
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
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{TYPE_ICONS[h.type] || '📍'}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontWeight: 600, fontSize: '0.8rem',
                  color: activeHotspot?.id === h.id ? 'var(--color-primary)' : 'var(--color-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                }}>{h.name}</p>
                <p style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', margin: 0 }}>
                  Piso {h.floor}
                </p>
              </div>
            </button>
          ))}
          {selectedBuilding && hotspots.length === 0 && !modelLoading && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--color-text-3)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>📍</div>
              <p style={{ fontSize: '0.78rem', margin: 0 }}>Sin hotspots registrados.</p>
            </div>
          )}
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

      {/* ── BOTÓN TOGGLE (siempre visible sobre el mapa) ─────────────────── */}
      <button
        onClick={() => setSidebarOpen(p => !p)}
        title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}
        style={{
          position:   'absolute',
          // Se desplaza con el sidebar cuando está abierto en desktop
          left:        sidebarOpen && !isMobile ? SIDEBAR_W + 8 : 12,
          top:         12,
          zIndex:      31,
          width: 36,   height: 36,
          background: 'var(--color-bg)',
          border:     '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          display:    'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow:  'var(--shadow-sm)', color: 'var(--color-text-2)',
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