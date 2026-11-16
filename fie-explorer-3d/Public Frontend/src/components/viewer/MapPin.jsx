/**
 * MapPin.jsx — GeoESPOCH 3D
 * Pin HTML anclado sobre cada edificio (nombre + icono). Un clic selecciona,
 * doble clic encuadra la cámara.
 */
import React, { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';

export default function MapPin({
  building,
  hasModel = true,
  isSelected = false,
  isDimmed = false,
  isMuted = false,
  onClick,
  onDoubleClick,
  onHoverChange,
}) {
  const [hovered, setHovered] = useState(false);

  const position = useMemo(() => [
    Number(building?.offset_x ?? 0),
    Number(building?.offset_y ?? 0) + 28,
    Number(building?.offset_z ?? 0),
  ], [building]);

  if (!building) return null;

  const active = hovered || isSelected;
  const className = [
    'v3d-pin',
    active ? 'is-active' : '',
    isSelected ? 'is-selected' : '',
    isDimmed ? 'is-dimmed' : '',
    isMuted && !active ? 'is-muted' : '',
    hasModel ? '' : 'is-demo',
  ].filter(Boolean).join(' ');

  return (
    <Html
      position={position}
      center
      distanceFactor={70}
      occlude={false}
      zIndexRange={[8, 0]}
      style={{ pointerEvents: 'auto', userSelect: 'none' }}
    >
      <button
        type="button"
        className={className}
        title={building.name}
        aria-label={`Seleccionar ${building.name}`}
        onClick={(e) => { e.stopPropagation(); onClick?.(building); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(building); }}
        onPointerEnter={() => { setHovered(true); onHoverChange?.(building.id); }}
        onPointerLeave={() => { setHovered(false); onHoverChange?.(null); }}
      >
        <span className="v3d-pin-label">{building.name}</span>
        <span className="v3d-pin-head">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 10 12 5 2 10l10 5 10-5Z" />
            <path d="M6 12v5c3 2 9 2 12 0v-5" />
          </svg>
        </span>
        <span className="v3d-pin-tail" />
      </button>
    </Html>
  );
}
