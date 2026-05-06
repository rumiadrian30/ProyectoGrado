import React from 'react';
import { Link } from 'react-router-dom';

function Section({ children, style = {} }) {
  return (
    <section style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem', ...style }}>
      {children}
    </section>
  );
}

function CardInfo({ icon, title, children }) {
  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
      padding: '1.5rem', background: '#fff',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', lineHeight: 1.65 }}>{children}</p>
    </div>
  );
}

export default function AcercaDe() {
  return (
    <main style={{ paddingTop: 'var(--nav-h)', background: '#fff', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a5f 100%)',
        padding: '5rem 1.5rem 4rem', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.15)',
            color: '#fff', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '0.3rem 1rem', borderRadius: 'var(--radius-full)', marginBottom: '1.5rem',
          }}>Proyecto de titulación · EIS — ESPOCH</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '1rem',
          }}>FIE Explorer 3D</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', lineHeight: 1.7 }}>
            Visor interactivo 3D del campus de la Facultad de Informática y Electrónica
            de la Escuela Superior Politécnica de Chimborazo.
          </p>
        </div>
      </section>

      {/* ¿Qué es? */}
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <p style={{
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.75rem',
            }}>¿Qué es?</p>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.75rem',
              fontWeight: 800, color: 'var(--color-text)', marginBottom: '1rem', lineHeight: 1.25,
            }}>Una nueva forma de conocer la FIE</h2>
            <p style={{ color: 'var(--color-text-3)', lineHeight: 1.75, marginBottom: '1rem' }}>
              FIE Explorer 3D es una aplicación web que permite explorar de forma interactiva
              los edificios, laboratorios, oficinas y espacios de servicio de la Facultad de
              Informática y Electrónica mediante modelos 3D navegables en el navegador.
            </p>
            <p style={{ color: 'var(--color-text-3)', lineHeight: 1.75 }}>
              Cada punto de interés (hotspot) contiene información descriptiva, horarios de
              atención y galería de imágenes del espacio, pensado para orientar a estudiantes,
              docentes y visitantes del campus.
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary-50) 0%, rgba(0,48,135,0.08) 100%)',
            borderRadius: 'var(--radius-xl)', padding: '2.5rem',
            display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            {[
              { n: '3D', label: 'Visualización interactiva en tiempo real' },
              { n: '360°', label: 'Navegación libre alrededor del modelo' },
              { n: 'Web', label: 'Sin instalación — corre en el navegador' },
            ].map(({ n, label }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem',
                  flexShrink: 0,
                }}>{n}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Tecnologías */}
      <section style={{ background: 'var(--color-bg-soft)', padding: '4rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--color-primary)',
            textAlign: 'center', marginBottom: '0.75rem',
          }}>Stack tecnológico</p>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.6rem',
            fontWeight: 800, color: 'var(--color-text)',
            textAlign: 'center', marginBottom: '2.5rem',
          }}>Construido con tecnología web moderna</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            <CardInfo icon="⚛️" title="React + Vite">
              Frontend SPA con renderizado eficiente, lazy loading de páginas y estado global con Zustand.
            </CardInfo>
            <CardInfo icon="🎮" title="Three.js + WebGL">
              Motor de renderizado 3D en el navegador. Carga modelos GLB con texturas, sombras y niebla ambiental.
            </CardInfo>
            <CardInfo icon="🟢" title="Node.js + Express">
              API REST con autenticación JWT (bcrypt 12), cookies HttpOnly y rate limiting por IP.
            </CardInfo>
            <CardInfo icon="🐘" title="PostgreSQL + pgcrypto">
              Base de datos relacional con cifrado AES-256 en columnas sensibles de audit_logs.
            </CardInfo>
            <CardInfo icon="🔐" title="Seguridad">
              Helmet (CSP, HSTS, nosniff), sanitización de entradas, bloqueo progresivo de cuentas.
            </CardInfo>
            <CardInfo icon="📐" title="Blender">
              Los modelos 3D de los edificios fueron modelados y exportados en formato GLB optimizado.
            </CardInfo>
          </div>
        </div>
      </section>

      {/* Equipo */}
      <Section>
        

        {/* CTA */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #1e3a5f 100%)',
          borderRadius: 'var(--radius-xl)', padding: '2.5rem',
          textAlign: 'center',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
            ¿Listo para explorar la FIE?
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '1.5rem' }}>
            Navega por los edificios en 3D y descubre todos los espacios del campus.
          </p>
          <Link to="/explorar" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: '#fff', color: 'var(--color-primary)',
            padding: '0.75rem 2rem', borderRadius: 'var(--radius-full)',
            fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
            transition: 'all var(--transition)',
          }}>
            Ir al explorador 3D
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </Section>
    </main>
  );
}
