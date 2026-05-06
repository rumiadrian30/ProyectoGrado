import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    n: '01', icon: '', title: 'Selecciona un edificio',
    desc: 'En la pantalla del explorador aparece automáticamente un selector con todos los edificios activos de la FIE. Haz clic en el que quieres explorar.',
  },
  {
    n: '02', icon: '', title: 'Navega por el modelo 3D',
    desc: 'Usa el ratón o los dedos (móvil) para rotar, acercar y desplazarte alrededor del edificio. Los controles están en la esquina inferior derecha del visor.',
  },
  {
    n: '03', icon: '', title: 'Haz clic en un hotspot',
    desc: 'Las esferas de colores que flotan sobre el modelo son los puntos de interés. Haz clic en uno para ver su información: nombre, descripción, horario y galería de fotos.',
  },
  {
    n: '04', icon: '', title: 'Usa el directorio',
    desc: 'Si buscas un espacio concreto, ve a la sección Directorio. Puedes filtrar por tipo (laboratorio, oficina, servicio) y por edificio, y hacer clic para ir directamente al visor.',
  },
];

const FAQ = [
  {
    q: '¿Necesito instalar algo para usar el visor 3D?',
    a: 'No. FIE Explorer 3D funciona completamente en el navegador. Solo necesitas Chrome, Firefox, Edge o Safari actualizados con soporte para WebGL (cualquier versión reciente lo tiene).',
  },
  {
    q: '¿Por qué no carga el modelo 3D de un edificio?',
    a: 'Puede que ese edificio aún no tenga un modelo 3D registrado. En ese caso el visor muestra una escena de demostración con la geometría básica. Los modelos se van añadiendo progresivamente.',
  },
  {
    q: '¿Cómo funciona la vista exterior e interior?',
    a: 'Con los botones del panel izquierdo puedes alternar entre la vista exterior del edificio y la vista interior por planta. Cada vista puede tener su propio modelo GLB registrado.',
  },
  {
    q: '¿Puedo usar el visor en el móvil?',
    a: 'Sí. El visor es responsivo y funciona en dispositivos móviles. Usa un dedo para rotar el modelo y dos dedos para hacer zoom. En pantallas pequeñas el panel lateral se oculta automáticamente.',
  },
  {
    q: '¿La información es actualizada en tiempo real?',
    a: 'Los datos de hotspots, horarios e imágenes se gestionan desde el panel de administración y se reflejan en el visor en el próximo acceso. No se requiere desplegar una nueva versión.',
  },
  {
    q: '¿Cómo reporto un error o información incorrecta?',
    a: 'Puedes contactar a la Escuela de Ingeniería en Sistemas de la ESPOCH. La información de cada espacio la gestiona el equipo de administración de la facultad.',
  },
];

function ControlRow({ keys, desc }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.65rem 0', borderBottom: '1px solid var(--color-border-soft)',
    }}>
      <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
        {keys.map(k => (
          <kbd key={k} style={{
            display: 'inline-block', padding: '0.2rem 0.55rem',
            background: '#fff', border: '1px solid var(--color-border)',
            borderBottom: '3px solid var(--color-border)',
            borderRadius: '5px', fontSize: '0.78rem', fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap',
          }}>{k}</kbd>
        ))}
      </div>
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-2)' }}>{desc}</span>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '0.5rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open ? 'var(--color-primary-50)' : '#fff',
          border: 'none', cursor: 'pointer', gap: '1rem',
          fontFamily: 'var(--font-body)', transition: 'background 150ms',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: open ? 'var(--color-primary)' : 'var(--color-text)' }}>
          {q}
        </span>
        <span style={{
          width: 22, height: 22, flexShrink: 0, borderRadius: '50%',
          background: open ? 'var(--color-primary)' : 'var(--color-bg-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', color: open ? '#fff' : 'var(--color-text-3)',
          transition: 'all 200ms', transform: open ? 'rotate(45deg)' : 'none',
        }}>✕</span>
      </button>
      {open && (
        <div style={{ padding: '0.85rem 1.25rem 1.1rem', background: '#fafafa', borderTop: '1px solid var(--color-border-soft)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', lineHeight: 1.7 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function Ayuda() {
  return (
    <main style={{ paddingTop: 'var(--nav-h)', background: '#fff', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a5f 100%)',
        padding: '4rem 1.5rem 3rem', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.15)',
            color: '#fff', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '0.3rem 1rem', borderRadius: 'var(--radius-full)', marginBottom: '1.25rem',
          }}>Centro de ayuda</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            fontWeight: 800, color: '#fff', marginBottom: '0.75rem',
          }}>¿Cómo usar FIE Explorer 3D?</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem' }}>
            Guía rápida para navegar por el visor interactivo del campus.
          </p>
        </div>
      </section>

      {/* Pasos */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem 3rem' }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.75rem',
        }}>Primeros pasos</p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.6rem',
          fontWeight: 800, color: 'var(--color-text)', marginBottom: '2.5rem',
        }}>En 4 pasos sencillos</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {STEPS.map(step => (
            <div key={step.n} style={{
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
              padding: '1.5rem', display: 'flex', gap: '1rem',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.78rem',
                flexShrink: 0,
              }}>{step.n}</div>
              <div>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>{step.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', marginBottom: '0.4rem' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-3)', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Controles */}
      <section style={{ background: 'var(--color-bg-soft)', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
          <div>
            <p style={{
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.75rem',
            }}>Escritorio</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '1.5rem' }}>
              Controles con ratón
            </h2>
            <ControlRow keys={['Clic + arrastrar']} desc="Rotar el modelo" />
            <ControlRow keys={['Scroll']}           desc="Zoom in / zoom out" />
            <ControlRow keys={['Clic derecho + arrastrar']} desc="Desplazar (paneo)" />
            <ControlRow keys={['Clic en hotspot']}  desc="Ver información del espacio" />
            <ControlRow keys={['R']}                desc="Resetear vista a posición inicial" />
          </div>
          <div>
            <p style={{
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.75rem',
            }}>Móvil / Tablet</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '1.5rem' }}>
              Gestos táctiles
            </h2>
            <ControlRow keys={['1 dedo']}           desc="Rotar el modelo" />
            <ControlRow keys={['2 dedos']}           desc="Zoom in / zoom out (pellizco)" />
            <ControlRow keys={['3 dedos']}           desc="Desplazar (paneo)" />
            <ControlRow keys={['Toque en hotspot']}  desc="Ver información del espacio" />
            <ControlRow keys={['Botón ⌂']}           desc="Resetear vista" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.75rem',
        }}>FAQ</p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.6rem',
          fontWeight: 800, color: 'var(--color-text)', marginBottom: '2rem',
        }}>Preguntas frecuentes</h2>
        {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
      </section>

      {/* CTA */}
      <section style={{
        maxWidth: 900, margin: '0 auto 4rem', padding: '0 1.5rem',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a5f 100%)',
          borderRadius: 'var(--radius-xl)', padding: '2.5rem',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: '1.5rem',
        }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: '#fff', marginBottom: '0.4rem' }}>
              ¿Todo listo?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
              Comienza a explorar los edificios de la FIE en 3D.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/directorio" style={{
              padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.3)',
            }}>Ver directorio</Link>
            <Link to="/explorar" style={{
              padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-full)',
              background: '#fff', color: 'var(--color-primary)',
              fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
            }}>Explorar 3D →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
