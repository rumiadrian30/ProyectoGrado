import { useState, useRef, useEffect } from 'react'
import logo from './assets/logo-app.png';

const API = '/api'

async function postLogin(email, password) {
  const res  = await fetch(API + '/auth/login', {
    method:      'POST',
    headers:     { 'Content-Type': 'application/json' },
    credentials: 'include',
    body:        JSON.stringify({ email, password }),
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
      // El backend ya devuelve el mensaje completo con intentos/bloqueo incluidos
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <img src={logo} alt="Logo" />
        </div>
        <div className="login-title">
          <h2>FIE Explorer 3D</h2>
          <p>Panel de administración</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={doLogin} action="#" method="post" autoComplete="on">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Correo institucional</label>
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
            <label className="form-label" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              name="password"
              className="form-input"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>

        <div className="divider" />
        <p className="hint">Acceso restringido · Solo personal autorizado FIE</p>
      </div>
    </div>
  )
}
