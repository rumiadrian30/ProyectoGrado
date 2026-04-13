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
      {/* Logo mark */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" width="72" height="72">
          <circle cx="36" cy="36" r="34" stroke="#e4e7ed" strokeWidth="2"/>
          <circle cx="36" cy="36" r="34" stroke="#003087" strokeWidth="2"
            strokeDasharray="213" strokeDashoffset="160"
            style={{ transformOrigin: '50% 50%', animation: 'spin 1.2s linear infinite' }}/>
          <path d="M24 54 L36 20 L48 54" stroke="#003087" strokeWidth="3"
            strokeLinejoin="round" fill="none"/>
          <path d="M27 44 L45 44" stroke="#E8C84A" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="36" cy="20" r="3.5" fill="#E8C84A"/>
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '1rem',
          color: '#003087',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>FIE Explorer 3D</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.85rem',
          color: '#6b7280',
          marginTop: '0.25rem',
        }}>{message}</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
