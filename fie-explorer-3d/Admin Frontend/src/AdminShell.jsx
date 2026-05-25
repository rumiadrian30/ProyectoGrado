import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from './api'
import Dashboard  from './pages/Dashboard'
import Hotspots   from './pages/Hotspots'
import Buildings  from './pages/Buildings'
import Models     from './pages/Models'
import Images     from './pages/Images'
import AdminUsers from './pages/AdminUsers'
import AuditLogs  from './pages/AuditLogs'
import ErrorLogs  from './pages/ErrorLogs'
import Settings   from './pages/Settings'

const PAGES = {
  dashboard: Dashboard, hotspots: Hotspots, buildings: Buildings,
  models: Models, images: Images, users: AdminUsers,
  audit: AuditLogs, errors: ErrorLogs, settings: Settings,
}
const TITLES = {
  dashboard: 'Dashboard', hotspots: 'Hotspots', buildings: 'Edificios',
  models: 'Modelos 3D', images: 'Imágenes', users: 'Usuarios',
  audit: 'Audit Logs', errors: 'Error Logs', settings: 'Configuración',
}

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'click']

export default function AdminShell({ user, onLogout, inactivityMs }) {
  const [page,      setPage]      = useState('dashboard')
  const [errBadge,  setErrBadge]  = useState(0)
  const [dbOk,      setDbOk]      = useState(true)
  const [remaining, setRemaining] = useState(inactivityMs)   // ms restantes

  const remainingRef = useRef(inactivityMs)  // ref para el interval sin closures viejos
  const tickRef      = useRef(null)

  const initials = (user.full_name || 'A')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const isSuperAdmin = user.role === 'superadmin'

  useEffect(() => {
    fetch('/api/health').then(() => setDbOk(true)).catch(() => setDbOk(false))
  }, [])

  // ── Reinicia el contador al máximo ────────────────────────────────────────
  const resetTimer = useCallback(() => {
    remainingRef.current = inactivityMs
    setRemaining(inactivityMs)
  }, [inactivityMs])

  // ── Tick cada segundo ─────────────────────────────────────────────────────
  useEffect(() => {
    tickRef.current = setInterval(() => {
      remainingRef.current = Math.max(0, remainingRef.current - 1000)
      setRemaining(remainingRef.current)
    }, 1000)

    return () => clearInterval(tickRef.current)
  }, [])

  // ── Escuchar actividad y reiniciar ────────────────────────────────────────
  useEffect(() => {
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetTimer, { passive: true })
    )
    return () => {
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetTimer)
      )
    }
  }, [resetTimer])

  // ── Si inactivityMs cambia (settings actualizados) sincronizar ────────────
  useEffect(() => {
    resetTimer()
  }, [inactivityMs, resetTimer])

  async function doLogout() {
    try { await api('POST', '/auth/logout') } catch {}
    onLogout()
  }

  const PageComponent = PAGES[page] || Dashboard

  // Formato mm:ss
  const totalSec = Math.ceil(remaining / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  const timerStr = `${mm}:${ss}`

  // Color según tiempo restante
  const pct = remaining / inactivityMs
  const timerColor = pct > 0.25 ? 'var(--muted)' : pct > 0.10 ? '#d97706' : '#dc2626'

  return (
    <div id="app">
      <div className="sidebar">
        <div className="sidebar-logo">
          <h2>FIE Admin</h2>
          <p>Panel de gestión · ESPOCH</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">General</div>
          <NavItem id="dashboard"  current={page} onClick={setPage}>◈ &nbsp;Dashboard</NavItem>

          <div className="nav-group-label">Contenidos</div>
          <NavItem id="hotspots"   current={page} onClick={setPage}>◎ &nbsp;Hotspots</NavItem>
          <NavItem id="buildings"  current={page} onClick={setPage}>🏛 &nbsp;Edificios</NavItem>
          <NavItem id="models"     current={page} onClick={setPage}>📦 &nbsp;Modelos 3D</NavItem>
          <NavItem id="images"     current={page} onClick={setPage}>🖼 &nbsp;Imágenes</NavItem>

          <div className="nav-group-label">Trazabilidad</div>
          <NavItem id="audit"      current={page} onClick={setPage}>&nbsp;Audit Logs</NavItem>
          <NavItem id="errors"     current={page} onClick={setPage}>&nbsp;Error Logs</NavItem>

          {isSuperAdmin && (
            <>
              <div className="nav-group-label">Administración</div>
              <NavItem id="users"    current={page} onClick={setPage}>&nbsp;Usuarios</NavItem>
              <NavItem id="settings" current={page} onClick={setPage}>&nbsp;Configuración</NavItem>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-row">
            <div className="avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{user.full_name}</div>
              <div className="role">{user.role}</div>
            </div>
            <button className="btn-logout" onClick={doLogout}>Salir</button>
          </div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <h1>{TITLES[page] || page}</h1>
          <div className="topbar-info">
            <span className="mono">fie_explorer_3d</span>
            <span className="status-dot">
              <span className={`dot ${dbOk ? 'dot-green' : 'dot-red'}`} />
              <span>{dbOk ? 'Conectado' : 'Sin conexión'}</span>
            </span>
            <span className="status-dot" title="Tiempo restante de sesión">
              <span style={{ fontSize: '11px' }}>⏱</span>
              <span
                className="mono"
                style={{ color: timerColor, fontVariantNumeric: 'tabular-nums', transition: 'color .5s' }}
              >
                {timerStr}
              </span>
            </span>
          </div>
        </div>
        <div className="content">
          <PageComponent onErrCount={setErrBadge} currentUser={user} />
        </div>
      </div>
    </div>
  )
}

function NavItem({ id, current, onClick, children }) {
  return (
    <div className={`nav-item ${current === id ? 'active' : ''}`} onClick={() => onClick(id)}>
      {children}
    </div>
  )
}