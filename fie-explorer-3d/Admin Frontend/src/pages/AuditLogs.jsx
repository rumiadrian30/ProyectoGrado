import { useState, useEffect } from 'react'
import { api, fmt, actionBadgeClass } from '../api'

const ACTIONS = ['ALL','CREATE','UPDATE','DELETE','LOGIN','LOGOUT','ACTIVATE','DEACTIVATE']

export default function AuditLogs() {
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [filter,  setFilter]  = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [revealed, setRevealed] = useState({})

  useEffect(() => { load(filter) }, [filter])

  async function load(f) {
    setLoading(true)
    const q = f === 'ALL' ? '' : `&action=${f}`
    try {
      const res = await api('GET', `/audit-logs?limit=200${q}`)
      setRows(res.data); setTotal(res.total)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }

  function toggleReveal(id) {
    setRevealed(r => ({ ...r, [id]: !r[id] }))
  }

  function shortHex(hex) {
    if (!hex) return '—'
    return '\\x' + hex.slice(0, 20) + '…'
  }

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Registros de auditoría</div>
          <div className="page-sub">{total} registros · Solo lectura</div>
        </div>
        <span className="badge b-amber">INMUTABLE</span>
      </div>

      <div className="tab-row">
        {ACTIONS.map(a => (
          <button key={a} className={`tab-btn ${filter === a ? 'active' : ''}`}
            onClick={() => setFilter(a)}>{a}</button>
        ))}
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {loading && <div className="loader">Cargando…</div>}

      {!loading && !error && (
        <div className="card card-flush">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Admin</th>
                  <th>Acción</th>
                  <th>Tabla / Entidad</th>
                  <th>IP</th>
                  <th>Dispositivo</th>
                  <th>old / new values</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0
                  ? <tr><td colSpan={7}><div className="empty-state">Sin registros con este filtro</div></td></tr>
                  : rows.map(l => {
                    const show = revealed[l.id]
                    const hasEnc = !!l.ip_raw_hex
                    return (
                      <tr key={l.id}>
                        <td style={{ fontSize:'11px', color:'var(--muted)', whiteSpace:'nowrap' }}>{fmt(l.created_at)}</td>
                        <td>
                          <div style={{ fontSize:'13px', fontWeight:'500' }}>{l.admin_name || '—'}</div>
                          <div style={{ fontSize:'11px', color:'var(--faint)' }}>{l.admin_email || ''}</div>
                        </td>
                        <td><span className={`badge ${actionBadgeClass(l.action)}`}>{l.action}</span></td>
                        <td>
                          {l.entity_type
                            ? <code className="tag">{l.entity_type}</code>
                            : <span style={{ color:'var(--faint)' }}>auth</span>}
                          {l.entity_id && (
                            <div style={{ fontSize:'10px', color:'var(--faint)', marginTop:'2px' }}>
                              {String(l.entity_id).slice(0,8)}…
                            </div>
                          )}
                        </td>

                        {/* IP */}
                        <td style={{ fontSize:'12px' }}>
                          {hasEnc ? (
                            show
                              ? <span style={{ color:'var(--text)' }}>{l.ip_dec}</span>
                              : <span style={{ color:'var(--faint)', fontStyle:'italic' }}>••••••••</span>
                          ) : (
                            <span>{l.ip_address || '—'}</span>
                          )}
                          {hasEnc && (
                            <button className="btn-reveal" onClick={() => toggleReveal(l.id)}>
                              {show ? 'ocultar' : 'ver'}
                            </button>
                          )}
                        </td>

                        {/* Dispositivo / User-Agent */}
                        <td style={{ fontSize:'11px', maxWidth:160 }}>
                          {hasEnc ? (
                            show
                              ? <span style={{ color:'var(--muted)', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {l.agent_dec || '—'}
                                </span>
                              : <span style={{ color:'var(--faint)', fontStyle:'italic' }}>••••••••</span>
                          ) : (
                            <span style={{ color:'var(--faint)' }}>—</span>
                          )}
                        </td>

                        <td>
                          <div style={{ display:'flex', gap:'4px', flexDirection:'column' }}>
                            {l.old_values && <span className="old-val">{JSON.stringify(l.old_values)}</span>}
                            {l.new_values && <span className="new-val">{JSON.stringify(l.new_values)}</span>}
                            {!l.old_values && !l.new_values && (
                              <span style={{ color:'var(--faint)', fontSize:'11px' }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
