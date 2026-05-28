/**
 * BuildingAccordion.jsx
 */

import React, { useState, useRef, useEffect } from 'react';

/* ─── Estilos inyectados (una sola vez) ──────────────────────────────────── */
const ACCORDION_CSS = `
  /* Variable extra que no existe en Directorio todavía */
  :root {
    --red-02: rgba(188,6,19,.02);
    --red-04: rgba(188,6,19,.04);
    --red-08: rgba(188,6,19,.08);
  }

  /* Transición de altura real con max-height */
  .acc-body {
    overflow: hidden;
    max-height: 0;
    transition: max-height .42s cubic-bezier(.16,1,.3,1),
                opacity    .35s cubic-bezier(.16,1,.3,1);
    opacity: 0;
  }
  .acc-body.open {
    opacity: 1;
    /* max-height se setea via JS en el ref */
  }

  /* Trigger: transiciones de fondo y borde */
  .acc-trigger {
    border-radius: 14px;
    border: 1px solid var(--red-10);
    background: var(--red-02);
    cursor: pointer;
    transition:
      background   .22s cubic-bezier(.16,1,.3,1),
      border-color .22s cubic-bezier(.16,1,.3,1),
      border-left-width .22s cubic-bezier(.16,1,.3,1),
      box-shadow   .22s cubic-bezier(.16,1,.3,1);
    outline: none;
    width: 100%;
    text-align: left;
    padding: 0;
  }
  .acc-trigger:hover {
    background: var(--red-08);
    border-color: var(--red-18);
    box-shadow: 0 2px 12px rgba(188,6,19,.06);
  }
  .acc-trigger.is-open {
    background: var(--red-06);
    border-color: var(--red-18);
    border-left: 4px solid var(--red);
    box-shadow: 0 4px 20px rgba(188,6,19,.08);
  }
  .acc-trigger:focus-visible {
    outline: 2px solid var(--red);
    outline-offset: 3px;
  }

  /* Chevron rotación */
  .acc-chevron {
    transition: transform .38s cubic-bezier(.16,1,.3,1);
    flex-shrink: 0;
    color: var(--red);
  }
  .acc-chevron.rotated {
    transform: rotate(180deg);
  }

  /* Badge contador */
  .acc-count-badge {
    font-family: 'Outfit', sans-serif;
    font-size: .65rem;
    font-weight: 700;
    letter-spacing: .08em;
    padding: .2rem .65rem;
    border-radius: 999px;
    background: rgba(188,6,19,.06);
    border: 1px solid rgba(188,6,19,.14);
    color: var(--ink);
    white-space: nowrap;
    transition: background .22s, color .22s, border-color .22s;
  }
  .acc-trigger.is-open .acc-count-badge {
    background: rgba(188,6,19,.12);
    border-color: rgba(188,6,19,.25);
    color: var(--red);
  }

  /* Icono casa */
  .acc-icon-wrap {
    width: 38px; height: 38px;
    border-radius: 50%;
    background: var(--red-06);
    border: 1px solid var(--red-10);
    display: flex; align-items: center; justify-content: center;
    color: var(--red);
    flex-shrink: 0;
    transition: background .22s, border-color .22s, transform .22s cubic-bezier(.16,1,.3,1);
  }
  .acc-trigger.is-open .acc-icon-wrap {
    background: rgba(188,6,19,.12);
    border-color: rgba(188,6,19,.25);
    transform: scale(1.07);
  }

  /* Código del edificio — pastilla rectangular */
  .acc-code-tag {
    font-family: 'Outfit', sans-serif;
    font-size: .62rem; font-weight: 800;
    letter-spacing: .1em; text-transform: uppercase;
    color: var(--red);
    padding: .28rem .75rem;
    border: 1.5px solid var(--red-18);
    border-radius: 7px;
    background: var(--white);
    flex-shrink: 0;
    transition: background .22s, border-color .22s;
  }
  .acc-trigger.is-open .acc-code-tag {
    background: var(--red);
    color: #fff;
    border-color: var(--red);
  }
`;

let cssInjected = false;
function useAccordionCSS() {
  useEffect(() => {
    if (cssInjected) return;
    const id = 'fie-accordion-v1';
    if (document.getElementById(id)) { cssInjected = true; return; }
    const el = Object.assign(document.createElement('style'), { id, textContent: ACCORDION_CSS });
    document.head.appendChild(el);
    cssInjected = true;
  }, []);
}

/* ─── Icono Building (casa) ──────────────────────────────────────────────── */
function BuildingIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V12h6v9"/>
    </svg>
  );
}

/* ─── Icono Chevron ──────────────────────────────────────────────────────── */
function ChevronIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

/* ─── BuildingAccordion ──────────────────────────────────────────────────── */
export default function BuildingAccordion({ group, defaultOpen = false, children }) {
  useAccordionCSS();

  const [isOpen, setIsOpen]     = useState(defaultOpen);
  const [isHover, setIsHover]   = useState(false);
  const bodyRef                 = useRef(null);

  /* Animación de altura real: setea max-height al scroll-height del body */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (isOpen) {
      el.style.maxHeight = el.scrollHeight + 'px';
    } else {
      el.style.maxHeight = '0px';
    }
  }, [isOpen]);

  /* Re-calcular max-height si el contenido interno cambia */
  useEffect(() => {
    if (!isOpen || !bodyRef.current) return;
    const ro = new ResizeObserver(() => {
      if (bodyRef.current && isOpen) {
        bodyRef.current.style.maxHeight = bodyRef.current.scrollHeight + 'px';
      }
    });
    ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, [isOpen]);

  const toggleOpen = () => setIsOpen(v => !v);

  return (
    <div style={{ marginBottom: '1.5rem' }}>

      {/* ── Trigger / Header ── */}
      <button
        type="button"
        className={`acc-trigger${isOpen ? ' is-open' : ''}`}
        onClick={toggleOpen}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        aria-expanded={isOpen}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.25rem',
        }}>

          {/* ── Lado izquierdo ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', minWidth: 0 }}>

            {/* Ícono */}
            <div className="acc-icon-wrap">
              <BuildingIcon size={16} />
            </div>

            {/* Texto */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', flexWrap: 'wrap' }}>
                <h2 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(.95rem, 2vw, 1.15rem)',
                  color: 'var(--red)',
                  margin: 0,
                  letterSpacing: '-.018em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {group.name}
                </h2>
                <span className="acc-code-tag">{group.code}</span>
              </div>
            </div>
          </div>

          {/* ── Lado derecho ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexShrink: 0 }}>
            <span className="acc-count-badge">
              {group.items.length} espacio{group.items.length !== 1 ? 's' : ''}
            </span>
            <span className={`acc-chevron${isOpen ? ' rotated' : ''}`}>
              <ChevronIcon size={17} />
            </span>
          </div>

        </div>
      </button>

      {/* ── Body colapsable ── */}
      <div
        ref={bodyRef}
        className={`acc-body${isOpen ? ' open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div style={{ paddingTop: '1.25rem' }}>
          {children}
        </div>
      </div>

    </div>
  );
}