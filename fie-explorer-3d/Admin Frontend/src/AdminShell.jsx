import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { api } from './api'
import logoApp from './assets/logo-app.png'
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

const NAV_GROUPS = [
  {
    id: 'general',
    label: 'General',
    icon: IconFolder,
    items: [{ id: 'dashboard', label: 'Dashboard', icon: IconDashboard }],
  },
  {
    id: 'contenidos',
    label: 'Contenidos',
    icon: IconFolder,
    items: [
      { id: 'hotspots',  label: 'Hotspots',    icon: IconHotspot  },
      { id: 'buildings', label: 'Edificios',    icon: IconBuilding },
      { id: 'models',    label: 'Modelos 3D',   icon: IconModel    },
      { id: 'images',    label: 'Imágenes',     icon: IconImage    },
    ],
  },
  {
    id: 'trazabilidad',
    label: 'Trazabilidad',
    icon: IconFolder,
    items: [
      { id: 'audit',  label: 'Audit Logs', icon: IconAudit },
      { id: 'errors', label: 'Error Logs', icon: IconError },
    ],
  },
]

const ADMIN_GROUP = {
  id: 'administracion',
  label: 'Administración',
  icon: IconFolder,
  items: [
    { id: 'users',    label: 'Usuarios',       icon: IconUsers    },
    { id: 'settings', label: 'Configuración',  icon: IconSettings },
  ],
}

