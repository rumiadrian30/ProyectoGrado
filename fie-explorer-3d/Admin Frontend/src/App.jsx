/**
 * App.jsx — Punto de entrada principal del Admin Frontend
 */

import { useState, useEffect }       from 'react'
import { setToken, clearToken, onUnauthorized } from './api'
import { useContextMenuGuard }        from './hooks/useContextMenuGuard'
import AdminLogin                     from './AdminLogin'
import AdminShell                     from './AdminShell'

export default function App() {
  useContextMenuGuard()

  // Estado de sesión
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('admin_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  function handleLogout() {
    clearToken()
    setUser(null)
  }

  // Logout automático ante respuesta 401 (sesión expirada)
  useEffect(() => {
    onUnauthorized(handleLogout)
  }, [])

  function handleSuccess(token, user) {
    setToken(token)
    sessionStorage.setItem('admin_user', JSON.stringify(user))
    setUser(user)
  }

  if (!user) return <AdminLogin onSuccess={handleSuccess} />
  return <AdminShell user={user} onLogout={handleLogout} />
}
