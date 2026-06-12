import { useState, useEffect } from 'react'
import { api, fmt, actionBadgeClass, severityBadgeClass } from '../api'

export default function Dashboard({ onErrCount }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [hotspots, buildingsList, models, audit, errors] = await Promise.all([
        api('GET', '/hotspots'),
        api('GET', '/buildings'),
        api('GET', '/models'),
        api('GET', '/audit-logs?limit=6'),
        api('GET', '/error-logs?limit=6'),
      ])

      const imageRequests = hotspots
        .filter(h => h.is_active)
        .map(h => api('GET', `/images/hotspot/${h.id}`).catch(() => []))
      const imageLists = await Promise.all(imageRequests)
      const imageCount = imageLists.reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0)

      const active     = hotspots.filter(h => h.is_active).length
      const buildings  = buildingsList.length
      const modelCount = Array.isArray(models) ? models.filter(m => m.is_active).length : 0
      const critical   = (errors.data ?? errors).filter(e => ['ERROR', 'FATAL'].includes(e.severity)).length

      onErrCount?.(critical)
      setData({
        hotspots, active, buildings,
        modelCount, imageCount,
        auditTotal: audit.total ?? 0,
        critical,
        recentAudit:  audit.data  ?? audit  ?? [],
        recentErrors: errors.data ?? errors ?? [],
      })
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }

  if (loading) return (
    <div className="dash-loading">
      <div className="dash-loading-spinner" />
      <span>Cargando dashboard…</span>
    </div>
  )

  if (error) return (
    <div className="dash-error">
      <IconAlert />
      <span>{error}</span>
    </div>
  )

  const { hotspots, active, buildings, modelCount, imageCount, recentAudit, recentErrors } = data

  const stats = [
    {
      label: 'Hotspots activos',
      value: active,
      sub: `${hotspots.length} total`,
      icon: <IconHotspot />,
    },
    {
      label: 'Edificios',
      value: buildings,
      sub: 'FIE · ESPOCH',
      icon: <IconBuilding />,
    },
    {
      label: 'Modelos 3D',
      value: modelCount,
      sub: 'activos en BD',
      icon: <IconModel />,
    },
    {
      label: 'Imágenes',
      value: imageCount,
      sub: 'en hotspots activos',
      icon: <IconImage />,
    },
  ]

  return (
    <div className="dash-root">

      {/* Stats */}
      <div className="dash-stats">
        {stats.map(s => (
          <div key={s.label} className="dash-stat">
            <div className="dash-stat-icon">{s.icon}</div>
            <div className="dash-stat-body">
              <span className="dash-stat-label">{s.label}</span>
              <span className="dash-stat-value">{s.value}</span>
              <span className="dash-stat-sub">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Logs */}
      <div className="dash-cols">

        {/* Actividad reciente */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Actividad reciente</span>
            <span className="dash-chip">v_audit_recent</span>
          </div>
          <div className="dash-list">
            {recentAudit.length === 0
              ? <div className="dash-empty">Sin actividad registrada</div>
              : recentAudit.slice(0, 6).map(l => (
                <div key={l.id} className="dash-list-row">
                  <span className={`dash-badge ${actionBadgeClass(l.action)}`}>{l.action}</span>
                  <span className="dash-list-entity">{l.entity_type || 'auth'}</span>
                  <span className="dash-list-time">{fmt(l.created_at).slice(11)}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Últimos errores */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Últimos errores</span>
            <span className="dash-chip">error_logs</span>
          </div>
          <div className="dash-list">
            {recentErrors.length === 0
              ? <div className="dash-empty">Sin errores registrados</div>
              : recentErrors.map(e => (
                <div key={e.id} className="dash-list-row">
                  <span className={`dash-badge ${severityBadgeClass(e.severity)}`}>{e.severity}</span>
                  <span className="dash-list-entity dash-list-entity--truncate">{e.error_message}</span>
                  <span className="dash-list-time">{fmt(e.created_at).slice(11)}</span>
                </div>
              ))
            }
          </div>
        </div>

      </div>
    </div>
  )
}

function IconHotspot() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>
      <path d="M3.5 3.5a13 13 0 0 0 0 17M20.5 3.5a13 13 0 0 1 0 17"/>
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/>
      <path d="M9 9h1m4 0h1M9 13h1m4 0h1"/>
    </svg>
  )
}
function IconModel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z"/>
      <path d="M12 2v18M4 6.5l8 5 8-5"/>
    </svg>
  )
}
function IconImage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  )
}
function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>
    </svg>
  )
}