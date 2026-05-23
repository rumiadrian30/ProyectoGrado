/**
 * App.jsx — Punto de entrada principal del Admin Frontend
 */

import { useState, useEffect } from 'react'
import { setToken, clearToken, onUnauthorized } from './api'
import { encryptedSession } from './utils/encryptedStorage'
import { useContextMenuGuard } from './hooks/useContextMenuGuard'
import AdminLogin from './AdminLogin'
import AdminShell from './AdminShell'
import Toast from './components/Toast'
import { jwtDecode } from 'jwt-decode'

export default function App() {
  useContextMenuGuard()

  // Toast
  const [toast, setToast] = useState(null)

  // Estado de sesión
  const [user, setUser] = useState(() => {
    try {
      const saved = encryptedSession.getItem('admin_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })

    setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  function handleLogout(expired = false) {
    clearToken()
    setUser(null)
    if (expired) {
      showToast(
        'Tu sesión ha expirado. Vuelve a iniciar sesión.',
        'error'
      )
    }
  }

  // Logout automático ante 401
  useEffect(() => {
    onUnauthorized(() => handleLogout(true))
  }, [])

  // Validación automática de sesión
  useEffect(() => {
    async function validateSession() {
      const token = encryptedSession.getItem('admin_token')
      if (!token) {
        return
      }
      try {
        const decoded = jwtDecode(token)
        // Token expirado
        if (decoded.exp * 1000 <= Date.now()) {
          // Forzar request al backend
          await fetch('/api/buildings', {
            credentials: 'include',
            headers: {
              Authorization: 'Bearer ' + token
            }
          }).catch(() => {})
          handleLogout()
        }
      } catch {
        handleLogout()
      }
    }
    // Validar al volver a la pestaña
    window.addEventListener('focus', validateSession)
    // Validar cuando vuelve visible
    document.addEventListener(
      'visibilitychange',
      validateSession
    )
    // Validación inicial
    validateSession()

    return () => {
      window.removeEventListener(
        'focus',
        validateSession
      )
      document.removeEventListener(
        'visibilitychange',
        validateSession
      )
    }
  }, [])

  function handleSuccess(token, user) {
    setToken(token)
    encryptedSession.setItem(
      'admin_user',
      JSON.stringify(user)
    )
    setUser(user)
    try {
      const decoded = jwtDecode(token)
      if (decoded.exp) {
        const expiresIn =
          decoded.exp * 1000 - Date.now()
        // Ya expiró
        if (expiresIn <= 0) {
          handleLogout(true)
          return
        }
        // Logout automático exacto
        setTimeout(async () => {
          await fetch('/api/buildings', {
            credentials: 'include',
            headers: {
              Authorization: 'Bearer ' + token
            }
          }).catch(() => {})
          handleLogout(true)
        }, expiresIn)
      }

    } catch (err) {
      console.error(
        'Error leyendo JWT:',
        err
      )
    }
  }

  return (
    <>
      {/* Toast global */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {!user ? (
        <AdminLogin
          onSuccess={handleSuccess}
        />
      ) : (
        <AdminShell
          user={user}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}