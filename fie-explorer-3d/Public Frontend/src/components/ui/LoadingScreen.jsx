import logoLight from '../../assets/logo-light.svg';
import React from 'react';

export default function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1.5rem',
    }}>
      {/* Spinner */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg viewBox="0 0 72 72" fill="none" width="72" height="72">
          <circle cx="36" cy="36" r="34" stroke="#e4e7ed" strokeWidth="2"/>
          <circle cx="36" cy="36" r="34" stroke="#BC0613" strokeWidth="2.5"
            strokeDasharray="213" strokeDashoffset="160"
            style={{ transformOrigin: '50% 50%', animation: 'spin 1.2s linear infinite' }}/>
        </svg>
      </div>

      {/* Logo */}
      <img src={logoLight} alt="Explorador 3D FIE" style={{ height: '48px', width: 'auto', marginTop: '4px' }} />

      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '0.85rem',
        color: '#6b7280',
        marginTop: '0.25rem',
      }}>{message}</p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
