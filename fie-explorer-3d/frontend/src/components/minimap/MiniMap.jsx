import React, { useRef, useEffect } from 'react';
import { useViewerStore } from '../../store/viewerStore';

const TYPE_COLORS = {
  lab: '#003087', office: '#0369a1',
  service: '#16a34a', access: '#d97706',
};

/**
 * Minimapa 2D con los hotspots del edificio activo.
 * Usa un Canvas 2D para dibujar el esquema de planta.
 */
export default function MiniMap({ building, hotspots, floor }) {
  const canvasRef = useRef(null);
  const { activeHotspot, setActiveHotspot } = useViewerStore();
  const SIZE = 160;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    // Fondo
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#f7f8fa';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Silueta del edificio (rectángulo simplificado)
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    const pad = 20;
    ctx.beginPath();
    ctx.roundRect(pad, pad, SIZE - pad * 2, SIZE - pad * 2, 4);
    ctx.fill();
    ctx.stroke();

    // Grid interior
    ctx.strokeStyle = '#e8ecf0';
    ctx.lineWidth = 0.5;
    for (let x = pad; x < SIZE - pad; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, SIZE - pad); ctx.stroke();
    }
    for (let y = pad; y < SIZE - pad; y += 20) {
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(SIZE - pad, y); ctx.stroke();
    }

    if (!hotspots.length) return;

    // Calcular bounds de los hotspots para normalizar
    const xs = hotspots.map(h => parseFloat(h.pos_x) || 0);
    const zs = hotspots.map(h => parseFloat(h.pos_z) || 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const rangeX = (maxX - minX) || 1;
    const rangeZ = (maxZ - minZ) || 1;

    const mapRange = SIZE - pad * 2 - 16;

    const toCanvas = (x, z) => ({
      cx: pad + 8 + ((x - minX) / rangeX) * mapRange,
      cy: pad + 8 + ((z - minZ) / rangeZ) * mapRange,
    });

    // Dibujar hotspots
    hotspots.forEach(h => {
      const { cx, cy } = toCanvas(parseFloat(h.pos_x) || 0, parseFloat(h.pos_z) || 0);
      const isActive = activeHotspot?.id === h.id;
      const color = TYPE_COLORS[h.type] || '#003087';

      // Halo si activo
      if (isActive) {
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = `${color}30`;
        ctx.fill();
      }

      // Punto
      ctx.beginPath();
      ctx.arc(cx, cy, isActive ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Etiqueta de planta
    ctx.fillStyle = '#6b7280';
    ctx.font = `bold 8px "DM Sans", sans-serif`;
    ctx.fillText(`Piso ${floor}`, pad + 2, SIZE - pad + 12);

  }, [hotspots, activeHotspot, floor]);

  if (!building) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 12, zIndex: 20,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Header minimapa */}
      <div style={{
        padding: '0.3rem 0.6rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: '0.35rem',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        </svg>
        <span style={{
          fontSize: '0.62rem', fontWeight: 700,
          color: 'var(--color-text-3)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>Minimapa</span>
      </div>

      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        style={{ display: 'block', width: SIZE, height: SIZE, cursor: 'default' }}
      />

      {/* Leyenda de hotspots presentes */}
      {hotspots.length > 0 && (
        <div style={{
          padding: '0.3rem 0.5rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
        }}>
          {[...new Set(hotspots.map(h => h.type))].map(type => (
            <span key={type} style={{
              display: 'flex', alignItems: 'center', gap: '0.2rem',
              fontSize: '0.6rem', color: 'var(--color-text-3)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: TYPE_COLORS[type] || '#003087',
                flexShrink: 0,
              }}/>
              {type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
