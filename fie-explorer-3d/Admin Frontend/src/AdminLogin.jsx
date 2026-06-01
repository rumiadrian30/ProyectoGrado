import { useState, useRef, useEffect } from 'react'

const API = '/api'

async function postLogin(email, password) {
  const res = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Correo o contraseña incorrectos.'), { data })
  return data
}

export default function AdminLogin({ onSuccess }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const emailRef = useRef(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { emailRef.current?.focus() }, [])

  async function doLogin(e) {
    e?.preventDefault()
    if (!email.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      const res = await postLogin(email.trim(), password)
      onSuccess?.(res.token, res.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">

        {/* Header rojo */}
        <div className="login-header-block">
          <div className="login-badge">
            <span className="login-badge-dot" />
            Acceso restringido
          </div>
          <div className="login-icon-wrap" aria-hidden="true">
            {/* ícono de candado — usa el que tengas disponible */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2>Panel de administración</h2>
          <p>Solo personal autorizado · ESPOCH</p>
        </div>

        {/* Cuerpo */}
        <div className="login-body">
          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={doLogin} action="#" method="post" autoComplete="on">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Correo institucional
              </label>
              <input
                id="login-email"
                ref={emailRef}
                type="email"
                name="email"
                className="form-input"
                placeholder="correo@espoch.edu.ec"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="username email"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Contraseña
              </label>
              <div className="input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input has-toggle"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="btn-password-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !email.trim() || !password}
            >
              {loading ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>

          <div className="login-footer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Conexión segura · Explorador 3D FIE
          </div>
        </div>

      </div>
    </div>
  )
}