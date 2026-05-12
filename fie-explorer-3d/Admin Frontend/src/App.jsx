import { useState, useEffect } from 'react'
import { setToken, clearToken, onUnauthorized } from './api'
import AdminLogin from './AdminLogin'
import AdminShell from './AdminShell'

// ── Flujo idéntico al HTML: renderLogin → doLogin → renderShell ──
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  function handleLogout() {
    clearToken()   // limpia sessionStorage
    setUser(null)
  }

  // Cuando cualquier petición reciba 401 (sesión expirada) → logout automático
  useEffect(() => {
    onUnauthorized(handleLogout);
  }, []);

  function handleSuccess(token, user) {
    setToken(token)  // no-op si el backend usa solo cookies HttpOnly
    sessionStorage.setItem('admin_user', JSON.stringify(user))
    setUser(user)
  }

  if (!user) return <AdminLogin onSuccess={handleSuccess} />
  return <AdminShell user={user} onLogout={handleLogout} />
}