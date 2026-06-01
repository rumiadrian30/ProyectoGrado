import React, { useMemo } from 'react';

function readNumber(...values) {
  for (const value of values) {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function getModelPosition(model, building) {
  return {
    x: readNumber(
      model?.building_offset_x,
      model?.offset_x,
      building?.offset_x
    ),
    y: readNumber(
      model?.building_offset_y,
      model?.offset_y,
      building?.offset_y
    ),
    z: readNumber(
      model?.building_offset_z,
      model?.offset_z,
      building?.offset_z
    ),
  };
}

export default function MiniMap({
  buildings = [],
  allModels = [],
  selectedBuilding = null,
  onSelectBuilding,
  isMobile = false,
  visible = false,
  expanded = false,
  onToggle,
  onToggleSize,
  cameraSnapshot,
}) {
  const points = useMemo(() => {
    return buildings.map((building) => {
      const model = allModels.find(
        (m) =>
          String(m.building_id) === String(building.id) &&
          (m.is_active === true || m.is_active === 1 || m.is_active === '1')
      );

      const fallbackModel = model ?? allModels.find(
        (m) => String(m.building_id) === String(building.id)
      );

      const pos = getModelPosition(fallbackModel, building);

      return {
        id: building.id,
        name: building.name,
        x: pos.x,
        z: pos.z,
        hasModel: Boolean(fallbackModel?.file_path),
      };
    });
  }, [buildings, allModels]);

  const bounds = useMemo(() => {
    const xs = points.map((p) => p.x);
    const zs = points.map((p) => p.z);

    if (cameraSnapshot) {
      xs.push(cameraSnapshot.cameraX, cameraSnapshot.targetX);
      zs.push(cameraSnapshot.cameraZ, cameraSnapshot.targetZ);
    }

    if (!xs.length || !zs.length) {
      return {
        minX: -120,
        maxX: 120,
        minZ: -120,
        maxZ: 120,
      };
    }

    const padding = 40;

    return {
      minX: Math.min(...xs, -120) - padding,
      maxX: Math.max(...xs, 120) + padding,
      minZ: Math.min(...zs, -120) - padding,
      maxZ: Math.max(...zs, 120) + padding,
    };
  }, [points, cameraSnapshot]);

  const W = expanded
    ? (isMobile ? 240 : 310)
    : (isMobile ? 148 : 180);

  const H = expanded
    ? (isMobile ? 180 : 230)
    : (isMobile ? 112 : 136);

  const PAD = expanded ? 22 : 16;

  const project = (x, z) => {
    const dx = bounds.maxX - bounds.minX || 1;
    const dz = bounds.maxZ - bounds.minZ || 1;

    return {
      x: PAD + ((x - bounds.minX) / dx) * (W - PAD * 2),
      y: PAD + ((z - bounds.minZ) / dz) * (H - PAD * 2),
    };
  };

  const cameraPoint = cameraSnapshot
    ? project(cameraSnapshot.cameraX, cameraSnapshot.cameraZ)
    : null;

  const targetPoint = cameraSnapshot
    ? project(cameraSnapshot.targetX, cameraSnapshot.targetZ)
    : null;

  const handleToggle = (e) => {
    e?.stopPropagation?.();
    onToggle?.();
  };

  const handleToggleSize = (e) => {
    e?.stopPropagation?.();
    onToggleSize?.();
  };

  return (
    <>
      <button
        onClick={handleToggle}
        onPointerDown={(e) => e.stopPropagation()}
        title={visible ? 'Ocultar minimapa' : 'Mostrar minimapa'}

        aria-label={visible ? 'Ocultar minimapa' : 'Mostrar minimapa'}
        style={{
          position: 'absolute',
          right: isMobile ? 12 : 12,
          bottom: isMobile ? 54 : 54,
          zIndex: 31,
          pointerEvents: 'auto',
          width: 36,
          height: 36,
          padding: 0,
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          color: visible ? '#BC0613' : '#374151',
          transition: 'background 0.15s, transform 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f3f4f6';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.94)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      </button>

      {visible && (
        <div
          style={{
            position: 'absolute',
            right: isMobile ? 56 : 58,
            bottom: isMobile ? 54 : 54,
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: W,
              background: 'rgba(255,255,255,.96)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(15,23,42,.12)',
              borderRadius: 14,
              boxShadow: '0 16px 42px rgba(15,23,42,.22)',
              overflow: 'hidden',
              transition: 'width 200ms ease, opacity 180ms ease, transform 180ms ease',
              animation: 'viewerPanelIn .22s ease',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                padding: '0.85rem 0.95rem 0.65rem',
                borderBottom: '1px solid rgba(15,23,42,.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                pointerEvents: 'none',
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#111827',
                  }}
                >
                  Mini mapa
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  pointerEvents: 'auto',
                }}
              >
                <button
                  onClick={handleToggleSize}
                  onPointerDown={(e) => e.stopPropagation()}
                  title={expanded ? 'Reducir minimapa' : 'Agrandar minimapa'}
                  aria-label={expanded ? 'Reducir minimapa' : 'Agrandar minimapa'}
                  style={{
                    width: 26,
                    height: 26,
                    border: 'none',
                    background: 'rgba(15,23,42,.06)',
                    color: '#64748b',
                    borderRadius: 7,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    pointerEvents: 'auto',
                  }}
                >
                  {expanded ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
                    </svg>
                  ) : (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleToggle}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Ocultar minimapa"
                  aria-label="Ocultar minimapa"
                  style={{
                    width: 26,
                    height: 26,
                    border: 'none',
                    background: 'rgba(15,23,42,.06)',
                    color: '#64748b',
                    borderRadius: 7,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'background 0.15s, color 0.15s',
                    pointerEvents: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(15,23,42,.10)';
                    e.currentTarget.style.color = '#334155';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15,23,42,.06)';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.7"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{
                display: 'block',
                background: 'linear-gradient(180deg, rgba(248,250,252,.96), rgba(241,245,249,.96))',
                pointerEvents: 'none',
              }}
            >
              <defs>
                <pattern
                  id="mini-grid-3d-follow"
                  width="18"
                  height="18"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 18 0 L 0 0 0 18"
                    fill="none"
                    stroke="rgba(15,23,42,.08)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              <rect
                x="0"
                y="0"
                width={W}
                height={H}
                fill="url(#mini-grid-3d-follow)"
              />

              <path
                d={`M ${PAD} ${H / 2} C ${W * 0.36} ${H * 0.42}, ${W * 0.58} ${H * 0.60}, ${W - PAD} ${H * 0.46}`}
                fill="none"
                stroke="rgba(100,116,139,.28)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {targetPoint && (
                <circle
                  cx={targetPoint.x}
                  cy={targetPoint.y}
                  r={expanded ? 5 : 4}
                  fill="#2563eb"
                  opacity="0.85"
                />
              )}

              {cameraPoint && targetPoint && (
                <line
                  x1={cameraPoint.x}
                  y1={cameraPoint.y}
                  x2={targetPoint.x}
                  y2={targetPoint.y}
                  stroke="#2563eb"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.65"
                />
              )}

              {cameraPoint && (
                <g>
                  <circle
                    cx={cameraPoint.x}
                    cy={cameraPoint.y}
                    r={expanded ? 7 : 6}
                    fill="#111827"
                    stroke="#fff"
                    strokeWidth="2"
                  />

                  <path
                    d={`M ${cameraPoint.x} ${cameraPoint.y - 10} L ${cameraPoint.x - 5} ${cameraPoint.y + 4} L ${cameraPoint.x + 5} ${cameraPoint.y + 4} Z`}
                    fill="#111827"
                    opacity="0.9"
                  />
                </g>
              )}

              {points.map((point) => {
                const p = project(point.x, point.z);
                const selected = String(selectedBuilding?.id) === String(point.id);

                return (
                  <g
                    key={point.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBuilding?.(point.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                    }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={selected ? 7 : 5}
                      fill={
                        selected
                          ? '#BC0613'
                          : point.hasModel
                            ? '#334155'
                            : '#94a3b8'
                      }
                      stroke="#fff"
                      strokeWidth="2"
                    />

                    {selected && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={11}
                        fill="none"
                        stroke="#BC0613"
                        strokeWidth="1.5"
                        opacity="0.35"
                      />
                    )}
                  </g>
                );
              })}

              <text
                x={W - PAD}
                y={H - 8}
                textAnchor="end"
                fontSize="9"
                fontWeight="700"
                fill="rgba(100,116,139,.65)"
              >
                ESPOCH
              </text>
            </svg>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.95rem 0.75rem',
                borderTop: '1px solid rgba(15,23,42,.08)',
                fontSize: '0.6rem',
                color: '#64748b',
                fontWeight: 700,
                pointerEvents: 'none',
              }}
            >
              <span>Cámara</span>
              <span style={{ color: '#2563eb' }}>Objetivo</span>
              <span style={{ color: '#BC0613' }}>Edificio</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}