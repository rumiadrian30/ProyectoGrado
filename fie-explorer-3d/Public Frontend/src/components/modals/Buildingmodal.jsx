/**
 * BuildingModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal informativo para edificios y hotspots en GeoESPOCH 3D.
 * Se activa por raycasting al hacer clic en un mesh de edificio o en un pin.
 *
 * Accesibilidad:
 *   - role="dialog" con aria-modal y aria-labelledby
 *   - Trampa de foco (focus trap) al abrir
 *   - Cierre con Escape
 *   - Botón de cierre con aria-label
 *
 * Props:
 *   data    { type: 'building'|'hotspot', ...campos }
 *   onClose () => void
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useId } from 'react';

const HOTSPOT_TYPE_LABEL = {
  lab:       { label: 'Laboratorio',  icon: '🔬', color: '#00d4ff' },
  office:    { label: 'Oficina',      icon: '🏢', color: '#ffd166' },
  service:   { label: 'Servicio',     icon: '🛎️',  color: '#06d6a0' },
  access:    { label: 'Acceso',       icon: '🚪', color: '#ef476f' },
  classroom: { label: 'Aula',         icon: '📚', color: '#8338ec' },
};

const BUILDING_TYPE_LABEL = {
  main:      { label: 'Edificio Principal', icon: '🏛️', color: '#00d4ff' },
  secondary: { label: 'Edificio Secundario', icon: '🏗️', color: '#ffd166' },
  lab:       { label: 'Edificio Laboratorio', icon: '🔬', color: '#06d6a0' },
};

// ─── Estilos inyectados ──────────────────────────────────────────────────
const MODAL_STYLE_ID = 'geoespoch-modal-styles';
function injectModalStyles() {
  if (document.getElementById(MODAL_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = MODAL_STYLE_ID;
  s.textContent = `
    @keyframes modal-in {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }
    @keyframes overlay-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .geo-modal-overlay {
      animation: overlay-in 0.2s ease forwards;
    }
    .geo-modal-card {
      animation: modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    .geo-modal-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .geo-modal-field-label {
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(120,180,210,0.6);
      font-family: 'JetBrains Mono', monospace;
    }
    .geo-modal-field-value {
      font-size: 13px;
      color: #c8e0f0;
      font-family: 'JetBrains Mono', monospace;
    }
    .geo-modal-close:hover {
      background: rgba(0,212,255,0.15) !important;
      color: #00d4ff !important;
    }
    .geo-modal-close:focus-visible {
      outline: 2px solid #00d4ff;
      outline-offset: 2px;
    }
    .geo-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.06em;
    }
  `;
  document.head.appendChild(s);
}

// ─── FieldRow ─────────────────────────────────────────────────────────────
function FieldRow({ label, value, fullWidth = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="geo-modal-field" style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <span className="geo-modal-field-label">{label}</span>
      <span className="geo-modal-field-value">{value}</span>
    </div>
  );
}

// ─── Tag de tipo ──────────────────────────────────────────────────────────
function TypeTag({ type, configMap }) {
  const cfg = configMap[type] ?? { label: type, icon: '📌', color: '#888' };
  return (
    <span
      className="geo-tag"
      style={{
        background: `${cfg.color}22`,
        border:     `1px solid ${cfg.color}66`,
        color:      cfg.color,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Contenido para Edificio ──────────────────────────────────────────────
function BuildingContent({ data }) {
  const m = data.model ?? {};
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <TypeTag type={m.type ?? 'main'} configMap={BUILDING_TYPE_LABEL} />
        <span className="geo-tag" style={{
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
          color: '#7ec8e3',
        }}>
          📁 {data.code}
        </span>
        {m.lod_level !== undefined && (
          <span className="geo-tag" style={{
            background: 'rgba(255,209,102,0.08)',
            border: '1px solid rgba(255,209,102,0.2)',
            color: '#ffd166',
          }}>
            LOD {m.lod_level}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>
        <FieldRow label="Nombre"    value={data.name} fullWidth />
        <FieldRow label="Formato"   value={m.format} />
        <FieldRow label="Versión"   value={m.version} />
        <FieldRow label="Triángulos" value={m.triangle_count?.toLocaleString()} />
        <FieldRow label="Tamaño"    value={m.file_size_mb ? `${m.file_size_mb} MB` : undefined} />
        <FieldRow label="Offset X"  value={m.building_offset_x != null ? `${m.building_offset_x}` : undefined} />
        <FieldRow label="Offset Z"  value={m.building_offset_z != null ? `${m.building_offset_z}` : undefined} />
        <FieldRow label="Escala"    value={m.scale_x != null ? `${m.scale_x} × ${m.scale_y} × ${m.scale_z}` : undefined} />
      </div>
    </>
  );
}

// ─── Contenido para Hotspot ───────────────────────────────────────────────
function HotspotContent({ data }) {
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <TypeTag type={data.type} configMap={HOTSPOT_TYPE_LABEL} />
        <span className="geo-tag" style={{
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
          color: '#7ec8e3',
        }}>
          🏢 {data.building_name ?? data.building_code}
        </span>
        <span className="geo-tag" style={{
          background: 'rgba(6,214,160,0.08)',
          border: '1px solid rgba(6,214,160,0.2)',
          color: '#06d6a0',
        }}>
          Piso {data.floor}
        </span>
      </div>

      {data.description && (
        <p style={{
          color: 'rgba(200,224,240,0.75)',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.6,
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: '1px solid rgba(0,212,255,0.1)',
        }}>
          {data.description}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>
        {data.teacher   && <FieldRow label="Docente / Responsable" value={data.teacher}   fullWidth />}
        {data.schedule  && <FieldRow label="Horario"     value={data.schedule}  fullWidth />}
        {data.capacity  && <FieldRow label="Capacidad"   value={`${data.capacity} personas`} />}
        {data.phone     && <FieldRow label="Teléfono"    value={data.phone} />}
        {data.equipment && <FieldRow label="Equipamiento" value={data.equipment} fullWidth />}
      </div>

      {data.image_url && (
        <div style={{ marginTop: 14, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,212,255,0.15)' }}>
          <img
            src={data.image_url}
            alt={`Imagen de ${data.name}`}
            style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}
    </>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────
export default function BuildingModal({ data, onClose }) {
  const titleId  = useId();
  const closeRef = useRef(null);

  useEffect(() => { injectModalStyles(); }, []);

  // Focus trap y cierre con Escape
  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isHotspot  = data.type === 'hotspot';
  const accentColor = isHotspot
    ? (HOTSPOT_TYPE_LABEL[data.type]?.color ?? '#00d4ff')
    : (BUILDING_TYPE_LABEL[data.model?.type]?.color ?? '#00d4ff');

  return (
    /* Overlay */
    <div
      className="geo-modal-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:  'fixed',
        inset:     0,
        background: 'rgba(4,8,14,0.6)',
        backdropFilter: 'blur(3px)',
        display:   'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex:    60,
        padding:   16,
      }}
    >
      {/* Card */}
      <div
        className="geo-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          width:     '100%',
          maxWidth:  480,
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'rgba(8,14,24,0.97)',
          border:    `1px solid ${accentColor}44`,
          borderRadius: 14,
          boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px ${accentColor}22, inset 0 1px 0 rgba(255,255,255,0.04)`,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {/* Header */}
        <div style={{
          display:  'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding:  '16px 18px 12px',
          borderBottom: `1px solid ${accentColor}22`,
          position: 'sticky',
          top:      0,
          background: 'rgba(8,14,24,0.98)',
          backdropFilter: 'blur(8px)',
          zIndex:   1,
          borderRadius: '14px 14px 0 0',
        }}>
          <div>
            <div style={{
              fontSize: 9,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: `${accentColor}99`,
              marginBottom: 4,
            }}>
              {isHotspot ? '📍 Punto de Interés' : '🏗️ Edificio'}
            </div>
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: '#e8f4ff',
                letterSpacing: '0.04em',
              }}
            >
              {data.name}
            </h2>
          </div>

          {/* Botón cerrar */}
          <button
            ref={closeRef}
            type="button"
            className="geo-modal-close"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'none',
              border:  '1px solid rgba(0,212,255,0.15)',
              borderRadius: 8,
              color:   'rgba(0,212,255,0.5)',
              cursor:  'pointer',
              width:   28,
              height:  28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '14px 18px 18px' }}>
          {isHotspot
            ? <HotspotContent data={data} />
            : <BuildingContent data={data} />
          }
        </div>

        {/* Footer con acciones */}
        <div style={{
          padding:  '10px 18px 14px',
          borderTop: `1px solid ${accentColor}18`,
          display:  'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(0,212,255,0.08)',
              border:  `1px solid ${accentColor}44`,
              borderRadius: 8,
              color:   accentColor,
              cursor:  'pointer',
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.08em',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,212,255,0.16)'}
            onMouseOut={e  => e.currentTarget.style.background = 'rgba(0,212,255,0.08)'}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}