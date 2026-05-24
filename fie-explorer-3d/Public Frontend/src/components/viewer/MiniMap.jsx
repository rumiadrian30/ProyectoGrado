/**
 * MiniMap.jsx — HU-10
 * Public Frontend/src/components/viewer/MiniMap.jsx
 *
 * Mini-mapa interactivo bidireccional:
 *   · Clic en el mini-mapa  → mapa principal vuela a ese punto (flyTo)
 *   · Arrastre en mini-mapa → mapa principal sigue en tiempo real
 *   · Indicador de viewport → rectángulo que muestra el área visible del mapa principal
 *   · Dos tamaños: compacto (160×120) y expandido (260×200)
 *   · Colapsado por defecto en móvil; expandido en escritorio
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { CAMPUS_VIEW } from '../../utils/buildingCoords';

const SIZE = {
  compact:  { w: 160, h: 120 },
  expanded: { w: 260, h: 200 },
};

export default function MiniMap({ mainMap, isMobile = false }) {
  const [open,     setOpen]     = useState(!isMobile);
  const [expanded, setExpanded] = useState(false);

  const containerRef = useRef(null);
  const miniMapRef   = useRef(null);
  const markerRef    = useRef(null);
  const syncingRef   = useRef(false);
  const svgPolyRef   = useRef(null);

  const { w, h } = expanded ? SIZE.expanded : SIZE.compact;

  // ─── Dibujar rectángulo del viewport del mapa principal ─────────────────
  const drawViewport = useCallback(() => {
    const mini = miniMapRef.current;
    const poly = svgPolyRef.current;
    if (!mini || !poly || !mainMap) return;
    try {
      const b  = mainMap.getBounds();
      const corners = [
        [b.getWest(), b.getNorth()],
        [b.getEast(), b.getNorth()],
        [b.getEast(), b.getSouth()],
        [b.getWest(), b.getSouth()],
      ];
      const pts = corners.map(([lng, lat]) => {
        const pt = mini.project([lng, lat]);
        return `${pt.x},${pt.y}`;
      });
      poly.setAttribute('points', pts.join(' '));
    } catch { /* mini-mapa aún no listo */ }
  }, [mainMap]);

  // ─── Inicializar mini-mapa ───────────────────────────────────────────────
  useEffect(() => {
    if (!open || !containerRef.current || miniMapRef.current) return;

    const mini = new mapboxgl.Map({
      container:          containerRef.current,
      style:              'mapbox://styles/mapbox/light-v11',
      center:             mainMap ? mainMap.getCenter() : CAMPUS_VIEW.center,
      zoom:               Math.max(11, (mainMap?.getZoom() ?? CAMPUS_VIEW.zoom) - 2.5),
      pitch:              0,
      bearing:            0,
      interactive:        true,
      attributionControl: false,
      logoPosition: 'top-right',
    });

    // Marcador de posición actual
    const dot = document.createElement('div');
    dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#BC0613;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);pointer-events:none';
    markerRef.current = new mapboxgl.Marker({ element: dot, anchor: 'center' })
      .setLngLat(mainMap ? mainMap.getCenter() : CAMPUS_VIEW.center)
      .addTo(mini);

    // Clic → volar mapa principal a ese punto
    mini.on('click', (e) => {
      if (!mainMap) return;
      mainMap.flyTo({ center: e.lngLat, duration: 900, essential: true });
    });

    // Arrastre del mini-mapa → mapa principal sigue
    mini.on('move', () => {
      if (syncingRef.current || !mainMap) return;
      syncingRef.current = true;
      mainMap.setCenter(mini.getCenter());
      syncingRef.current = false;
    });

    // Redibujar viewport al renderizar el mini-mapa
    mini.on('render', drawViewport);

    miniMapRef.current = mini;
    return () => {
      mini.off('render', drawViewport);
      markerRef.current?.remove();
      markerRef.current = null;
      mini.remove();
      miniMapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─── Mapa principal → mini-mapa ─────────────────────────────────────────
  useEffect(() => {
    if (!mainMap || !open) return;
    const syncFromMain = () => {
      if (syncingRef.current) return;
      const mini = miniMapRef.current;
      if (!mini) return;
      const c = mainMap.getCenter();
      markerRef.current?.setLngLat(c);
      syncingRef.current = true;
      mini.setCenter(c);
      syncingRef.current = false;
      drawViewport();
    };
    const EVTS = ['move', 'zoom', 'pitch', 'bearing'];
    EVTS.forEach(e => mainMap.on(e, syncFromMain));
    syncFromMain();
    return () => EVTS.forEach(e => mainMap.off(e, syncFromMain));
  }, [mainMap, open, drawViewport]);

  // ─── Resize al cambiar tamaño ────────────────────────────────────────────
  useEffect(() => {
    miniMapRef.current?.resize();
    setTimeout(drawViewport, 220);
  }, [expanded, drawViewport]);

  const toggle   = useCallback(() => setOpen(o => !o), []);
  const toggleSz = useCallback(() => setExpanded(e => !e), []);

  return (
    <div style={{ position: 'absolute', bottom: isMobile ? 10 : 10, right: 44, zIndex: 15 }}>

      {open && (
        <div style={{
          width: w,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          marginBottom: 4,
          animation: 'miniIn .2s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.28rem 0.45rem',
            borderBottom: '1px solid var(--color-border)',
            userSelect: 'none',
          }}>
            <span style={{
              fontSize: '0.58rem', fontWeight: 700, color: 'var(--color-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>Vista general</span>

            <div style={{ display: 'flex', gap: 3 }}>
              {/* Expandir / compactar */}
              <button onClick={toggleSz}
                title={expanded ? 'Compactar' : 'Expandir'}
                aria-label={expanded ? 'Compactar mini-mapa' : 'Expandir mini-mapa'}
                style={{ width:18, height:18, border:'none', background:'transparent',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--color-text-3)', borderRadius:3, padding:0 }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--color-bg-soft)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {expanded
                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                }
              </button>

              {/* Cerrar */}
              <button onClick={toggle} title="Ocultar mini-mapa" aria-label="Cerrar mini-mapa"
                style={{ width:18, height:18, border:'none', background:'transparent',
                  cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--color-text-3)', borderRadius:3, padding:0 }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--color-bg-soft)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Mapa + overlay */}
          <div style={{ position: 'relative', width: w, height: h }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* Rectángulo de viewport */}
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
              <polygon
                ref={svgPolyRef}
                points=""
                fill="rgba(188,6,19,0.07)"
                stroke="#BC0613"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            </svg>

            {/* Hint */}
            <div style={{
              position:'absolute', bottom:4, left:'50%', transform:'translateX(-50%)',
              fontSize:'0.52rem', background:'rgba(255,255,255,0.88)', backdropFilter:'blur(4px)',
              padding:'1px 6px', borderRadius:99, color:'var(--color-text-3)',
              pointerEvents:'none', whiteSpace:'nowrap',
            }}>
              Clic para ir · Arrastra para explorar
            </div>
          </div>
        </div>
      )}

      {/* Botón para abrir */}
      {!open && (
        <button onClick={toggle} title="Abrir mini-mapa" aria-label="Abrir vista general"
          style={{
            width:36, height:36, background:'var(--color-bg)',
            border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)',
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'var(--shadow-sm)', color:'var(--color-text-2)',
            transition:'background var(--transition)',
          }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--color-bg-soft)'}
          onMouseLeave={e=>e.currentTarget.style.background='var(--color-bg)'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z"/>
            <path d="M9 4v13M15 7v13"/>
          </svg>
        </button>
      )}

      <style>{`
        @keyframes miniIn {
          from { opacity:0; transform:scale(0.92) translateY(6px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}