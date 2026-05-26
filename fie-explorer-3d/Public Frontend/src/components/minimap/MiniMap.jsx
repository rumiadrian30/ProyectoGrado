import { useRef, useEffect, useCallback } from 'react';
import { useViewerStore } from '../../store/viewerStore';

const TYPE_COLORS = {
  lab:     '#BC0613',
  office:  '#d41a2b',
  service: '#16a34a',
  access:  '#d97706',
};

const SIZE = 160;
const PAD  = 18;

export default function MiniMap({ building, hotspots, floor }) {
  const canvasRef    = useRef(null);
  const dotsRef      = useRef([]);   // posiciones canvas de cada hotspot para hit-test
  const { activeHotspot, setActiveHotspot } = useViewerStore();

  // ── Dibuja ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;

    // Setear dimensiones físicas SIN tocar el atributo HTML width/height
    // (evita el artefacto del cuadrado rojo)
    canvas.style.width  = SIZE + 'px';
    canvas.style.height = SIZE + 'px';
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Fondo
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#f7f8fa';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Silueta del edificio
    ctx.fillStyle   = '#e9edf2';
    ctx.strokeStyle = '#d1d9e0';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(PAD, PAD, SIZE - PAD * 2, SIZE - PAD * 2, 4);
    ctx.fill();
    ctx.stroke();

    // Grid interior
    ctx.strokeStyle = '#dde2e8';
    ctx.lineWidth   = 0.5;
    for (let x = PAD; x < SIZE - PAD; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, SIZE - PAD); ctx.stroke();
    }
    for (let y = PAD; y < SIZE - PAD; y += 20) {
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(SIZE - PAD, y); ctx.stroke();
    }

    if (!hotspots.length) { dotsRef.current = []; return; }

    // Normalizar posiciones al canvas
    const xs = hotspots.map(h => parseFloat(h.pos_x) || 0);
    const zs = hotspots.map(h => parseFloat(h.pos_z) || 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const rangeX = (maxX - minX) || 1;
    const rangeZ = (maxZ - minZ) || 1;
    const mapRange = SIZE - PAD * 2 - 16;

    const toCanvas = (x, z) => ({
      cx: PAD + 8 + ((x - minX) / rangeX) * mapRange,
      cy: PAD + 8 + ((z - minZ) / rangeZ) * mapRange,
    });

    // Guardar posiciones para hit-test en click
    dotsRef.current = hotspots.map(h => ({
      ...toCanvas(parseFloat(h.pos_x) || 0, parseFloat(h.pos_z) || 0),
      hotspot: h,
    }));

    // Dibujar hotspots
    dotsRef.current.forEach(({ cx, cy, hotspot: h }) => {
      const isActive = activeHotspot?.id === h.id;
      const color    = TYPE_COLORS[h.type] || '#BC0613';

      // Halo activo
      if (isActive) {
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = color + '30';
        ctx.fill();
      }

      // Punto
      ctx.beginPath();
      ctx.arc(cx, cy, isActive ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    });

    // Etiqueta de planta
    ctx.fillStyle = '#9ca3af';
    ctx.font      = `bold 8px "DM Sans", sans-serif`;
    ctx.fillText(`Piso ${floor}`, PAD + 2, SIZE - PAD + 11);

  }, [hotspots, activeHotspot, floor]);

  // ── Click: detectar hotspot más cercano al cursor ─────────────────────────
  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas || !dotsRef.current.length) return;

    const rect  = canvas.getBoundingClientRect();
    const mx    = e.clientX - rect.left;
    const my    = e.clientY - rect.top;
    const HIT_R = 10   // radio de hit en px

    let closest = null;
    let minDist = Infinity;

    dotsRef.current.forEach(({ cx, cy, hotspot }) => {
      const d = Math.hypot(cx - mx, cy - my);
      if (d < HIT_R && d < minDist) {
        minDist = d;
        closest = hotspot;
      }
    });

    if (closest) setActiveHotspot(closest);
  }, [setActiveHotspot]);

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
      {/* Header */}
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
        onClick={handleClick}
        style={{
          display: 'block',
          width: SIZE,
          height: SIZE,
          cursor: dotsRef.current.length ? 'crosshair' : 'default',
        }}
      />

      {/* Leyenda */}
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
                background: TYPE_COLORS[type] || '#BC0613',
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