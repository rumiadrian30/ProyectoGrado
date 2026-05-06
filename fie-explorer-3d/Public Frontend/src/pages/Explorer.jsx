import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Viewer3D from '../components/viewer/Viewer3D';
import HotspotPanel from '../components/hotspots/HotspotPanel';
import BuildingSelector from '../components/viewer/BuildingSelector';
import ViewerControls from '../components/viewer/ViewerControls';
import MiniMap from '../components/minimap/MiniMap';
import { useViewerStore } from '../store/viewerStore';
import { buildingsService } from '../services/buildingsService';
import { hotspotsService } from '../services/hotspotsService';
import { modelsService } from '../services/modelsService';

export default function Explorer() {
  const { buildingId } = useParams();
  const navigate = useNavigate();

  const {
    selectedBuilding, setSelectedBuilding,
    activeHotspot, setActiveHotspot,
    hotspots, setHotspots,
    modelLoading, modelProgress,
    viewMode, setViewMode,
    currentFloor,
  } = useViewerStore();

  const [buildings,     setBuildings]     = useState([]);
  const [showSelector,  setShowSelector]  = useState(!buildingId);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);

  // ── Modelo activo cargado desde la BD ──────────────────────
  const [modelPath, setModelPath] = useState(null);
  const [modelInfo, setModelInfo] = useState(null); // metadata del modelo

  /* ── Cargar lista de edificios ── */
  useEffect(() => {
    buildingsService.getAll()
      .then(res => setBuildings(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(console.error);
  }, []);

  /* ── Cargar edificio por URL param ── */
  useEffect(() => {
    if (buildingId && buildings.length) {
      const found = buildings.find(b => b.id === buildingId);
      if (found) { setSelectedBuilding(found); setShowSelector(false); }
    }
  }, [buildingId, buildings, setSelectedBuilding]);

  /* ── Cargar modelo desde la BD cuando cambia edificio o viewMode ── */
  useEffect(() => {
    if (!selectedBuilding) { setModelPath(null); setModelInfo(null); return; }

    modelsService.getActive(selectedBuilding.id, viewMode, 0)
      .then(model => {
        if (model?.file_path) {
          setModelPath(model.file_path);
          setModelInfo(model);
        } else {
          // No hay modelo registrado → visor muestra escena demo
          setModelPath(null);
          setModelInfo(null);
          console.info(
            `[Visor] Sin modelo ${viewMode} registrado para "${selectedBuilding.name}". ` +
            'Mostrando escena de demostración.'
          );
        }
      })
      .catch(() => { setModelPath(null); setModelInfo(null); });
  }, [selectedBuilding, viewMode]);

  /* ── Cargar hotspots al cambiar edificio o planta ── */
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
  }, [setSelectedBuilding, setActiveHotspot, navigate]);

  const handleHotspotClick = useCallback((hs) => {
    setActiveHotspot(hs);
  }, [setActiveHotspot]);

  return (
    <div style={{
      position: 'fixed', inset: 0, top: 'var(--nav-h)',
      display: 'flex', background: 'var(--color-bg-soft)', overflow: 'hidden',
    }}>

      {/* ── SIDEBAR IZQUIERDO ── */}
      <aside style={{
        width: sidebarOpen ? 280 : 0, minWidth: sidebarOpen ? 280 : 0,
        transition: 'all 300ms cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden', borderRight: '1px solid var(--color-border)',
        background: '#fff', display: 'flex', flexDirection: 'column', zIndex: 10,
      }}>
        <div style={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-primary)',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '0.95rem',
              fontWeight: 700, color: '#fff', letterSpacing: '-0.01em',
            }}>FIE Explorer 3D</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
              Exploración interactiva · ESPOCH
            </p>
          </div>

          {/* Edificio activo */}
          {selectedBuilding && (
            <div style={{
              padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-soft)',
              background: 'var(--color-primary-50)',
            }}>
              <p style={{
                fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-primary)',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem',
              }}>Edificio activo</p>
              <p style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.95rem', color: 'var(--color-text)',
              }}>{selectedBuilding.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '2px' }}>
                {selectedBuilding.code} · {selectedBuilding.floor_count}{' '}
                {selectedBuilding.floor_count === 1 ? 'planta' : 'plantas'}
              </p>

              {/* Info del modelo cargado */}
              {modelInfo ? (
                <div style={{
                  marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--color-text-3)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <span style={{ color: '#16a34a' }}>●</span>
                  Modelo {modelInfo.model_type} · LOD {modelInfo.lod_level}
                  {modelInfo.file_size_mb ? ` · ${modelInfo.file_size_mb} MB` : ''}
                </div>
              ) : selectedBuilding && (
                <div style={{
                  marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--color-text-3)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <span style={{ color: '#d97706' }}>●</span>
                  Sin modelo registrado — mostrando demo
                </div>
              )}
            </div>
          )}

          {/* Toggle vista exterior/interior */}
          {selectedBuilding && (
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-soft)' }}>
              <p style={{
                fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem',
              }}>Vista</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                {['exterior', 'interior'].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding: '0.5rem',
                    background: viewMode === m ? 'var(--color-primary)' : 'var(--color-bg-soft)',
                    color: viewMode === m ? '#fff' : 'var(--color-text-2)',
                    border: '1px solid',
                    borderColor: viewMode === m ? 'var(--color-primary)' : 'var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 500,
                    cursor: 'pointer', transition: 'all var(--transition)', textTransform: 'capitalize',
                  }}>
                    {m === 'exterior' ? '🏛️' : '🏠'} {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista hotspots */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
            {!selectedBuilding && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-3)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏛️</div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                  Selecciona un edificio para comenzar la exploración.
                </p>
              </div>
            )}
            {hotspots.length === 0 && selectedBuilding && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-3)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
                <p style={{ fontSize: '0.82rem' }}>Sin hotspots registrados para este edificio.</p>
              </div>
            )}
            {hotspots.map(h => (
              <HotspotListItem
                key={h.id} hotspot={h}
                active={activeHotspot?.id === h.id}
                onClick={() => setActiveHotspot(h)}
              />
            ))}
          </div>

          {/* Cambiar edificio */}
          <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <button onClick={() => setShowSelector(true)} style={{
              width: '100%', padding: '0.6rem',
              background: 'var(--color-bg-soft)', color: 'var(--color-text-2)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              Cambiar edificio
            </button>
          </div>
        </div>
      </aside>

      {/* ── ÁREA DEL VISOR ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Toggle sidebar */}
        <button onClick={() => setSidebarOpen(p => !p)}
          title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}
          style={{
            position: 'absolute', left: 12, top: 12, zIndex: 20,
            width: 36, height: 36, background: '#fff',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)', transition: 'all var(--transition)',
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#374151" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Loading overlay */}
        {modelLoading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 30,
            background: 'rgba(255,255,255,0.9)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
          }}>
            <div style={{
              width: 56, height: 56, border: '3px solid var(--color-border)',
              borderTop: '3px solid var(--color-primary)', borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
            }}/>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '1rem', color: 'var(--color-primary)',
              }}>Cargando modelo 3D</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                {modelProgress}%
              </p>
            </div>
            <div style={{
              width: 200, height: 4, background: 'var(--color-border)',
              borderRadius: 9999, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${modelProgress}%`,
                background: 'var(--color-primary)', borderRadius: 9999,
                transition: 'width 300ms ease',
              }}/>
            </div>
          </div>
        )}

        {/* Visor 3D — recibe modelPath desde la BD */}
        <Viewer3D
          modelPath={modelPath}
          hotspots={hotspots}
          onHotspotClick={handleHotspotClick}
        />

        <ViewerControls />
        <MiniMap building={selectedBuilding} hotspots={hotspots} floor={currentFloor} />

        {/* Leyenda */}
        {hotspots.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
            padding: '0.4rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center',
            fontSize: '0.72rem', color: 'var(--color-text-2)', boxShadow: 'var(--shadow-sm)',
          }}>
            {[
              { color: '#BC0613', label: 'Lab' }, { color: '#d41a2b', label: 'Oficina' },
              { color: '#16a34a', label: 'Servicio' }, { color: '#d97706', label: 'Acceso' },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}/>
                {label}
              </span>
            ))}
          </div>
        )}

        <HotspotPanel />
      </div>

      {/* Modal selector edificios */}
      {showSelector && (
        <BuildingSelector
          buildings={buildings}
          onSelect={handleSelectBuilding}
          onClose={selectedBuilding ? () => setShowSelector(false) : null}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function HotspotListItem({ hotspot: h, active, onClick }) {
  const icons = { lab: '🔬', office: '🏢', service: '⚙️', access: '🚪' };
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.65rem 0.75rem',
      background: active ? 'var(--color-primary-50)' : 'transparent',
      border: '1px solid', borderColor: active ? 'var(--color-primary-100)' : 'transparent',
      borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: '0.25rem',
      transition: 'all var(--transition)',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg-soft)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icons[h.type] || '📍'}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontWeight: 600, fontSize: '0.82rem',
          color: active ? 'var(--color-primary)' : 'var(--color-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{h.name}</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-3)' }}>Piso {h.floor}</p>
      </div>
    </button>
  );
}
