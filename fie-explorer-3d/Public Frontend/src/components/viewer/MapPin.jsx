import React, { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';

export default function MapPin({
  building,
  isSelected = false,
  isDimmed = false,
  onClick,
  onHoverChange,
}) {
  const [hovered, setHovered] = useState(false);

  const position = useMemo(() => {
    const x = Number(building?.offset_x ?? 0);
    const y = Number(building?.offset_y ?? 0) + 28;
    const z = Number(building?.offset_z ?? 0);

    return [x, y, z];
  }, [building]);

  if (!building) return null;

  const active = hovered || isSelected;

  return (
    <Html
      position={position}
      center
      distanceFactor={70}
      occlude={false}
      zIndexRange={[8, 0]}
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        title={building.name}
        aria-label={`Abrir información de ${building.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(building);
        }}
        onPointerEnter={() => {
          setHovered(true);
          onHoverChange?.(building.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setHovered(false);
          onHoverChange?.(null);
          document.body.style.cursor = 'default';
        }}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: isDimmed ? 0.28 : 1,
          filter: isDimmed ? 'grayscale(0.35)' : 'none',
          transform: active
            ? 'scale(1.08)'
            : isDimmed
              ? 'scale(0.9)'
              : 'scale(1)',
          transition: 'opacity 220ms ease, filter 220ms ease, transform 220ms ease',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {!isDimmed && (
          <div
            style={{
              width: 240,
              padding: '7px 18px',
              borderRadius: 8,
              background: active
                ? 'rgba(255, 0, 0, 0.92)'
                : 'rgba(15, 23, 42, 0.88)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              lineHeight: 1.2,
              textAlign: 'center',
              boxShadow: '0 10px 28px rgba(0,0,0,.25)',
              backdropFilter: 'blur(10px)',
              border: active
                ? '1px solid rgba(255, 0, 0, 0.55)'
                : '1px solid rgba(255,255,255,.16)',
              marginBottom: 10,
              whiteSpace: 'normal',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              transition: 'background 220ms ease, border 220ms ease',
            }}
          >
            {building.name}
          </div>
        )}

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: active ? 'red' : '#ffffff',
            color: active ? '#ffffff' : '#111827',
            border: active ? '2px solid #bfdbfe' : '2px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: active
              ? '0 0 0 6px rgba(255, 0, 0, 0.18), 0 8px 22px rgba(0,0,0,.3)'
              : '0 8px 22px rgba(0,0,0,.25)',
            transition: 'background 220ms ease, box-shadow 220ms ease',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 10 12 5 2 10l10 5 10-5Z" />
            <path d="M6 12v5c3 2 9 2 12 0v-5" />
          </svg>
        </div>

        {!isDimmed && (
          <div
            style={{
              width: 10,
              height: 10,
              background: active ? 'red' : '#ffffff',
              transform: 'rotate(45deg)',
              marginTop: -3,
              boxShadow: '3px 3px 8px rgba(0,0,0,.16)',
              transition: 'background 220ms ease',
            }}
          />
        )}
      </button>
    </Html>
  );
}