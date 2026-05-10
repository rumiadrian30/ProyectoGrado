/**
 * MapboxCampus.jsx
 *
 * Mapa interactivo 3D del campus ESPOCH usando Mapbox GL JS.
 * Funciona igual que el mapa de Lotus: solo los edificios de la institución
 * tienen modelos 3D (fill-extrusion), el resto del mapa es plano.
 *
 * Props:
 *   buildings     – lista de edificios desde la BD (para vincular click → visor 3D)
 *   onSelectBuilding – callback al hacer click en edificio FIE
 *   onClose       – callback para cerrar/volver al visor 3D
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  FIE_GEOJSON,
  OTHER_GEOJSON,
  CAMPUS_BOUNDARY,
  CAMPUS_CENTER,
} from '../../utils/campusGeoJSON';

// ─── Token Mapbox ────────────────────────────────────────────────────────────
mapboxgl.accessToken =
  'pk.eyJ1IjoicnVtaWFkcmlhbiIsImEiOiJjbW95cnd4OGwwYjViMnJwdWNtbmRvdXA0In0.is21gbSMEJTlU_wQRjgoTQ';

// ─── Constantes de diseño ────────────────────────────────────────────────────
const FIE_COLOR        = '#BC0613';  // rojo FIE
const FIE_COLOR_HOVER  = '#e8091a';
const OTHER_COLOR      = '#1e40af';  // azul oscuro otros edificios
const OTHER_COLOR_SIDE = '#1d3fa5';
const BOUNDARY_COLOR   = 'rgba(188,6,19,0.15)';
const BOUNDARY_BORDER  = '#BC0613';

// ─── Posición inicial de cámara ───────────────────────────────────────────────
const INITIAL_VIEW = {
  center: CAMPUS_CENTER,
  zoom:   16.2,
  pitch:  55,
  bearing: -20,
};

// ─── Componente ──────────────────────────────────────────────────────────────
export default function MapboxCampus({ buildings = [], onSelectBuilding, onClose }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);

  const [mapReady,      setMapReady]      = useState(false);
  const [hoveredCode,   setHoveredCode]   = useState(null);
  const [selectedCode,  setSelectedCode]  = useState(null);
  const [tooltip,       setTooltip]       = useState(null); // { x, y, label, code }
  const [is3D,          setIs3D]          = useState(true);

  // ─── Inicializar mapa ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      ...INITIAL_VIEW,
      antialias: true,
    });

    mapRef.current = map;

    // Controles de navegación (esquina inferior derecha)
    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'bottom-right',
    );

    // Geolocate (centrar en campus)
    map.addControl(
      new mapboxgl.ScaleControl({ unit: 'metric' }),
      'bottom-left',
    );

    map.on('load', () => {
      // ── 1. Configurar estilo Mapbox Standard ──────────────────────────────
      // Ocultar edificios genéricos de Mapbox en la zona del campus para que
      // no solapen nuestros modelos
      if (map.getLayer('building')) {
        map.setLayoutProperty('building', 'visibility', 'none');
      }

      // ── 2. Área del campus (relleno semitransparente + borde) ─────────────
      map.addSource('campus-boundary', {
        type: 'geojson',
        data: CAMPUS_BOUNDARY,
      });

      map.addLayer({
        id:     'campus-fill',
        type:   'fill',
        source: 'campus-boundary',
        paint: {
          'fill-color':   BOUNDARY_COLOR,
          'fill-opacity': 0.5,
        },
      });

      map.addLayer({
        id:     'campus-border',
        type:   'line',
        source: 'campus-boundary',
        paint: {
          'line-color': BOUNDARY_BORDER,
          'line-width': 2,
          'line-dasharray': [4, 2],
        },
      });

      // ── 3. Otros edificios ESPOCH (azul, menores) ─────────────────────────
      map.addSource('other-buildings', {
        type: 'geojson',
        data: OTHER_GEOJSON,
      });

      map.addLayer({
        id:     'other-extrusion',
        type:   'fill-extrusion',
        source: 'other-buildings',
        paint: {
          'fill-extrusion-color':   OTHER_COLOR,
          'fill-extrusion-height':  ['get', 'height'],
          'fill-extrusion-base':    ['get', 'base'],
          'fill-extrusion-opacity': 0.75,
          'fill-extrusion-ambient-occlusion-intensity': 0.3,
        },
      });

      // ── 4. Edificios FIE (rojo, interactivos) ────────────────────────────
      map.addSource('fie-buildings', {
        type: 'geojson',
        data: FIE_GEOJSON,
      });

      map.addLayer({
        id:     'fie-extrusion',
        type:   'fill-extrusion',
        source: 'fie-buildings',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#fff',
            ['boolean', ['feature-state', 'hover'],    false], FIE_COLOR_HOVER,
            FIE_COLOR,
          ],
          'fill-extrusion-height':  ['get', 'height'],
          'fill-extrusion-base':    ['get', 'base'],
          'fill-extrusion-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 1,
            0.92,
          ],
          'fill-extrusion-ambient-occlusion-intensity': 0.4,
        },
      });

      // Contorno del edificio seleccionado
      map.addLayer({
        id:     'fie-outline',
        type:   'line',
        source: 'fie-buildings',
        paint: {
          'line-color': '#fff',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2,
            0,
          ],
        },
      });

      // ── 5. Etiquetas de edificios FIE ────────────────────────────────────
      map.addLayer({
        id:     'fie-labels',
        type:   'symbol',
        source: 'fie-buildings',
        layout: {
          'text-field':            ['get', 'label'],
          'text-font':             ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size':             11,
          'text-anchor':           'center',
          'text-allow-overlap':    false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color':       '#fff',
          'text-halo-color':  FIE_COLOR,
          'text-halo-width':  1.5,
        },
      });

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Hover sobre edificios FIE ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let prevHoverId = null;

    const onMouseMove = (e) => {
      if (!e.features.length) return;
      const feat = e.features[0];
      const id   = feat.id;
      const code = feat.properties.code;

      if (prevHoverId !== null && prevHoverId !== id) {
        map.setFeatureState({ source: 'fie-buildings', id: prevHoverId }, { hover: false });
      }
      map.setFeatureState({ source: 'fie-buildings', id }, { hover: true });
      prevHoverId = id;
      setHoveredCode(code);

      // Tooltip
      const { x, y } = e.point;
      setTooltip({ x, y, label: feat.properties.label, code });
      map.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = () => {
      if (prevHoverId !== null) {
        map.setFeatureState({ source: 'fie-buildings', id: prevHoverId }, { hover: false });
        prevHoverId = null;
      }
      setHoveredCode(null);
      setTooltip(null);
      map.getCanvas().style.cursor = '';
    };

    map.on('mousemove', 'fie-extrusion', onMouseMove);
    map.on('mouseleave', 'fie-extrusion', onMouseLeave);

    return () => {
      map.off('mousemove', 'fie-extrusion', onMouseMove);
      map.off('mouseleave', 'fie-extrusion', onMouseLeave);
    };
  }, [mapReady]);

  // ─── Click sobre edificio FIE ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let prevSelectedId = null;

    const onClick = (e) => {
      if (!e.features.length) return;
      const feat = e.features[0];
      const id   = feat.id;
      const code = feat.properties.code;

      // Deselect anterior
      if (prevSelectedId !== null) {
        map.setFeatureState({ source: 'fie-buildings', id: prevSelectedId }, { selected: false });
      }
      map.setFeatureState({ source: 'fie-buildings', id }, { selected: true });
      prevSelectedId = id;
      setSelectedCode(code);

      // Volar al edificio
      map.flyTo({
        center: e.lngLat,
        zoom:   17.5,
        pitch:  60,
        speed:  0.8,
        essential: true,
      });

      // Buscar en la lista de edificios de la BD por code
      const dbBuilding = buildings.find(
        (b) => b.code === code || b.name?.toLowerCase().includes(feat.properties.label.toLowerCase().slice(0, 8)),
      );
      if (dbBuilding && onSelectBuilding) {
        onSelectBuilding(dbBuilding);
      }
    };

    map.on('click', 'fie-extrusion', onClick);
    return () => map.off('click', 'fie-extrusion', onClick);
  }, [mapReady, buildings, onSelectBuilding]);

  // ─── Toggle 2D / 3D ──────────────────────────────────────────────────────
  const toggle3D = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const next = !is3D;
    map.easeTo({
      pitch:  next ? 55 : 0,
      bearing: next ? -20 : 0,
      duration: 800,
    });
    setIs3D(next);
  }, [is3D]);

  // ─── Volver a vista completa del campus ──────────────────────────────────
  const flyToCampus = useCallback(() => {
    mapRef.current?.flyTo({ ...INITIAL_VIEW, duration: 1000, essential: true });
  }, []);

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* Mapa */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Tooltip hover */}
      {tooltip && (
        <div
          style={{
            position:    'absolute',
            left:         tooltip.x + 12,
            top:          tooltip.y - 40,
            pointerEvents:'none',
            background:  'rgba(0,0,0,0.82)',
            color:        '#fff',
            padding:     '0.4rem 0.75rem',
            borderRadius: 8,
            fontSize:    '0.78rem',
            fontWeight:   600,
            whiteSpace:  'nowrap',
            backdropFilter: 'blur(4px)',
            boxShadow:   '0 2px 8px rgba(0,0,0,0.4)',
            borderLeft:  `3px solid ${FIE_COLOR}`,
            zIndex:       50,
          }}
        >
          {tooltip.label}
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            Click para explorar en 3D
          </div>
        </div>
      )}

      {/* Panel de controles flotante (arriba-derecha) */}
      <div
        style={{
          position:  'absolute',
          top:        12,
          right:      12,
          zIndex:     30,
          display:   'flex',
          flexDirection: 'column',
          gap:        6,
        }}
      >
        {/* Botón volver al visor 3D */}
        {onClose && (
          <button
            onClick={onClose}
            title="Volver al visor 3D"
            style={mapControlBtn({ color: '#fff', bg: FIE_COLOR })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12H3m0 0 7-7m-7 7 7 7"/>
            </svg>
            <span>Visor 3D</span>
          </button>
        )}

        {/* Toggle 2D / 3D */}
        <button
          onClick={toggle3D}
          title={is3D ? 'Cambiar a vista 2D' : 'Cambiar a vista 3D'}
          style={mapControlBtn({ color: is3D ? FIE_COLOR : '#374151', bg: '#fff' })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {is3D
              ? <><rect x="3" y="3" width="18" height="18" rx="2"/></>
              : <><path d="M12 3L3 9l9 6 9-6-9-6z"/><path d="M3 15l9 6 9-6"/></>
            }
          </svg>
          <span>{is3D ? '2D' : '3D'}</span>
        </button>

        {/* Centrar campus */}
        <button
          onClick={flyToCampus}
          title="Centrar en el campus"
          style={mapControlBtn({ color: '#374151', bg: '#fff' })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
          </svg>
          <span>Campus</span>
        </button>
      </div>

      {/* Leyenda inferior */}
      <div
        style={{
          position:   'absolute',
          bottom:      40,
          left:        '50%',
          transform:  'translateX(-50%)',
          zIndex:      30,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          border:     '1px solid rgba(0,0,0,0.1)',
          borderRadius: 999,
          padding:    '0.4rem 1.1rem',
          display:   'flex',
          gap:        '1.2rem',
          alignItems: 'center',
          fontSize:  '0.72rem',
          fontWeight: 600,
          color:     '#374151',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      >
        <LegendItem color={FIE_COLOR}   label="Edificios FIE" />
        <LegendItem color={OTHER_COLOR} label="Otros edificios ESPOCH" />
        <LegendItem color={BOUNDARY_BORDER} label="Campus" dashed />
      </div>

      {/* Badge "ESPOCH" arriba-izquierda */}
      <div
        style={{
          position:   'absolute',
          top:         12,
          left:        12,
          zIndex:      30,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          border:     `2px solid ${FIE_COLOR}`,
          borderRadius: 10,
          padding:    '0.5rem 0.9rem',
          boxShadow:  '0 2px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: FIE_COLOR, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          ESPOCH · FIE
        </div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111', marginTop: 1 }}>
          Campus Riobamba
        </div>
        {selectedCode && (
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: 3 }}>
            ● {FIE_GEOJSON.features.find(f => f.properties.code === selectedCode)?.properties?.label ?? selectedCode}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {!mapReady && (
        <div
          style={{
            position:   'absolute',
            inset:       0,
            background: '#f8fafc',
            display:   'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap:        12,
            zIndex:     100,
          }}
        >
          <div style={{
            width: 40, height: 40,
            border: `3px solid #e2e8f0`,
            borderTop: `3px solid ${FIE_COLOR}`,
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
          }}/>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>
            Cargando mapa del campus…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────
function mapControlBtn({ color, bg }) {
  return {
    display:       'flex',
    alignItems:    'center',
    gap:            5,
    padding:       '0.45rem 0.75rem',
    background:     bg,
    color:          color,
    border:        '1px solid rgba(0,0,0,0.12)',
    borderRadius:   8,
    fontSize:      '0.75rem',
    fontWeight:     700,
    cursor:        'pointer',
    boxShadow:     '0 1px 6px rgba(0,0,0,0.15)',
    whiteSpace:    'nowrap',
    transition:    'all 0.2s',
    fontFamily:    'inherit',
  };
}

function LegendItem({ color, label, dashed = false }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: dashed ? 16 : 10,
          height: dashed ? 0 : 10,
          borderRadius: dashed ? 0 : '50%',
          background: dashed ? 'transparent' : color,
          border: dashed ? `2px dashed ${color}` : 'none',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}
