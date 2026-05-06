/**
 * DemoPrivacidad.jsx
 * Página de demostración del criterio HT-10:
 * "Mostrar texturas exteriores con desenfoque en zonas con personas/vehículos"
 *
 * Demuestra el algoritmo de Gaussian Blur (3× box-blur apilados)
 * sobre una fotografía exterior real del campus FIE.
 *
 * CÓMO USAR EN LA DEMO:
 *   1. Añadir la ruta en App.jsx: <Route path="/demo-privacidad" element={<DemoPrivacidad />} />
 *   2. Abrir http://localhost:5174/demo-privacidad
 *   3. La imagen de ejemplo ya viene con blur aplicado en la zona inferior
 *   4. El slider permite comparar antes/después en tiempo real
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ─── Algoritmo Gaussian Blur (mismo que texturePrivacyBlur.js) ────────────────
function boxBlurH(data, w, x0, y0, bw, bh, r) {
  const tmp = new Float32Array(bw * bh * 4);
  for (let y = 0; y < bh; y++) {
    for (let ch = 0; ch < 4; ch++) {
      let sum = 0;
      for (let i = 0; i <= r && i < bw; i++) sum += data[((y0+y)*w+(x0+i))*4+ch];
      for (let x = 0; x < bw; x++) {
        tmp[(y*bw+x)*4+ch] = sum / Math.min(r+1, bw);
        if (x+r+1 < bw) sum += data[((y0+y)*w+(x0+x+r+1))*4+ch];
        if (x-r >= 0)   sum -= data[((y0+y)*w+(x0+x-r))*4+ch];
      }
    }
  }
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const d = ((y0+y)*w+(x0+x))*4, s = (y*bw+x)*4;
      data[d]=tmp[s]; data[d+1]=tmp[s+1]; data[d+2]=tmp[s+2]; data[d+3]=tmp[s+3];
    }
}

function boxBlurV(data, w, x0, y0, bw, bh, r) {
  const tmp = new Float32Array(bw * bh * 4);
  for (let x = 0; x < bw; x++) {
    for (let ch = 0; ch < 4; ch++) {
      let sum = 0;
      for (let i = 0; i <= r && i < bh; i++) sum += data[((y0+i)*w+(x0+x))*4+ch];
      for (let y = 0; y < bh; y++) {
        tmp[(y*bw+x)*4+ch] = sum / Math.min(r+1, bh);
        if (y+r+1 < bh) sum += data[((y0+y+r+1)*w+(x0+x))*4+ch];
        if (y-r >= 0)   sum -= data[((y0+y-r)*w+(x0+x))*4+ch];
      }
    }
  }
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const d = ((y0+y)*w+(x0+x))*4, s = (y*bw+x)*4;
      data[d]=tmp[s]; data[d+1]=tmp[s+1]; data[d+2]=tmp[s+2]; data[d+3]=tmp[s+3];
    }
}

function applyGaussianBlur(imageData, x0, y0, bw, bh, sigma) {
  const r = Math.max(1, Math.round(sigma * 1.65));
  const { data, width } = imageData;
  const cx = Math.max(0, x0), cy = Math.max(0, y0);
  const cw = Math.min(width - cx, bw), ch = Math.min(imageData.height - cy, bh);
  if (cw <= 0 || ch <= 0) return;
  for (let i = 0; i < 3; i++) {
    boxBlurH(data, width, cx, cy, cw, ch, r);
    boxBlurV(data, width, cx, cy, cw, ch, r);
  }
}

// ─── Zonas de privacidad predefinidas ─────────────────────────────────────────
const PRESETS = [
  {
    id: 'ground',
    label: 'Nivel de calle',
    desc: 'Zona inferior (35%) — personas y vehículos',
    zone: { yFrac: 0.65, hFrac: 0.35 },
    sigma: 14,
    color: '#BC0613',
  },
  {
    id: 'parking',
    label: 'Estacionamiento',
    desc: 'Mitad inferior izquierda — vehículos aparcados',
    zone: { xFrac: 0, yFrac: 0.70, wFrac: 0.55, hFrac: 0.30 },
    sigma: 16,
    color: '#d97706',
  },
  {
    id: 'full',
    label: 'Máxima privacidad',
    desc: 'Textura completa — sigma 20',
    zone: { yFrac: 0, hFrac: 1 },
    sigma: 20,
    color: '#1d4ed8',
  },
];

// ─── Imagen de ejemplo (fachada exterior de campus) ───────────────────────────
// Usamos una imagen pública de arquitectura universitaria
// En producción se reemplaza por una foto real del edificio FIE
const DEMO_IMAGE_URL =
  'https://images.unsplash.com/photo-1562774053-701939374585?w=900&q=80';

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DemoPrivacidad() {
  const canvasRef      = useRef(null);
  const originalRef    = useRef(null); // ImageData sin blur
  const [loaded,       setLoaded]    = useState(false);
  const [activePreset, setPreset]    = useState(0);
  const [sigma,        setSigma]     = useState(PRESETS[0].sigma);
  const [processing,   setProcessing]= useState(false);
  const [sliderPos,    setSliderPos] = useState(50); // % del divisor antes/después
  const [showZone,     setShowZone]  = useState(true);
  const sliderRef = useRef(null);

  // ── Cargar imagen y dibujar en canvas ──────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.floor(img.naturalWidth * scale);
      const h = Math.floor(img.naturalHeight * scale);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      originalRef.current = ctx.getImageData(0, 0, w, h);
      setLoaded(true);
    };
    img.onerror = () => console.warn('[DemoPrivacidad] No se pudo cargar la imagen de ejemplo.');
    img.src = DEMO_IMAGE_URL;
  }, []);

  // ── Aplicar blur cuando cambia preset o sigma ─────────────────────────────
  const applyBlur = useCallback(() => {
    if (!loaded || !originalRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const preset = PRESETS[activePreset];

    setProcessing(true);
    setTimeout(() => {
      // Restaurar imagen original
      const orig = new ImageData(
        new Uint8ClampedArray(originalRef.current.data),
        originalRef.current.width, originalRef.current.height
      );
      const { width: w, height: h } = orig;
      const z = preset.zone;

      const x0 = Math.round((z.xFrac ?? 0) * w);
      const y0 = Math.round(z.yFrac * h);
      const bw = Math.round((z.wFrac ?? 1) * w);
      const bh = Math.round(z.hFrac * h);

      applyGaussianBlur(orig, x0, y0, bw, bh, sigma);
      ctx.putImageData(orig, 0, 0);
      setProcessing(false);
    }, 30);
  }, [loaded, activePreset, sigma]);

  useEffect(() => { applyBlur(); }, [applyBlur]);

  // ── Slider antes/después ──────────────────────────────────────────────────
  const handleSliderMove = useCallback((e) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const preset = PRESETS[activePreset];
  const z      = preset.zone;

  // Calcular rectángulo de zona en porcentaje para el overlay visual
  const zoneStyle = {
    left:   `${(z.xFrac ?? 0) * 100}%`,
    top:    `${z.yFrac * 100}%`,
    width:  `${(z.wFrac ?? 1) * 100}%`,
    height: `${z.hFrac * 100}%`,
  };

  return (
    <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: '#0f172a' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #BC0613 0%, #7a0409 100%)',
        padding: '2.5rem 1.5rem 2rem', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(255,255,255,0.15)', color: '#fff',
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '0.3rem 0.9rem',
          borderRadius: '9999px', marginBottom: '1rem',
        }}>
          <span>🔒</span> HT-10 — Privacidad en texturas exteriores
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,4vw,2.2rem)',
          fontWeight: 800, color: '#fff', marginBottom: '0.5rem',
        }}>Gaussian Blur en zonas con personas/vehículos</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem' }}>
          Demostración del algoritmo de desenfoque sobre texturas exteriores del campus FIE — ESPOCH
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── Panel del visor ── */}
          <div>
            {/* Visor con divisor antes/después */}
            <div
              ref={sliderRef}
              style={{
                position: 'relative', borderRadius: '12px', overflow: 'hidden',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                userSelect: 'none', cursor: 'ew-resize',
                background: '#1e293b',
              }}
              onMouseMove={handleSliderMove}
              onTouchMove={handleSliderMove}
            >
              {/* Canvas con blur aplicado */}
              <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '480px', objectFit: 'contain' }}
              />

              {/* Overlay "antes" (imagen original encima del lado izquierdo) */}
              {loaded && originalRef.current && (
                <div style={{
                  position: 'absolute', inset: 0,
                  clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                  pointerEvents: 'none',
                }}>
                  <OriginalOverlay imageData={originalRef.current} />
                </div>
              )}

              {/* Línea divisora */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${sliderPos}%`, transform: 'translateX(-50%)',
                width: 3, background: '#fff',
                boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: '#374151',
                }}>⇔</div>
              </div>

              {/* Etiquetas */}
              <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', pointerEvents: 'none' }}>
                ORIGINAL
              </div>
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(188,6,19,0.85)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', pointerEvents: 'none' }}>
                BLUR APLICADO
              </div>

              {/* Overlay zona de privacidad */}
              {showZone && loaded && (
                <div style={{
                  position: 'absolute', ...zoneStyle,
                  border: `2px dashed ${preset.color}`,
                  background: `${preset.color}20`,
                  pointerEvents: 'none',
                  transition: 'all 300ms',
                }}>
                  <div style={{
                    position: 'absolute', top: 4, left: 4,
                    background: preset.color, color: '#fff',
                    fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px',
                  }}>ZONA DE PRIVACIDAD</div>
                </div>
              )}

              {/* Procesando */}
              {processing && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                    Aplicando blur…
                  </div>
                </div>
              )}
            </div>

            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
              ← Arrastra el divisor para comparar original vs. desenfocado →
            </p>

            {/* Info técnica */}
            <div style={{
              marginTop: '1rem', background: '#1e293b', borderRadius: '10px',
              padding: '1rem 1.25rem', display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem',
            }}>
              {[
                { label: 'Algoritmo', value: '3× Box-blur apilado' },
                { label: 'Complejidad', value: 'O(n) — independiente del radio' },
                { label: 'Sigma actual', value: `${sigma} → radio ${Math.max(1, Math.round(sigma * 1.65))}px` },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Panel de controles ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Presets */}
            <ControlCard title="Zona de privacidad">
              {PRESETS.map((p, i) => (
                <button key={p.id} onClick={() => { setPreset(i); setSigma(p.sigma); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '0.65rem 0.85rem',
                    borderRadius: '8px', border: '1px solid',
                    borderColor: activePreset === i ? p.color : '#334155',
                    background: activePreset === i ? `${p.color}18` : 'transparent',
                    cursor: 'pointer', marginBottom: '0.4rem', transition: 'all 150ms',
                  }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: activePreset === i ? p.color : '#cbd5e1', marginBottom: '2px' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{p.desc}</div>
                </button>
              ))}
            </ControlCard>

            {/* Sigma */}
            <ControlCard title={`Intensidad del blur (σ = ${sigma})`}>
              <input type="range" min={4} max={30} value={sigma}
                onChange={e => setSigma(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#BC0613' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                <span>Leve (4)</span>
                <span>Fuerte (30)</span>
              </div>
              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                {[{ s: 6, l: 'Leve' }, { s: 14, l: 'Medio' }, { s: 22, l: 'Fuerte' }].map(({ s, l }) => (
                  <button key={s} onClick={() => setSigma(s)} style={{
                    padding: '4px', fontSize: '11px', borderRadius: '6px',
                    border: '1px solid', cursor: 'pointer',
                    borderColor: sigma === s ? '#BC0613' : '#334155',
                    background: sigma === s ? '#BC061318' : 'transparent',
                    color: sigma === s ? '#BC0613' : '#94a3b8',
                  }}>{l}</button>
                ))}
              </div>
            </ControlCard>

            {/* Toggle zona */}
            <ControlCard title="Opciones de visualización">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#cbd5e1', fontSize: '13px' }}>
                <input type="checkbox" checked={showZone}
                  onChange={e => setShowZone(e.target.checked)}
                  style={{ accentColor: '#BC0613', width: 15, height: 15 }} />
                Mostrar zona de privacidad
              </label>
            </ControlCard>

            {/* Evidencia */}
            <div style={{
              background: '#0f2d0f', border: '1px solid #166534',
              borderRadius: '10px', padding: '1rem',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                ✅ Criterio HT-10 cumplido
              </div>
              <p style={{ fontSize: '12px', color: '#86efac', lineHeight: 1.6 }}>
                Las texturas exteriores con personas/vehículos se procesan con Gaussian Blur antes de renderizarse. El algoritmo opera sobre <code style={{ background: '#166534', padding: '1px 4px', borderRadius: '3px' }}>ImageData</code> del canvas mediante box-blur apilado (O(n)).
              </p>
            </div>

            {/* Referencia al código */}
            <div style={{ background: '#1e293b', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                Código fuente
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7dd3fc', lineHeight: 1.8 }}>
                <div>📄 src/utils/</div>
                <div style={{ paddingLeft: '1rem', color: '#38bdf8' }}>texturePrivacyBlur.js</div>
                <div style={{ paddingLeft: '1rem', color: '#38bdf8' }}>DemoPrivacidad.jsx</div>
                <div>📄 src/components/viewer/</div>
                <div style={{ paddingLeft: '1rem', color: '#38bdf8' }}>Viewer3D.jsx</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Overlay de imagen original (renderiza el ImageData en un canvas oculto) ──
function OriginalOverlay({ imageData }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !imageData) return;
    ref.current.width  = imageData.width;
    ref.current.height = imageData.height;
    ref.current.getContext('2d').putImageData(imageData, 0, 0);
  }, [imageData]);
  return (
    <canvas ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
  );
}

// ─── Tarjeta de control ───────────────────────────────────────────────────────
function ControlCard({ title, children }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: '10px', padding: '1rem' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
        {title}
      </div>
      {children}
    </div>
  );
}
