/**
 * Explorer.jsx — GeoESPOCH 3D
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import CampusViewer3D from '../components/viewer/CampusViewer3D';
import HotspotPanel   from '../components/hotspots/HotspotPanel';
import BuildingSelector from '../components/viewer/BuildingSelector';
import { useViewerStore } from '../store/viewerStore';
import { buildingsService } from '../services/buildingsService';
import { hotspotsService }  from '../services/hotspotsService';
import { modelsService }    from '../services/modelsService';
import { isOpenNow }        from '../utils/scheduleUtils';

/* ─── Constantes ─────────────────────────────────────────────────────────── */
const SIDEBAR_W = 288;
const INTERIOR_BASE_CAMERA_NAME = 'Cam_Interior_FIE_CentroBajo';

/* ─── SVG Icons inline ───────────────────────────────────────────────────── */
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

/* ─── Hook mobile ────────────────────────────────────────────────────────── */
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

/* ─── Chip de filtro ─────────────────────────────────────────────────────── */
function FilterChip({ active, onClick, label, accent = false, iconSvg, showDot }) {
  const cls = `ex-chip${active ? (accent ? ' active-green' : ' active') : ''}`;
  return (
    <button className={cls} onClick={onClick}>
      {showDot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: active ? '#fff' : '#16a34a', display: 'inline-block',
        }} />
      )}
      {iconSvg && (
        <span style={{ lineHeight: 0, flexShrink: 0 }}
          dangerouslySetInnerHTML={{ __html: iconSvg }} />
      )}
      {label}
    </button>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function Explorer() {
  const { buildingId } = useParams();
  const navigate       = useNavigate();
  const isMobile       = useIsMobile();

  const {
    selectedBuilding, setSelectedBuilding,
    activeHotspot,    setActiveHotspot,
    hotspots,         setHotspots,
    modelLoading,     modelProgress,
    currentFloor,
    searchQuery,      setSearchQuery,
  } = useViewerStore();

  const [buildings,         setBuildings]         = useState([]);
  const [showSelector,      setShowSelector]       = useState(false);
  const [sidebarOpen,       setSidebarOpen]        = useState(true);
  const [allExteriorModels, setAllExteriorModels]  = useState([]);
  const [typeFilter,        setTypeFilter]         = useState('all');
  const [openNowOnly,       setOpenNowOnly]        = useState(false);
  const [interiorMode,      setInteriorMode]       = useState(false);
  const viewerSceneRef         = useRef(null);
  const viewerCameraCommandRef = useRef(null); // expuesto por CampusViewer3D

  const activeBuildings = useMemo(() => {
    return buildings.filter((b) =>
      b.is_active === true ||
      b.is_active === 1 ||
      b.is_active === '1' ||
      b.is_active === undefined
    );
  }, [buildings]);

  const activeExteriorModels = useMemo(() => {
    return allExteriorModels.filter((m) =>
      m.is_active === true ||
      m.is_active === 1 ||
      m.is_active === '1'
    );
  }, [allExteriorModels]);


  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);

  // ── Carga de edificios ──────────────────────────────────────────────────
  useEffect(() => {
    buildingsService.getAll()
      .then(res => setBuildings(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(console.error);
  }, []);

  // ── Resolución de buildingId desde URL ─────────────────────────────────
  useEffect(() => {
    if (!activeBuildings.length) return;

    if (buildingId) {
      const found = activeBuildings.find(
        b => String(b.id) === String(buildingId)
      );

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
      const stillExists = activeBuildings.find(
        b => String(b.id) === String(selectedBuilding.id)
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
  }, [
    activeBuildings,
    buildingId,
    selectedBuilding,
    setSelectedBuilding,
    navigate,
  ]);

  // ── Carga de modelos 3D activos ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    modelsService.getAllActive()
      .then(data => {
        if (!cancelled) setAllExteriorModels(data);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Info del modelo del edificio seleccionado ───────────────────────────
  const modelInfo = selectedBuilding
    ? activeExteriorModels.find(m => String(m.building_id) === String(selectedBuilding.id)) ?? null
    : null;

  // ── Hotspots del edificio seleccionado ──────────────────────────────────
  useEffect(() => {
    if (!selectedBuilding) return;
    setTypeFilter('all');
    setOpenNowOnly(false);
    setSearchQuery('');
    const params = { building_id: selectedBuilding.id };
    hotspotsService.getAll(params)
      .then(res => setHotspots(Array.isArray(res) ? res : (res?.data ?? [])))
      .catch(() => setHotspots([]));
  }, [selectedBuilding, currentFloor, setHotspots]);

  // ── Filtrado de hotspots ────────────────────────────────────────────────
  const filteredHotspots = hotspots
    .filter(h => typeFilter === 'all' || h.type === typeFilter)
    .filter(h => !openNowOnly || isOpenNow(h.schedule) === true)
    .filter(h => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return h.name?.toLowerCase().includes(q)
        || h.description?.toLowerCase().includes(q)
        || h.teacher?.toLowerCase().includes(q);
    });

  const presentTypes = [...new Set(hotspots.map(h => h.type))];
  const hasActiveFilters = typeFilter !== 'all' || openNowOnly || !!searchQuery;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSelectBuilding = useCallback((b) => {
    setSelectedBuilding(b);
    setShowSelector(false);
    setActiveHotspot(null);
    navigate(`/explorar/${b.id}`, { replace: true });
    if (isMobile) setSidebarOpen(false);
  }, [setSelectedBuilding, setActiveHotspot, navigate, isMobile]);

  /** Anima la cámara principal hacia un objeto cámara marcadora del GLB */
  const flyToMarkerCamera = useCallback((markerCam) => {
    if (!markerCam) return;

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();

    markerCam.getWorldPosition(worldPos);
    markerCam.getWorldQuaternion(worldQuat);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat);
    const lookTarget = worldPos.clone().add(forward);

    viewerCameraCommandRef.current?.moveTo?.(
      worldPos.toArray(),
      lookTarget.toArray(),
      worldQuat
    );
  }, []);

  /** Regresa a la cámara base del modo interior y cierra el foco de hotspot */
  const flyToInteriorBaseCamera = useCallback(() => {
    if (!selectedBuilding) return;

    const markerCam = viewerSceneRef.current?.getObjectByName(
      INTERIOR_BASE_CAMERA_NAME
    );

    if (markerCam) {
      flyToMarkerCamera(markerCam);
      return;
    }

    const ox = parseFloat(selectedBuilding.offset_x) || 0;
    const oz = parseFloat(selectedBuilding.offset_z) || 0;

    const cx = parseFloat(selectedBuilding.interior_cam_x) || 0;
    const cy = parseFloat(selectedBuilding.interior_cam_y) || 8;
    const cz = parseFloat(selectedBuilding.interior_cam_z) || 15;

    const tx = parseFloat(selectedBuilding.interior_target_x) || 0;
    const ty = parseFloat(selectedBuilding.interior_target_y) || 2;
    const tz = parseFloat(selectedBuilding.interior_target_z) || 0;

    viewerCameraCommandRef.current?.moveTo?.(
      [ox + cx, cy, oz + cz],
      [ox + tx, ty, oz + tz]
    );
  }, [
    selectedBuilding,
    flyToMarkerCamera,
  ]);

  const handleHotspotClick = useCallback((hs) => {
    const isSameHotspot =
      activeHotspot?.id &&
      hs?.id &&
      String(activeHotspot.id) === String(hs.id);

    if (
      isSameHotspot &&
      interiorMode &&
      selectedBuilding?.has_interior
    ) {
      setActiveHotspot(null);

      if (isMobile) {
        setSidebarOpen(false);
      }

      flyToInteriorBaseCamera();
      return;
    }

    setActiveHotspot(hs);

    if (isMobile) {
      setSidebarOpen(false);
    }

    if (
      interiorMode &&
      selectedBuilding?.has_interior &&
      viewerSceneRef.current
    ) {
      if (hs.camera_reference) {
        const markerCam = viewerSceneRef.current.getObjectByName(
          hs.camera_reference
        );

        if (markerCam) {
          flyToMarkerCamera(markerCam);
          return;
        }
      }

      const interiorCams = [];

      viewerSceneRef.current.traverse(obj => {
        if (obj.name?.startsWith('Cam_Interior_')) {
          interiorCams.push(obj);
        }
      });

      if (interiorCams.length > 0) {
        flyToMarkerCamera(interiorCams[0]);
      }
    }
  }, [
    activeHotspot,
    setActiveHotspot,
    isMobile,
    interiorMode,
    selectedBuilding,
    flyToMarkerCamera,
    flyToInteriorBaseCamera,
  ]);

  /**
   * handleMeshClick — llamado desde CampusViewer3D cuando el usuario hace clic
   * en una malla del GLB mientras está en modo interior.
   *
   * Lógica multinivel:
   *  - Escenario A (exterior): nunca llega aquí — CampusViewer3D emite onBuildingClick
   *  - Escenario B (interior): busca el hotspot cuyo `mesh_name` coincide con meshName,
   *    abre su panel Y anima la cámara a la cámara marcadora Cam_Interior_* más cercana.
   */
  /**
   * handleMeshClick — clic en malla GLB en modo interior.
   *
   * Lógica de Mapeo Espacial (Camino A):
   *  1. Busca el hotspot cuyo mesh_name coincide con la malla clicada.
   *  2. Si el hotspot tiene camera_reference en BD → flyTo a esa cámara exacta.
   *  3. Si camera_reference es NULL → busca la cámara Cam_Interior_* más cercana (fallback).
   *  4. Si no hay cámaras interiores → solo abre el panel sin mover la cámara.
   */
  const handleMeshClick = useCallback((meshName) => {
    if (!meshName || !selectedBuilding) return;

    const hs = hotspots.find(h =>
      h.mesh_name === meshName ||
      h.name === meshName ||
      meshName.toLowerCase().includes(h.name?.toLowerCase())
    );

    if (!hs) return;

    const isSameHotspot =
      activeHotspot?.id &&
      hs?.id &&
      String(activeHotspot.id) === String(hs.id);

    if (
      isSameHotspot &&
      interiorMode &&
      selectedBuilding?.has_interior
    ) {
      setActiveHotspot(null);

      if (isMobile) {
        setSidebarOpen(false);
      }

      flyToInteriorBaseCamera();
      return;
    }

    setActiveHotspot(hs);

    if (isMobile) {
      setSidebarOpen(false);
    }

    if (
      !interiorMode ||
      !selectedBuilding.has_interior ||
      !viewerSceneRef.current
    ) {
      return;
    }

    const targetCamName = hs.camera_reference || null;

    if (!targetCamName) return;

    const markerCam = viewerSceneRef.current.getObjectByName(targetCamName);

    if (markerCam) {
      flyToMarkerCamera(markerCam);
    }
  }, [
    selectedBuilding,
    hotspots,
    activeHotspot,
    interiorMode,
    isMobile,
    setActiveHotspot,
    flyToMarkerCamera,
    flyToInteriorBaseCamera,
  ]);

  /* ──────────────────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────────────────── */
  return (
    <div className="fie-explorer" style={{
      position: 'fixed', inset: 0, top: 'var(--nav-h)',
      overflow: 'hidden',
    }}>

      {/* ── VISOR 3D (reemplaza MapboxViewer) ─────────────────────── */}
      <CampusViewer3D
        allModels={activeExteriorModels}
        buildings={activeBuildings}
        building={selectedBuilding}
        onBuildingClick={handleSelectBuilding}
        onMeshClick={handleMeshClick}
        onInteriorModeChange={entering => {
          setInteriorMode(entering);
          if (!entering) setActiveHotspot(null);
        }}
        onSceneReady={s => { viewerSceneRef.current = s; }}
        onCameraCommandReady={ref => { viewerCameraCommandRef.current = ref; }}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        onRequestChangeBuilding={() => setShowSelector(true)}
      />

      {/* ── BACKDROP ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'absolute', inset: 0,
            background: isMobile ? 'rgba(20,1,3,0.45)' : 'transparent',
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
        background: 'var(--cream, #FDFAF9)',
        borderRight: '1px solid var(--rule)',
        display: 'flex', flexDirection: 'column',
        boxShadow: sidebarOpen ? '4px 0 32px rgba(188,6,19,.08)' : 'none',
        fontFamily: 'var(--font-body)',
      }}>

        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          background: 'var(--red, #BC0613)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '.35rem',
              marginBottom: '.35rem',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,.7)', display: 'block' }} />
              <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.65)' }}>
                GeoESPOCH 3D
              </span>
            </div>
            <h2 style={{
              fontWeight: 800, fontSize: '.95rem', letterSpacing: '-.02em',
              color: '#fff', margin: 0, lineHeight: 1.2,
            }}>Campus ESPOCH</h2>
            <p style={{ fontSize: '.68rem', fontWeight: 300, color: 'rgba(255,255,255,.55)', margin: '2px 0 0' }}>
              Riobamba · Ecuador
            </p>
          </div>
        </div>

        {/* Edificio activo */}
        {selectedBuilding ? (
          <div style={{
            padding: '.85rem 1.25rem',
            borderBottom: '1px solid var(--rule)',
            background: '#fff',
            flexShrink: 0,
          }}>
            <p style={{
              fontSize: '.6rem', fontWeight: 700,
              color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.12em',
              margin: '0 0 .3rem',
            }}>Edificio activo</p>
            <p style={{
              fontWeight: 800, fontSize: '.95rem', color: 'var(--ink-dark)',
              margin: 0, lineHeight: 1.25, letterSpacing: '-.01em',
            }}>{selectedBuilding.name}</p>
            <p style={{ fontSize: '.7rem', fontWeight: 400, color: 'var(--ink)', margin: '2px 0 0' }}>
              {selectedBuilding.code}
              {selectedBuilding.floor_count
                ? ` · ${selectedBuilding.floor_count} ${selectedBuilding.floor_count === 1 ? 'planta' : 'plantas'}`
                : ''}
            </p>

            {/* Estado modelo */}
            <div style={{
              marginTop: '.55rem', fontSize: '.68rem', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {modelLoading ? (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', display: 'block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--ink)' }}>Cargando… {modelProgress}%</span>
                </>
              ) : modelInfo ? (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--ink)' }}>
                    LOD {modelInfo.lod_level}
                    {modelInfo.file_size_mb ? ` · ${modelInfo.file_size_mb} MB` : ''}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', display: 'block', flexShrink: 0 }} />
                  <span style={{ color: 'var(--ink)' }}>Sin modelo — placeholder 3D</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            padding: '1.5rem 1.25rem', textAlign: 'center',
            borderBottom: '1px solid var(--rule)', flexShrink: 0,
            background: '#fff',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--red-06)', border: '1px solid var(--red-10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--red)', margin: '0 auto .65rem',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9" />
              </svg>
            </div>
            <p style={{
              fontSize: '.8rem', fontWeight: 400, color: 'var(--ink)',
              lineHeight: 1.6, margin: 0,
            }}>
              Selecciona un edificio para explorarlo en el visor 3D.
            </p>
          </div>
        )}

        {/* Lista hotspots */}
        <div className="ex-scroll" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {hotspots.length > 0 && (
            <>
              {/* Barra de búsqueda */}
              <div style={{ padding: '.65rem .75rem .35rem', flexShrink: 0 }}>
                <div className="ex-search">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round"
                    style={{ opacity: .5, flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Nombre, docente…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--red)', padding: 0, lineHeight: 1,
                        display: 'flex', alignItems: 'center', opacity: .6,
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Filtros */}
              {(presentTypes.length > 1 || hotspots.some(h => h.schedule)) && (
                <div style={{
                  padding: '.35rem .75rem .6rem',
                  borderBottom: '1px solid var(--rule)',
                  flexShrink: 0,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: '.4rem',
                  }}>
                    <span style={{
                      fontSize: '.6rem', fontWeight: 700, letterSpacing: '.12em',
                      textTransform: 'uppercase', color: 'var(--ink)',
                    }}>Filtros</span>
                    {hasActiveFilters && (
                      <button
                        onClick={() => { setTypeFilter('all'); setOpenNowOnly(false); setSearchQuery(''); }}
                        style={{
                          fontSize: '.62rem', fontWeight: 700,
                          color: 'var(--red)', background: 'none',
                          border: 'none', cursor: 'pointer', padding: 0,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {presentTypes.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: hotspots.some(h => h.schedule) ? '.4rem' : 0 }}>
                      <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} label="Todos" />
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

                  {hotspots.some(h => h.schedule) && (
                    <FilterChip
                      active={openNowOnly}
                      onClick={() => setOpenNowOnly(o => !o)}
                      label="Abierto ahora"
                      showDot accent
                    />
                  )}
                </div>
              )}

              {/* Encabezado contador */}
              <div style={{
                padding: '.5rem 1.1rem .3rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <span style={{
                  fontSize: '.6rem', fontWeight: 700, letterSpacing: '.12em',
                  textTransform: 'uppercase', color: 'var(--ink)',
                }}>Puntos de interés</span>
                <span style={{
                  fontSize: '.62rem', fontWeight: 700,
                  color: 'var(--red)', background: 'var(--red-06)',
                  padding: '.1rem .45rem', borderRadius: '999px',
                  border: '1px solid var(--red-10)',
                }}>
                  {filteredHotspots.length}/{hotspots.length}
                </span>
              </div>
            </>
          )}

          {/* Items */}
          <div style={{ padding: '0 .6rem .75rem', flex: 1 }}>
            {filteredHotspots.length === 0 && hotspots.length > 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <p style={{ fontSize: '.78rem', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
                  Sin {TYPE_LABELS[typeFilter]?.toLowerCase() || 'resultados'} en este edificio.
                </p>
              </div>
            )}

            {filteredHotspots.map((h, i) => (
              <button
                key={h.id}
                className={`ex-hs-row ex-sidebar-item${activeHotspot?.id === h.id ? ' active' : ''}`}
                style={{ '--i': i }}
                onClick={() => handleHotspotClick(h)}
              >
                <span
                  style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                    background: activeHotspot?.id === h.id ? 'var(--red-10)' : 'var(--red-06)',
                    border: `1px solid ${activeHotspot?.id === h.id ? 'var(--red-20)' : 'var(--red-10)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--red)',
                  }}
                  dangerouslySetInnerHTML={{ __html: TYPE_ICONS_SVG[h.type] || TYPE_ICONS_SVG.service }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    fontWeight: 700, fontSize: '.8rem',
                    color: activeHotspot?.id === h.id ? 'var(--red)' : 'var(--ink-dark)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    margin: 0, letterSpacing: '-.01em',
                  }}>{h.name}</p>
                  <p style={{
                    fontSize: '.67rem', fontWeight: 400,
                    color: 'var(--ink)', margin: 0, lineHeight: 1.4,
                  }}>
                    Piso {h.floor}
                    {h.teacher ? ` · ${h.teacher.split(' ').slice(-1)[0]}` : ''}
                  </p>
                </div>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round"
                  style={{ flexShrink: 0, opacity: .4 }}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}

            {selectedBuilding && hotspots.length === 0 && !modelLoading && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <p style={{ fontSize: '.78rem', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
                  Sin hotspots registrados.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cambiar edificio */}
        <div style={{ padding: '.65rem .75rem', borderTop: '1px solid var(--rule)', flexShrink: 0, background: '#fff' }}>
          <button className="ex-change-btn" onClick={() => setShowSelector(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            Cambiar edificio
          </button>
        </div>
      </aside>

      {/* ── BOTÓN TOGGLE ─────────────────────────────────────────────── */}
      <button
        className="ex-toggle"
        onClick={() => setSidebarOpen(p => !p)}
        title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}
        style={{
          position: 'absolute',
          left: sidebarOpen
            ? (isMobile ? SIDEBAR_W - 44 : SIDEBAR_W + 8)
            : 12,
          top: 12, zIndex: 31,
          transition: 'left 300ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6"  x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <HotspotPanel />
      {showSelector && (
        <BuildingSelector
          buildings={activeBuildings}
          onSelect={handleSelectBuilding}
          onClose={selectedBuilding ? () => setShowSelector(false) : null}
        />
      )}
    </div>
  );
}