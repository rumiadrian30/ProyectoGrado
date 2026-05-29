import logoLight from '../../assets/fie_navbar_claro.svg';
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/',           label: 'Inicio' },
  { to: '/explorar',   label: 'Explorar' },
  { to: '/directorio', label: 'Directorio' },
  { to: '/acerca-de',  label: 'Acerca de' },
  { to: '/ayuda',      label: 'Ayuda' },
];

export default function Navbar() {
  const location  = useLocation();
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  const isExplorer = location.pathname.startsWith('/explorar');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Cerrar menú al navegar
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      height: 'var(--nav-h)',
      background: scrolled || isExplorer
        ? 'rgba(255,255,255,0.97)'
        : 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(16px)',
      borderBottom: scrolled || isExplorer
        ? '1px solid var(--color-border)'
        : '1px solid transparent',
      transition: 'all 300ms ease',
    }}>
      <nav style={{
        maxWidth: 1280, margin: '0 auto', height: '100%',
        padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src={logoLight} alt="Explorador 3D FIE" style={{ height: '54px', width: 'auto' }} />
        </Link>

        {/* Desktop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }} className="nav-desktop">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} label={label} active={isActive(to)} />
          ))}
        </div>

        {/* Botón hamburguesa */}
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="nav-burger"
          style={{ display: 'none', background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' }}
          aria-label="Menú"
        >
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--color-text)', transition: 'all var(--transition)', marginBottom: 5, transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none' }}/>
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--color-text)', opacity: menuOpen ? 0 : 1, transition: 'all var(--transition)', marginBottom: 5 }}/>
          <span style={{ display: 'block', width: 22, height: 2, background: 'var(--color-text)', transition: 'all var(--transition)', transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }}/>
        </button>
      </nav>

      {/* Menú móvil */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', borderBottom: '1px solid var(--color-border)',
          padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column',
          gap: '0.4rem', boxShadow: 'var(--shadow-md)', animation: 'slideUp 0.2s ease',
        }}>
          {NAV_LINKS.map(({ to, label }) => (
            <MobileNavLink key={to} to={to} label={label}
              active={isActive(to)} onClick={() => setMenuOpen(false)} />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-burger  { display: block !important; }
        }
      `}</style>
    </header>
  );
}

function NavLink({ to, label, active }) {
  return (
    <Link to={to} style={{
      padding: '0.4rem 0.85rem', fontFamily: 'var(--font-body)',
      fontSize: '0.875rem', fontWeight: 500,
      color: active ? 'var(--color-primary)' : 'var(--color-text-2)',
      borderRadius: 'var(--radius-full)',
      background: active ? 'var(--color-primary-50)' : 'transparent',
      transition: 'all var(--transition)', textDecoration: 'none',
    }}>{label}</Link>
  );
}

function MobileNavLink({ to, label, active, onClick }) {
  return (
    <Link to={to} onClick={onClick} style={{
      padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: active ? 600 : 500,
      color: active ? 'var(--color-primary)' : 'var(--color-text)',
      borderRadius: 'var(--radius-md)',
      background: active ? 'var(--color-primary-50)' : 'var(--color-bg-soft)',
      textDecoration: 'none', borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent',
    }}>{label}</Link>
  );
}