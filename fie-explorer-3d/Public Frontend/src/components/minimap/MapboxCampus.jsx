/**
 * MapboxCampus.jsx
 *
 * Mapa interactivo 3D del campus ESPOCH usando Mapbox GL JS.
 * El token se lee desde la variable de entorno VITE_MAPBOX_TOKEN
 * (definida en Public Frontend/.env) — nunca hardcodeado en el código.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  FIE_GEOJSON,
  OTHER_GEOJSON,
  CAMPUS_BOUNDARY,
  CAMPUS_CENTER,
} from '../../utils/campusGeoJSON';

// ─── Token desde variable de entorno ─────────────────────────────────────────
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// ─── Constantes de diseño ─────────────────────────────────────────────────────
const FIE_COLOR        = '#BC0613';
const FIE_COLOR_HOVER  = '#e8091a';
const OTHER_COLOR      = '#1e40af';
const BOUNDARY_COLOR   = 'rgba(188,6,19,0.15)';
const BOUNDARY_BORDER  = '#BC0613';

const INITIAL_VIEW = { center: CAMPUS_CENTER, zoom: 16.2, pitch: 55, bearing: -20 };

export default function MapboxCampus({ buildings = [], onSelectBuilding, onClose }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);

  const [mapReady,     setMapReady]     = useState(false);
  const [hoveredCode,  setHoveredCode]  = useState(null);
  const [selectedCode, setSelectedCode] = useState(null);
  const [tooltip,      setTooltip]      = useState(null);
  const [is3D,         setIs3D]         = useState(true);
  const [tokenError,   setTokenError]   = useState(false);

  // Detectar token ausente antes de intentar cargar el mapa
  useEffect(() => {
    if (!import.meta.env.VITE_MAPBOX_TOKEN) {
      console.error('[MapboxCampus] VITE_MAPBOX_TOKEN no está definido en .env');
      setTokenError(true);
    }
  }, []);

  // ─── Inicializar mapa ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || tokenError) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:     'mapbox://styles/mapbox/standard',
      ...INITIAL_VIEW,
      antialias: true,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      if (map.getLayer('building')) map.setLayoutProperty('building', 'visibility', 'none');

      map.addSource('campus-boundary', { type: 'geojson', data: CAMPUS_BOUNDARY });
      map.addLayer({ id: 'campus-fill',   type: 'fill', source: 'campus-boundary',
        paint: { 'fill-color': BOUNDARY_COLOR, 'fill-opacity': 0.5 } });
      map.addLayer({ id: 'campus-border', type: 'line', source: 'campus-boundary',
        paint: { 'line-color': BOUNDARY_BORDER, 'line-width': 2, 'line-dasharray': [4, 2] } });

      map.addSource('other-buildings', { type: 'geojson', data: OTHER_GEOJSON });
      map.addLayer({ id: 'other-extrusion', type: 'fill-extrusion', source: 'other-buildings',
        paint: {
          'fill-extrusion-color':   OTHER_COLOR,
          'fill-extrusion-height':  ['get', 'height'],
          'fill-extrusion-base':    ['get', 'base'],
          'fill-extrusion-opacity': 0.75,
          'fill-extrusion-ambient-occlusion-intensity': 0.3,
        },
      });

      map.addSource('fie-buildings', { type: 'geojson', data: FIE_GEOJSON });
      map.addLayer({ id: 'fie-extrusion', type: 'fill-extrusion', source: 'fie-buildings',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], '#fff',
            ['boolean', ['feature-state', 'hover'],    false], FIE_COLOR_HOVER,
            FIE_COLOR,
          ],
          'fill-extrusion-height':  ['get', 'height'],
          'fill-extrusion-base':    ['get', 'base'],
          'fill-extrusion-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0.92],
          'fill-extrusion-ambient-occlusion-intensity': 0.4,
        },
      });
      map.addLayer({ id: 'fie-outline', type: 'line', source: 'fie-buildings',
        paint: {
          'line-color': '#fff',
          'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2, 0],
        },
      });
      map.addLayer({ id: 'fie-labels', type: 'symbol', source: 'fie-buildings',
        layout: {
          'text-field':         ['get', 'label'],
          'text-font':          ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size':          11,
          'text-anchor':        'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color':      '#fff',
          'text-halo-color': FIE_COLOR,
          'text-halo-width': 1.5,
        },
      });

      setMapReady(true);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [tokenError]);

  // ─── Hover ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let prevId = null;

    const onMove = (e) => {
      if (!e.features.length) return;
      const feat = e.features[0];
      if (prevId !== null && prevId !== feat.id)
        map.setFeatureState({ source: 'fie-buildings', id: prevId }, { hover: false });
      map.setFeatureState({ source: 'fie-buildings', id: feat.id }, { hover: true });
      prevId = feat.id;
      setHoveredCode(feat.properties.code);
      setTooltip({ x: e.point.x, y: e.point.y, label: feat.properties.label, code: feat.properties.code });
      map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      if (prevId !== null) {
        map.setFeatureState({ source: 'fie-buildings', id: prevId }, { hover: false });
        prevId = null;
      }
      setHoveredCode(null);
      setTooltip(null);
      map.getCanvas().style.cursor = '';
    };

    map.on('mousemove', 'fie-extrusion', onMove);
    map.on('mouseleave', 'fie-extrusion', onLeave);
    return () => { map.off('mousemove', 'fie-extrusion', onMove); map.off('mouseleave', 'fie-extrusion', onLeave); };
  }, [mapReady]);

  // ─── Click ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    let prevSelectedId = null;

    const onClick = (e) => {
      if (!e.features.length) return;
      const feat = e.features[0];
      if (prevSelectedId !== null)
        map.setFeatureState({ source: 'fie-buildings', id: prevSelectedId }, { selected: false });
      map.setFeatureState({ source: 'fie-buildings', id: feat.id }, { selected: true });
      prevSelectedId = feat.id;
      setSelectedCode(feat.properties.code);

      map.flyTo({ center: e.lngLat, zoom: 17.5, pitch: 60, speed: 0.8, essential: true });

      const dbBuilding = buildings.find(b =>
        b.code === feat.properties.code ||
        b.name?.toLowerCase().includes(feat.properties.label.toLowerCase().slice(0, 8))
      );
      if (dbBuilding && onSelectBuilding) onSelectBuilding(dbBuilding);
    };

    map.on('click', 'fie-extrusion', onClick);
    return () => map.off('click', 'fie-extrusion', onClick);
  }, [mapReady, buildings, onSelectBuilding]);

  const toggle3D = useCallback(() => {
    const next = !is3D;
    mapRef.current?.easeTo({ pitch: next ? 55 : 0, bearing: next ? -20 : 0, duration: 800 });
    setIs3D(next);
  }, [is3D]);

  const flyToCampus = useCallback(() => {
    mapRef.current?.flyTo({ ...INITIAL_VIEW, duration: 1000, essential: true });
  }, []);

  // ─── Error: token no configurado ─────────────────────────────────────────
  if (tokenError) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#f8fafc',
        gap: '1rem', textAlign: 'center', padding: '2rem',
      }}>
        <span style={{ fontSize: '2.5rem' }}>🗺️</span>
        <h3 style={{ color: '#111827', margin: 0 }}>Token de Mapbox no configurado</h3>
        <p style={{ color: '#6b7280', maxWidth: 360, fontSize: '0.85rem', lineHeight: 1.6 }}>
          Añade <code style={{ background: '#f3f4f6', padding: '0 4px', borderRadius: 4 }}>
            VITE_MAPBOX_TOKEN=pk.ey…
          </code> en el archivo <strong>.env</strong> del Public Frontend y reinicia el servidor.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Tooltip hover */}
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 40,
          pointerEvents: 'none', background: 'rgba(0,0,0,0.82)', color: '#fff',
          padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.78rem',
          fontWeight: 600, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)', borderLeft: `3px solid ${FIE_COLOR}`, zIndex: 50,
        }}>
          {tooltip.label}
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            Click para explorar en 3D
          </div>
        </div>
      )}

      {/* Controles */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {onClose && (
          <button onClick={onClose} title="Volver al visor 3D" style={mapBtn({ color: '#fff', bg: FIE_COLOR })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12H3m0 0 7-7m-7 7 7 7"/>
            </svg>
            <span>Visor 3D</span>
          </button>
        )}
        <button onClick={toggle3D} style={mapBtn({ color: is3D ? FIE_COLOR : '#374151', bg: '#fff' })}>
          <span>{is3D ? '2D' : '3D'}</span>
        </button>
        <button onClick={flyToCampus} title="Centrar en el campus" style={mapBtn({ color: '#374151', bg: '#fff' })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
          </svg>
          <span>Campus</span>
        </button>
      </div>

      {/* Leyenda */}
      <div style={{
        position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        zIndex: 30, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,0,0,0.1)', borderRadius: 999,
        padding: '0.4rem 1.1rem', display: 'flex', gap: '1.2rem',
        alignItems: 'center', fontSize: '0.72rem', fontWeight: 600,
        color: '#374151', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}>
        <LegendItem color={FIE_COLOR}        label="Edificios FIE" />
        <LegendItem color={OTHER_COLOR}      label="Otros edificios ESPOCH" />
        <LegendItem color={BOUNDARY_BORDER}  label="Campus" dashed />
      </div>

      {/* Badge ESPOCH */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 30,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        border: `2px solid ${FIE_COLOR}`, borderRadius: 10,
        padding: '0.5rem 0.9rem', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}>
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
        <div style={{
          position: 'absolute', inset: 0, background: '#f8fafc',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, zIndex: 100,
        }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #e2e8f0',
            borderTop: `3px solid ${FIE_COLOR}`, borderRadius: '50%',
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

function mapBtn({ color, bg }) {
  return {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '0.45rem 0.75rem', background: bg, color,
    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 1px 6px rgba(0,0,0,0.15)', whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  };
}
function LegendItem({ color, label, dashed = false }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: dashed ? 16 : 10, height: dashed ? 0 : 10,
        borderRadius: dashed ? 0 : '50%',
        background: dashed ? 'transparent' : color,
        border: dashed ? `2px dashed ${color}` : 'none',
        flexShrink: 0, display: 'inline-block',
      }}/>
      {label}
    </span>
  );
}
