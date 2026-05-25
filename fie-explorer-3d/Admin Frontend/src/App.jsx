/**
 * App.jsx — Punto de entrada principal del Admin Frontend
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { setToken, clearToken, onUnauthorized } from './api'
import { encryptedSession } from './utils/encryptedStorage'
import { useContextMenuGuard } from './hooks/useContextMenuGuard'
import AdminLogin from './AdminLogin'
import AdminShell from './AdminShell'
import Toast from './components/Toast'
import { jwtDecode } from 'jwt-decode'

const DEFAULT_INACTIVITY_MIN = 15

export default function App() {
  useContextMenuGuard()

  const [toast,         setToast]         = useState(null)
  const [user,          setUser]           = useState(() => {
    try {
      const saved = encryptedSession.getItem('admin_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [inactivityMs, setInactivityMs]   = useState(DEFAULT_INACTIVITY_MIN * 60 * 1000)

  const inactivityMsRef = useRef(DEFAULT_INACTIVITY_MIN * 60 * 1000)
  const inactivityTimer = useRef(null)

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg, type = 'success', duration = 3500) {
    setToast({ msg, type })
    setTimeout(() => setToast(null), duration)
  }

  // ── Cargar session.token_expires_minutes desde la BD ─────────────────────────
  async function loadSessionConfig() {
    try {
      const token = encryptedSession.getItem('admin_token')
      if (!token) return
      const res = await fetch('/api/settings/config', {
        credentials: 'include',
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!res.ok) return
      const data = await res.json()
      const s = (data.groups?.session ?? [])
        .find(s => s.config_key === 'session.token_expires_minutes')
      const n = s ? parseInt(s.config_value) : NaN
      if (!isNaN(n) && n > 0) {
        inactivityMsRef.current = n * 60 * 1000
        setInactivityMs(n * 60 * 1000)   // actualiza el prop de AdminShell
      }
    } catch {
      // Sin conexión: se mantiene el fallback
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  function handleLogout(expired = false) {
    clearTimeout(inactivityTimer.current)

    // Notificar al backend antes de limpiar el token
    const token = encryptedSession.getItem('admin_token')
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ reason: expired ? 'inactivity' : 'manual' }),
      }).catch(() => {})  
    }

    clearToken()
    setUser(null)
    if (expired) {
      showToast('Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.', 'error', 5000)
    }
  }

  // ── Timer de inactividad ──────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(() => handleLogout(true), inactivityMsRef.current)
  }, [])

  // ── Escuchar actividad del usuario ────────────────────────────────────────
  const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'click']

  useEffect(() => {
    if (!user) return
    loadSessionConfig().then(() => resetInactivityTimer())
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetInactivityTimer, { passive: true })
    )
    return () => {
      clearTimeout(inactivityTimer.current)
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetInactivityTimer)
      )
    }
  }, [user, resetInactivityTimer])

  // ── Logout automático ante 401 del backend ────────────────────────────────
  useEffect(() => {
    onUnauthorized(() => handleLogout(true))
  }, [])

  // ── Validar JWT al recuperar el foco ─────────────────────────────────────
  useEffect(() => {
    function validateSession() {
      const token = encryptedSession.getItem('admin_token')
      if (!token) return
      try {
        const decoded = jwtDecode(token)
        if (decoded.exp * 1000 <= Date.now()) handleLogout(true)
      } catch {
        handleLogout(true)
      }
    }
    window.addEventListener('focus', validateSession)
    document.addEventListener('visibilitychange', validateSession)
    validateSession()
    return () => {
      window.removeEventListener('focus', validateSession)
      document.removeEventListener('visibilitychange', validateSession)
    }
  }, [])

  // ── Login exitoso ─────────────────────────────────────────────────────────
  function handleSuccess(token, userData) {
    try {
      const decoded = jwtDecode(token)
      if (decoded.exp && decoded.exp * 1000 <= Date.now()) {
        showToast('El token recibido ya está expirado.', 'error')
        return
      }
    } catch {
      showToast('Token inválido.', 'error')
      return
    }
    setToken(token)
    encryptedSession.setItem('admin_user', JSON.stringify(userData))
    setUser(userData)
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {!user
        ? <AdminLogin onSuccess={handleSuccess} />
        : <AdminShell user={user} onLogout={handleLogout} inactivityMs={inactivityMs} />
      }
    </>
  )
}