export default function AdminShell({ user, onLogout, inactivityMs }) {
  const [page,       setPage]       = useState('dashboard')
  const [errBadge,   setErrBadge]   = useState(0)
  const [dbOk,       setDbOk]       = useState(true)
  const [remaining,  setRemaining]  = useState(inactivityMs)
  const [collapsed,  setCollapsed]  = useState(false)

  const remainingRef = useRef(inactivityMs)
  const tickRef      = useRef(null)

  const initials = (user.full_name || 'A')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const isSuperAdmin = user.role === 'superadmin'
  const groups = useMemo(
    () => (isSuperAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS),
    [isSuperAdmin]
  )

  const groupOf = useCallback(
    (pageId) => groups.find(g => g.items.some(it => it.id === pageId))?.id,
    [groups]
  )

  const [openGroups, setOpenGroups] = useState(() => new Set([groupOf('dashboard')]))

  function toggleGroup(id) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function goTo(pageId) {
    setPage(pageId)
    const g = groupOf(pageId)
    if (g) setOpenGroups(prev => new Set(prev).add(g))
  }

  useEffect(() => {
    fetch('/api/health').then(() => setDbOk(true)).catch(() => setDbOk(false))
  }, [])

  const resetTimer = useCallback(() => {
    remainingRef.current = inactivityMs
    setRemaining(inactivityMs)
  }, [inactivityMs])

  useEffect(() => {
    tickRef.current = setInterval(() => {
      remainingRef.current = Math.max(0, remainingRef.current - 1000)
      setRemaining(remainingRef.current)
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [])

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

  useEffect(() => {
    remainingRef.current = inactivityMs
    setRemaining(inactivityMs)
  }, [inactivityMs])

  async function doLogout() {
    try { await api('POST', '/auth/logout') } catch {}
    onLogout()
  }

  const PageComponent = PAGES[page] || Dashboard

  const totalSec = Math.ceil(remaining / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  const timerStr = `${mm}:${ss}`

  const pct = remaining / inactivityMs
  const timerUrgent = pct <= 0.10
  const timerWarn   = pct <= 0.25 && pct > 0.10

  const activeGroup = groups.find(g => g.id === groupOf(page))

  return (
    <div className="shell-page">

      {/* ── Header global ───────────────────────────────────── */}
      <header className="shell-header">
        <div className="header-brand">
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(v => !v)}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <IconChevron />
          </button>
          <img className="header-brand-mark" src={logoApp} alt="FIE Explorer 3D" />
          <div className="header-brand-text">
            <span className="header-brand-name">Explorador 3D FIE</span>
          </div>
        </div>

        <div className="header-right">
          <div className="topbar-pill">
            <span>fie_explorer_3d</span>
          </div>
          <div className={`topbar-status ${dbOk ? 'topbar-status--ok' : 'topbar-status--err'}`}>
            <span className="status-dot-anim" />
            <span>{dbOk ? 'Conectado' : 'Sin conexión'}</span>
          </div>
          <div
            className={`topbar-timer ${timerUrgent ? 'topbar-timer--urgent' : timerWarn ? 'topbar-timer--warn' : ''}`}
            title="Tiempo restante de sesión"
          >
            <IconClock />
            <span className="timer-value">{timerStr}</span>
          </div>
          <div className="header-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-meta">
              <span className="user-name">{user.full_name}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <button className="btn-logout" onClick={doLogout} title="Cerrar sesión">
              <IconLogout />
            </button>
          </div>
        </div>
      </header>

      <div className={`shell ${collapsed ? 'shell--collapsed' : ''}`}>

        {/* ── Sidebar ───────────────────────────────────────── */}
        <aside className="shell-sidebar">
          <nav className="sidebar-nav">
            {groups.map(group => {
              const isOpen = openGroups.has(group.id) && !collapsed
              return (
                <div key={group.id} className="nav-group">
                  <button
                    className={`nav-group-header ${isOpen ? 'nav-group-header--open' : ''}`}
                    onClick={() => (collapsed ? setCollapsed(false) : toggleGroup(group.id))}
                    title={collapsed ? group.label : undefined}
                  >
                    <span className="nav-group-chevron"><IconCaret /></span>
                    <span className="nav-group-icon"><group.icon /></span>
                    <span className="nav-group-label">{group.label}</span>
                  </button>
                  <div className={`nav-group-body ${isOpen ? 'nav-group-body--open' : ''}`}>
                    {group.items.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        className={`nav-item ${page === id ? 'nav-item--active' : ''}`}
                        onClick={() => goTo(id)}
                        title={collapsed ? label : undefined}
                      >
                        <span className="nav-item-icon"><Icon /></span>
                        <span className="nav-item-label">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>

          <div className="sidebar-foot">
            <span>FIE · ESPOCH</span>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────────── */}
        <div className="shell-main">
          <div className="shell-breadcrumb">
            <button className="crumb-home" onClick={() => goTo('dashboard')} aria-label="Inicio">
              <IconHome />
            </button>
            <IconCrumbSep />
            <span className="crumb-item">{activeGroup?.label || 'General'}</span>
            <IconCrumbSep />
            <span className="crumb-item crumb-item--active">{TITLES[page] || page}</span>
          </div>

          <main className="shell-content">
            <PageComponent onErrCount={setErrBadge} currentUser={user} />
          </main>
        </div>
      </div>

      {/* ── Footer global ───────────────────────────────────── */}
      <footer className="shell-footer">
        Escuela Superior Politécnica de Chimborazo © {new Date().getFullYear()} — Explorador 3D FIE
      </footer>
    </div>
  )
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function IconHotspot() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>
      <path d="M3.5 3.5a13 13 0 0 0 0 17M20.5 3.5a13 13 0 0 1 0 17"/>
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/>
      <path d="M9 9h1m4 0h1M9 13h1m4 0h1"/>
    </svg>
  )
}
function IconModel() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z"/><path d="M12 2v18M4 6.5l8 5 8-5"/>
    </svg>
  )
}
function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  )
}
function IconAudit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 12l2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z"/>
    </svg>
  )
}
function IconError() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
function IconClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
    </svg>
  )
}
function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}
function IconFolder() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8A2 2 0 0 1 21 9.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
    </svg>
  )
}
function IconCaret() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 6 15 12 9 18"/>
    </svg>
  )
}
function IconHome() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>
    </svg>
  )
}
function IconCrumbSep() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="crumb-sep">
      <polyline points="9 6 15 12 9 18"/>
    </svg>
  )
}