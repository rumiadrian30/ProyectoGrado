/**
 * ViewerLoading.jsx — GeoESPOCH 3D
 * Barra de progreso real de carga de modelos (drei useProgress) y sincroniza
 * el estado con el store para el panel lateral.
 */
import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useViewerStore } from '../../../store/viewerStore';

export default function ViewerLoading({ isMobile = false }) {
  const { active, progress } = useProgress();
  const setModelLoading  = useViewerStore((s) => s.setModelLoading);
  const setModelProgress = useViewerStore((s) => s.setModelProgress);
  const [visible, setVisible] = useState(false);

  const pct = Math.round(progress);

  useEffect(() => {
    setModelLoading(active);
    setModelProgress(active ? pct : 100);
  }, [active, pct, setModelLoading, setModelProgress]);

  useEffect(() => {
    if (active) { setVisible(true); return undefined; }
    const t = window.setTimeout(() => setVisible(false), 450);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div
      className={`v3d-loading${active ? '' : ' is-done'}`}
      style={{ top: isMobile ? 10 : 12 }}
      role="status"
      aria-live="polite"
    >
      <div className="v3d-loading-track">
        <div className="v3d-loading-bar" style={{ width: `${active ? pct : 100}%` }} />
      </div>
      <span className="v3d-loading-text">
        {active ? `Cargando modelos 3D… ${pct}%` : 'Modelos listos'}
      </span>
    </div>
  );
}
