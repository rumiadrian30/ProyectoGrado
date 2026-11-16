/**
 * ViewerControls3D.jsx — GeoESPOCH 3D
 * Botonera lateral del visor: vista inicial, zoom, rotación, vista superior,
 * recorrido automático y carga por proximidad.
 */
import React from 'react';

function Icon({ children, size = 15, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HudButton({ title, onClick, active = false, on = false, children }) {
  return (
    <button
      type="button"
      className={`v3d-btn${active ? ' is-active' : ''}${on ? ' is-on' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active || on || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function ViewerControls3D({
  isMobile,
  cameraCommandRef,
  proximityEnabled,
  onToggleProximity,
  tourActive,
  onToggleTour,
}) {
  const cmd = () => cameraCommandRef.current;

  return (
    <div
      className="v3d-controls"
      style={{ right: isMobile ? 10 : 12, top: isMobile ? 58 : 58 }}
    >
      <HudButton title="Vista inicial" onClick={() => cmd()?.reset?.()}>
        <Icon>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
        </Icon>
      </HudButton>

      <HudButton title="Acercar" onClick={() => cmd()?.zoomIn?.()}>
        <Icon strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></Icon>
      </HudButton>

      <HudButton title="Alejar" onClick={() => cmd()?.zoomOut?.()}>
        <Icon strokeWidth={2.4}><path d="M5 12h14" /></Icon>
      </HudButton>

      <HudButton title="Rotar a la izquierda" onClick={() => cmd()?.rotateLeft?.()}>
        <Icon size={16} strokeWidth={2.2}>
          <path d="M3 12a9 9 0 0 1 15.5-6.2" />
          <path d="M18 2v5h-5" />
        </Icon>
      </HudButton>

      <HudButton title="Rotar a la derecha" onClick={() => cmd()?.rotateRight?.()}>
        <Icon size={16} strokeWidth={2.2}>
          <path d="M21 12A9 9 0 0 0 5.5 5.8" />
          <path d="M6 2v5h5" />
        </Icon>
      </HudButton>

      <HudButton title="Vista superior" onClick={() => cmd()?.top?.()}>
        <Icon size={16} strokeWidth={2.2}>
          <path d="M12 3l8 5-8 5-8-5 8-5z" />
          <path d="M4 13l8 5 8-5" />
        </Icon>
      </HudButton>

      <HudButton
        title={tourActive ? 'Detener recorrido' : 'Recorrido automático'}
        active={tourActive}
        onClick={onToggleTour}
      >
        {tourActive ? (
          <Icon size={15}><rect x="6" y="6" width="12" height="12" rx="2" /></Icon>
        ) : (
          <Icon size={16} strokeWidth={2.1}>
            <path d="M21 12a9 9 0 1 1-6.2-8.56" />
            <path d="M21 3v6h-6" />
            <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
          </Icon>
        )}
      </HudButton>

      <HudButton
        title={proximityEnabled ? 'Carga por proximidad activada (clic para cargar todo)' : 'Cargar solo edificios cercanos'}
        on={proximityEnabled}
        onClick={onToggleProximity}
      >
        <Icon size={16}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          {!proximityEnabled && <line x1="3" y1="21" x2="21" y2="3" />}
        </Icon>
      </HudButton>
    </div>
  );
}
