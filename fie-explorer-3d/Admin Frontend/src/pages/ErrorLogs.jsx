import { useState, useEffect } from 'react'
import { api, fmt, severityBadgeClass } from '../api'

const SEVERITIES = ['ALL','DEBUG','INFO','WARN','ERROR','FATAL']

export default function ErrorLogs({ onErrCount }) {
  const [rows,     setRows]     = useState([])
  const [counts,   setCounts]   = useState({})
  const [filter,   setFilter]   = useState('ALL')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [revealed, setRevealed] = useState({})
  const [testMsg,  setTestMsg]  = useState('')
  const [testSev,  setTestSev]  = useState('ERROR')
  const [testing,  setTesting]  = useState(false)
  const [testOk,   setTestOk]   = useState('')

  useEffect(() => { load(filter) }, [filter])

  async function load(f) {
    setLoading(true)
    try {
      const all = await api('GET', '/error-logs?limit=200')
      const cnt = {}
      SEVERITIES.slice(1).forEach(s => { cnt[s] = 0 })
      all.data.forEach(e => { if (cnt[e.severity] !== undefined) cnt[e.severity]++ })
      setCounts(cnt)
      onErrCount?.((cnt['ERROR'] || 0) + (cnt['FATAL'] || 0))

      if (f !== 'ALL') {
        const filtered = await api('GET', `/error-logs?limit=200&severity=${f}`)
        setRows(filtered.data)
      } else {
        setRows(all.data)
      }
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }

  function toggleReveal(id) {
    setRevealed(r => ({ ...r, [id]: !r[id] }))
  }

  async function sendTest() {
    setTesting(true); setTestOk('')
    try {
      const res = await api('POST', '/error-logs/test', {
        severity: testSev,
        message: testMsg || 'Error de prueba',
      })
      setTestOk('Registro guardado correctamente.')
      setTestMsg('')
      load(filter)
    } catch (e) { setTestOk('Error: ' + e.message) }
    finally { setTesting(false) }
  }

  const sevColor = s =>
    s === 'ERROR' || s === 'FATAL' ? 'var(--danger)' :
    s === 'WARN' ? 'var(--warning)' : 'inherit'

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Log de errores del sistema</div>
          <div className="page-sub">Errores capturados en tiempo real</div>
        </div>
        <span className="badge b-amber">INMUTABLE</span>
      </div>

      {/* Contadores por severidad */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px', marginBottom:'12px' }}>
        {SEVERITIES.slice(1).map(s => (
          <div key={s} className="stat-card" style={{ padding:'10px 13px' }}>
            <div className="stat-label" style={{ fontSize:'10px' }}>{s}</div>
            <div className="stat-value" style={{ fontSize:'18px', color: sevColor(s) }}>{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-row">
        {SEVERITIES.map(s => (
          <button key={s} className={`tab-btn ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}>{s}</button>
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
                  <th>Severidad</th>
                  <th>Código</th>
                  <th>Mensaje</th>
                  <th>IP</th>
                  <th>Endpoint</th>
                  <th>Método</th>
                  <th>user_id</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0
                  ? <tr><td colSpan={8}>
                      <div className="empty-state">Sin errores con este filtro</div>
                    </td></tr>
                  : rows.map(e => {
                    const show   = revealed[e.id]
                    const hasEnc = !!e.ip_raw_hex
                    return (
                      <tr key={e.id}>
                        <td style={{ fontSize:'11px', color:'var(--muted)', whiteSpace:'nowrap' }}>
                          {fmt(e.created_at)}
                        </td>
                        <td>
                          <span className={`badge ${severityBadgeClass(e.severity)}`}>
                            {e.severity}
                          </span>
                        </td>
                        <td><code className="tag">{e.error_code || '—'}</code></td>

                        {/* Mensaje */}
                        <td>
                          {hasEnc ? (
                            show
                              ? <span className="trunc">{e.message_dec}</span>
                              : <span style={{ color:'var(--faint)', fontStyle:'italic' }}>••••••••</span>
                          ) : (
                            <span className="trunc">{e.error_message}</span>
                          )}
                          {hasEnc && (
                            <button className="btn-reveal" onClick={() => toggleReveal(e.id)}>
                              {show ? 'ocultar' : 'ver'}
                            </button>
                          )}
                        </td>

                        {/* IP */}
                        <td style={{ fontSize:'11px' }}>
                          {hasEnc ? (
                            show
                              ? <span style={{ color:'var(--muted)' }}>{e.ip_dec}</span>
                              : <span style={{ color:'var(--faint)', fontStyle:'italic' }}>••••</span>
                          ) : (
                            <span style={{ color:'var(--muted)' }}>{e.ip_address || '—'}</span>
                          )}
                        </td>

                        <td>
                          <code className="mono" style={{ color:'var(--muted)', fontSize:'11px' }}>
                            {e.endpoint || '—'}
                          </code>
                        </td>
                        <td><span className="badge b-gray">{e.method || '—'}</span></td>
                        <td style={{ fontSize:'11px' }}>
                          {e.user_id
                            ? <code className="tag">{String(e.user_id).slice(0,8)}…</code>
                            : <span style={{ color:'var(--faint)' }}>—</span>
                          }
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
