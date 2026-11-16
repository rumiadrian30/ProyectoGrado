/**
 * ViewerOverlays.jsx — GeoESPOCH 3D
 * Piezas de HUD del visor: insignia del edificio, botón de cambiar edificio,
 * botón de interior, pistas, avisos, diálogo de proximidad y fallback WebGL.
 */
import React from 'react';

/* ─── Insignia del edificio activo ──────────────────────────────────────── */
export function BuildingBadge({ building, hasModel, isMobile }) {
  if (!building) {
    return (
      <div className="v3d-pill v3d-pill-bottom" style={{ bottom: isMobile ? 18 : 48 }}>
        Haz clic en un edificio para explorarlo
      </div>
    );
  }

  return (
    <div className="v3d-pill v3d-pill-bottom is-strong" style={{ bottom: isMobile ? 18 : 48 }}>
      <span className="v3d-dot" />
      {building.name}
      <span className={`v3d-pill-meta ${hasModel ? 'ok' : 'warn'}`}>
        {hasModel ? '· modelo 3D' : '· demo'}
      </span>
    </div>
  );
}

/* ─── Botón flotante "Cambiar edificio" (sidebar cerrada) ───────────────── */
export function ChangeBuildingFloatingButton({ building, isMobile, onClick }) {
  return (
    <button
      type="button"
      className="v3d-pill v3d-pill-bottom v3d-pill-btn"
      style={{ bottom: isMobile ? 18 : 48 }}
      onClick={onClick}
      title="Cambiar edificio"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18" /><path d="M3 7l9-4 9 4" /><path d="M4 7v14" /><path d="M20 7v14" /><path d="M9 21v-8h6v8" />
      </svg>
      {building ? 'Cambiar edificio' : 'Seleccionar edificio'}
    </button>
  );
}

/* ─── Botón de ayuda de controles ───────────────────────────────────────── */
export function ControlsHelpButton({ isMobile, onClick, active = false }) {
  return (
    <button
      type="button"
      className={`v3d-btn${active ? ' is-active' : ''}`}
      style={{ position: 'absolute', right: isMobile ? 12 : 12, bottom: 96, zIndex: 25 }}
      onClick={onClick}
      title="Controles del visor"
      aria-label="Controles del visor"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 7h16v10H4z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /><path d="M8 15h8" />
      </svg>
    </button>
  );
}

/* ─── Botón Ver interior / Ver exterior ─────────────────────────────────── */
export function InteriorToggleButton({ interiorMode, isMobile, onClick }) {
  return (
    <button
      type="button"
      className={`v3d-interior-btn${interiorMode ? ' is-active' : ''}`}
      style={{ top: isMobile ? 14 : 14 }}
      onClick={onClick}
      title={interiorMode ? 'Ver exterior' : 'Ver interior'}
    >
      {interiorMode ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      )}
      {interiorMode ? 'Ver exterior' : 'Ver interior'}
    </button>
  );
}

/* ─── Pista en modo interior ────────────────────────────────────────────── */
export function InteriorHint({ isMobile }) {
  return (
    <div className="v3d-pill v3d-pill-bottom" style={{ bottom: isMobile ? 18 : 48, pointerEvents: 'none' }}>
      {isMobile
        ? 'Arrastra para mirar · toca un marcador para ir a ese espacio'
        : 'Arrastra para mirar · W A S D para caminar · rueda para avanzar · Esc para salir'}
    </div>
  );
}

/* ─── Aviso de límites ──────────────────────────────────────────────────── */
export function BoundsWarningToast({ isMobile }) {
  return (
    <div className="v3d-toast" style={{ top: isMobile ? 72 : 18 }}>
      Estás saliendo de la zona permitida
    </div>
  );
}

/* ─── Diálogo: cargar todos los modelos ─────────────────────────────────── */
export function ProximityConfirmDialog({ visible, isMobile, onCancel, onAccept }) {
  if (!visible) return null;

  return (
    <>
      <div className="v3d-dialog-backdrop" onClick={onCancel} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proximity-confirm-title"
        aria-describedby="proximity-confirm-description"
        className="v3d-dialog"
        style={{
          right: isMobile ? 12 : 58,
          top: 210,
          width: isMobile ? 'calc(100% - 24px)' : 340,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span className="v3d-dialog-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 9v4" /><path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </span>

          <div style={{ minWidth: 0, flex: 1 }}>
            <p id="proximity-confirm-title" className="v3d-dialog-title">
              Cargar todos los edificios
            </p>
            <p id="proximity-confirm-description" className="v3d-dialog-text">
              Se descargarán y mostrarán todos los modelos 3D a la vez. En dispositivos
              con poca memoria puede bajar el rendimiento del visor.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '0.8rem' }}>
              <button type="button" className="v3d-dialog-btn" onClick={onCancel}>Cancelar</button>
              <button type="button" className="v3d-dialog-btn is-primary" onClick={onAccept}>Cargar todo</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── WebGL no disponible ───────────────────────────────────────────────── */
export function WebGLErrorFallback() {
  return (
    <div className="v3d-webgl-fallback">
      <h3>WebGL no disponible</h3>
      <p>
        Tu navegador no puede inicializar el visor 3D. Actualiza Chrome o Firefox
        y verifica que la aceleración de hardware esté activada.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="https://www.google.com/chrome" target="_blank" rel="noreferrer" className="v3d-dialog-btn is-primary">Chrome</a>
        <a href="https://www.mozilla.org/firefox" target="_blank" rel="noreferrer" className="v3d-dialog-btn">Firefox</a>
      </div>
    </div>
  );
}
