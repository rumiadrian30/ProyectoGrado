import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAdminStore } from '../store/adminStore';

export default function Login() {
  const navigate = useNavigate();
  const { token, setAuth } = useAdminStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (token) navigate('/admin', { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.login(form.email, form.password);
      setAuth(data.token, data.user);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Error de conexión. Verifica el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      paddingTop: 'var(--nav-h)',
      background: 'var(--color-bg-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(var(--nav-h) + 2rem) 1rem 2rem',
    }}>

      {/* Fondo decorativo */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,48,135,0.07) 0%, transparent 70%)`,
      }}/>

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420,
        animation: 'fadeIn .4s ease',
      }}>

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}>

          {/* Header de la card */}
          <div style={{
            padding: '2rem 2rem 1.5rem',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-400) 100%)',
            textAlign: 'center',
          }}>
            {/* Logo */}
            <div style={{
              width: 56, height: 56,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 22L14 6L22 22" stroke="#E8C84A" strokeWidth="2.5"
                  strokeLinejoin="round" fill="none"/>
                <path d="M8.5 17L19.5 17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="14" cy="6" r="2.5" fill="#E8C84A"/>
              </svg>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.35rem', fontWeight: 800,
              color: '#fff', marginBottom: '0.25rem',
            }}>Panel Administrativo</h1>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
              FIE Explorer 3D · ESPOCH
            </p>
          </div>

          {/* Formulario */}
          <div style={{ padding: '1.75rem 2rem 2rem' }}>
            <form onSubmit={handleSubmit}>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem', fontWeight: 600,
                  color: 'var(--color-text-2)',
                  marginBottom: '0.4rem',
                }}>
                  Correo institucional
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="usuario@espoch.edu.ec"
                  required
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    color: 'var(--color-text)',
                    transition: 'border-color var(--transition)',
                    background: '#fff',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem', fontWeight: 600,
                  color: 'var(--color-text-2)',
                  marginBottom: '0.4rem',
                }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem',
                      color: 'var(--color-text)',
                      transition: 'border-color var(--transition)',
                      background: '#fff',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    style={{
                      position: 'absolute', right: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', padding: '0.25rem',
                      color: 'var(--color-text-3)',
                    }}
                  >
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  background: loading ? 'var(--color-border)' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600, fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                {loading && (
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}/>
                )}
                {loading ? 'Ingresando...' : 'Ingresar al panel'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link to="/" style={{
                fontSize: '0.8rem', color: 'var(--color-text-3)',
                textDecoration: 'none',
              }}>
                ← Volver al explorador público
              </Link>
            </div>
          </div>
        </div>

        <p style={{
          textAlign: 'center', marginTop: '1rem',
          fontSize: '0.72rem', color: 'var(--color-text-4)',
        }}>
          Acceso restringido a administradores autorizados · FIE-ESPOCH
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
