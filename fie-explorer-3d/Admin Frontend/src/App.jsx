import { useState } from 'react'
import { setToken, clearToken } from './api'
import AdminLogin from './AdminLogin'
import AdminShell from './AdminShell'

// ── Flujo idéntico al HTML: renderLogin → doLogin → renderShell ──
export default function App() {
  const [user, setUser] = useState(null)

  function handleSuccess(token, user) {
    setToken(token)   // guarda token en el módulo api.js
    setUser(user)
  }

  function handleLogout() {
    clearToken()
    setUser(null)
  }

  if (!user) return <AdminLogin onSuccess={handleSuccess} />
  return <AdminShell user={user} onLogout={handleLogout} />
}
