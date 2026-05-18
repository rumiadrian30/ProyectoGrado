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

      // Contar imágenes sumando las de cada hotspot activo
      const imageRequests = hotspots
        .filter(h => h.is_active)
        .map(h => api('GET', `/images/hotspot/${h.id}`).catch(() => []))
      const imageLists  = await Promise.all(imageRequests)
      const imageCount  = imageLists.reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0)

      const active    = hotspots.filter(h => h.is_active).length
      const buildings = buildingsList.length
      const modelCount = Array.isArray(models) ? models.filter(m => m.is_active).length : 0
      const critical  = (errors.data ?? errors).filter(e => ['ERROR','FATAL'].includes(e.severity)).length

      onErrCount?.(critical)
      setData({
        hotspots, active, buildings,
        modelCount, imageCount,
        auditTotal: audit.total ?? 0,
        critical,
        recentAudit:   audit.data  ?? audit  ?? [],
        recentErrors:  errors.data ?? errors ?? [],
      })
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }

  if (loading) return <div className="loader">Cargando…</div>
  if (error)   return <div className="alert alert-error">Error: {error}</div>

  const { hotspots, active, buildings, modelCount, imageCount, recentAudit, recentErrors } = data

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Hotspots activos</div>
          <div className="stat-value">{active}</div>
          <div className="stat-sub">{hotspots.length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Edificios</div>
          <div className="stat-value">{buildings}</div>
          <div className="stat-sub">FIE-ESPOCH</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Modelos 3D</div>
          <div className="stat-value">{modelCount}</div>
          <div className="stat-sub">activos en BD</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Imágenes</div>
          <div className="stat-value">{imageCount}</div>
          <div className="stat-sub">en hotspots activos</div>
        </div>
      </div>

      <div className="two-col">
        {/* Actividad reciente */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">Actividad reciente</span>
            <span className="badge b-gray" style={{ fontSize: '10px' }}>v_audit_recent</span>
          </div>
          {recentAudit.length === 0
            ? <div className="empty-state">Sin actividad</div>
            : recentAudit.slice(0, 6).map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 0', borderBottom:'1px solid rgba(0,0,0,.05)' }}>
                <span className={`badge ${actionBadgeClass(l.action)}`}>{l.action}</span>
                <span style={{ flex:1, fontSize:'12px', color:'var(--muted)' }}>{l.entity_type || 'auth'}</span>
                <span style={{ fontSize:'11px', color:'var(--faint)' }}>{fmt(l.created_at).slice(11)}</span>
              </div>
            ))
          }
        </div>

        {/* Últimos errores */}
        <div className="card">
          <div className="section-header">
            <span className="section-title">Últimos errores</span>
            <span className="badge b-gray" style={{ fontSize: '10px' }}>error_logs</span>
          </div>
          {recentErrors.length === 0
            ? <div className="empty-state">Sin errores</div>
            : recentErrors.map(e => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 0', borderBottom:'1px solid rgba(0,0,0,.05)' }}>
                <span className={`badge ${severityBadgeClass(e.severity)}`}>{e.severity}</span>
                <span style={{ flex:1, fontSize:'12px', color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.error_message}</span>
                <span style={{ fontSize:'11px', color:'var(--faint)' }}>{fmt(e.created_at).slice(11)}</span>
              </div>
            ))
          }
        </div>
      </div>
    </>
  )
}