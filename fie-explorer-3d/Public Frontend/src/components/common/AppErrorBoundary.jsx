// AppErrorBoundary.jsx
import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary] Error capturado:', error);
    console.error('[AppErrorBoundary] Info:', info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FDFAF9',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 460,
          padding: '2rem',
          borderRadius: 18,
          background: '#ffffff',
          border: '1px solid rgba(188,6,19,.12)',
          boxShadow: '0 20px 50px rgba(0,0,0,.08)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: 'rgba(188,6,19,.08)',
            color: '#BC0613',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </div>

          <h2 style={{
            margin: 0,
            color: '#111827',
            fontSize: '1.25rem',
            fontWeight: 800,
            letterSpacing: '-.02em',
          }}>
            Algo salió mal
          </h2>

          <p style={{
            margin: '.75rem 0 1.5rem',
            color: '#6b7280',
            fontSize: '.9rem',
            lineHeight: 1.6,
          }}>
            No se pudo cargar correctamente esta sección. Puedes recargar la página o volver al inicio.
          </p>

          <div style={{
            display: 'flex',
            gap: '.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '.65rem 1rem',
                borderRadius: 999,
                border: 'none',
                background: '#BC0613',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              style={{
                padding: '.65rem 1rem',
                borderRadius: 999,
                border: '1px solid rgba(0,0,0,.12)',
                background: '#fff',
                color: '#374151',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}