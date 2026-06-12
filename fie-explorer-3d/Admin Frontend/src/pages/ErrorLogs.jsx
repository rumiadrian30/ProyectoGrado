import { useState, useEffect, useCallback } from 'react'
import { api, fmt, actionBadgeClass } from '../api'

const SEVERITIES   = ['ALL','DEBUG','INFO','WARN','ERROR','FATAL']
const PER_PAGE_OPS = [10, 25, 50, 100]

function today()         { return new Date().toISOString().slice(0,10) }
function thirtyDaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10)
}

export default function ErrorLogs({ onErrCount }) {
  const [rows,     setRows]     = useState([])
  const [counts,   setCounts]   = useState({})
  const [filter,   setFilter]   = useState('ALL')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [revealed, setRevealed] = useState({})

  // Filtros avanzados
  const [dateFrom,  setDateFrom]  = useState(thirtyDaysAgo())
  const [dateTo,    setDateTo]    = useState(today())
  const [perPage,   setPerPage]   = useState(25)
  const [page,      setPage]      = useState(1)
  const [total,     setTotal]     = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Exportación
  const [exporting,    setExporting]    = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Contadores globales (sin paginación)
      const all = await api('GET', '/error-logs?limit=1000')
      const cnt = {}
      SEVERITIES.slice(1).forEach(s => { cnt[s] = 0 })
      all.data.forEach(e => { if (cnt[e.severity] !== undefined) cnt[e.severity]++ })
      setCounts(cnt)
      onErrCount?.((cnt['ERROR'] || 0) + (cnt['FATAL'] || 0))

      // Datos paginados con filtros
      const params = new URLSearchParams({
        per_page: perPage,
        page,
        ...(filter   !== 'ALL' && { severity: filter }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res = await api('GET', `/error-logs?${params}`)
      setRows(res.data ?? res)
      setTotal(res.total ?? res.length ?? 0)
      setTotalPages(res.total_pages ?? 1)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [filter, dateFrom, dateTo, perPage, page])

  useEffect(() => { load() }, [load])

  function toggleReveal(id) { setRevealed(r => ({ ...r, [id]: !r[id] })) }

  async function exportCSV() {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        ...(filter   !== 'ALL' && { severity: filter }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res  = await fetch(`/api/error-logs/export?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al generar el CSV')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `error_logs_${today()}.csv`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) { alert('Error al exportar: ' + e.message) }
    finally     { setExporting(false) }
  }

  async function exportPDF() {
    setExportingPdf(true)
    try {
      const params = new URLSearchParams({
        per_page: 500, page: 1,
        ...(filter   !== 'ALL' && { severity: filter }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res  = await api('GET', `/error-logs?${params}`)
      const data = res.data ?? res ?? []

      const sevColors = {
        DEBUG: '#6b7280', INFO: '#1d4ed8', WARN: '#f97316',
        ERROR: '#c0120c', FATAL: '#7f1d1d',
      }

      const rowsHtml = data.map(e => {
        const color = sevColors[e.severity] || '#374151'
        const fecha = e.created_at ? new Date(e.created_at).toLocaleString('es-EC') : '—'
        return `<tr>
          <td>${fecha}</td>
          <td><span style="color:${color};font-weight:700;font-size:11px">${e.severity}</span></td>
          <td><code>${e.error_code || '—'}</code></td>
          <td>${e.error_message || '—'}</td>
          <td>${e.ip_address || '—'}</td>
          <td><code>${e.endpoint || '—'}</code></td>
          <td>${e.method || '—'}</td>
        </tr>`
      }).join('')

      const filterDesc = [
        filter !== 'ALL' ? `Severidad: ${filter}` : '',
        dateFrom ? `Desde: ${dateFrom}` : '',
        dateTo   ? `Hasta: ${dateTo}`   : '',
      ].filter(Boolean).join('  ·  ') || 'Sin filtros'

      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Error Logs — Explorador 3D FIE</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#111}
.header{background:#BC0613;color:#fff;padding:14px 20px;margin-bottom:14px}
.header h1{font-size:16px;margin-bottom:2px}.header p{font-size:10px;opacity:.8}
.meta{display:flex;justify-content:space-between;padding:0 20px 10px;font-size:10px;color:#555;border-bottom:1px solid #e5e7eb;margin-bottom:10px}
table{width:100%;border-collapse:collapse}th{background:#1F3864;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
td{padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:10px}
tr:nth-child(even) td{background:#f9fafb}code{background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:9px}
.footer{margin-top:16px;padding:8px 20px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center}</style>
</head><body>
<div class="header"><h1>Log de Errores — Explorador 3D FIE</h1>
<p>Facultad de Informática y Electrónica · ESPOCH · Generado el ${new Date().toLocaleString('es-EC')}</p></div>
<div class="meta"><span>Filtros: ${filterDesc}</span><span>Total: ${data.length.toLocaleString()}</span></div>
<table><thead><tr><th>Fecha / Hora</th><th>Severidad</th><th>Código</th><th>Mensaje</th><th>IP</th><th>Endpoint</th><th>Método</th></tr></thead>
<tbody>${rowsHtml}</tbody></table>
<div class="footer">Explorador 3D FIE · Panel Administrativo · Documento generado automáticamente · Solo lectura</div>
</body></html>`

      const win = window.open('', '_blank', 'width=1100,height=800')
      win.document.write(html); win.document.close()
      win.onload = () => { setTimeout(() => { win.print(); win.close() }, 400) }
    } catch (e) { alert('Error al generar PDF: ' + e.message) }
    finally     { setExportingPdf(false) }
  }

  const pageStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const pageEnd   = Math.min(page * perPage, total)

  const SEV_META = {
    DEBUG: 'el-sev--debug', INFO: 'el-sev--info',
    WARN:  'el-sev--warn',  ERROR: 'el-sev--error', FATAL: 'el-sev--fatal',
  }

  return (
    <div className="el-root">

      {/* Header */}
      <div className="el-page-hdr">
        <div>
          <h2 className="el-page-title">Log de errores</h2>
          <p className="el-page-sub">
            {loading ? 'Cargando…' : `${total.toLocaleString()} registros · Solo lectura`}
          </p>
        </div>
        <div className="el-hdr-actions">
          <span className="el-immutable-badge">INMUTABLE</span>
          <button className="el-btn el-btn--primary"
            onClick={exportCSV} disabled={exporting || loading || total === 0}>
            <IconDownload /> {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
          <button className="el-btn el-btn--ghost"
            onClick={exportPDF} disabled={exportingPdf || loading || total === 0}>
            <IconFile /> {exportingPdf ? 'Generando…' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="el-stats">
        {SEVERITIES.slice(1).map(s => (
          <button key={s}
            className={`el-stat-card el-stat-card--${s.toLowerCase()} ${filter === s ? 'el-stat-card--active' : ''}`}
            onClick={() => { setFilter(s); setPage(1) }}>
            <span className="el-stat-label">{s}</span>
            <span className="el-stat-value">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="el-filters">
        <div className="el-filter-row">
          <div className="el-filter-field">
            <label className="el-filter-label">Severidad</label>
            <select className="el-input el-input--select"
              value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}>
              {SEVERITIES.map(s => (
                <option key={s} value={s}>{s === 'ALL' ? 'Todas' : s}</option>
              ))}
            </select>
          </div>
          <div className="el-filter-field">
            <label className="el-filter-label">Desde</label>
            <input type="date" className="el-input"
              value={dateFrom} max={dateTo}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
          </div>
          <div className="el-filter-field">
            <label className="el-filter-label">Hasta</label>
            <input type="date" className="el-input"
              value={dateTo} min={dateFrom}
              onChange={e => { setDateTo(e.target.value); setPage(1) }} />
          </div>
          <div className="el-filter-field">
            <label className="el-filter-label">Por página</label>
            <select className="el-input el-input--select el-input--narrow"
              value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
              {PER_PAGE_OPS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="el-filter-btns">
            <button className="el-btn el-btn--primary" onClick={load} disabled={loading}>
              {loading ? <div className="el-spinner-sm" /> : <IconFilter />}
              Aplicar
            </button>
            <button className="el-btn el-btn--ghost" onClick={() => {
              setFilter('ALL'); setDateFrom(thirtyDaysAgo()); setDateTo(today()); setPage(1)
            }}>
              <IconReset /> Limpiar
            </button>
          </div>
          {!loading && total > 0 && (
            <span className="el-results-info">
              {pageStart}–{pageEnd} de {total.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Tabs severidad */}
      <div className="el-tabs">
        {SEVERITIES.map(s => (
          <button key={s}
            className={`el-tab ${filter === s ? 'el-tab--active' : ''}`}
            onClick={() => { setFilter(s); setPage(1) }}>
            {s === 'ALL' ? 'Todos' : s}
            {s !== 'ALL' && counts[s] !== undefined && (
              <span className="el-tab-count">{counts[s]}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="el-error-alert"><IconAlert /><span>{error}</span></div>
      )}

      {loading ? (
        <div className="el-loading">
          <div className="el-spinner" /><span>Cargando errores…</span>
        </div>
      ) : (
        <div className="el-table-wrap" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
          <table className="el-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="el-empty">
                      <IconEmpty /><span>Sin errores con este filtro</span>
                    </div>
                  </td>
                </tr>
              ) : rows.map(e => {
                const show   = revealed[e.id]
                const hasEnc = !!e.ip_raw_hex
                return (
                  <tr key={e.id} className={`el-row el-row--${(e.severity||'').toLowerCase()}`}>

                    <td className="el-cell-time">{fmt(e.created_at)}</td>

                    <td>
                      <span className={`el-sev-badge ${SEV_META[e.severity] || ''}`}>
                        {e.severity}
                      </span>
                    </td>

                    <td><code className="el-code">{e.error_code || '—'}</code></td>

                    <td className="el-cell-msg">
                      {hasEnc ? (
                        <span className={show ? 'el-msg-text' : 'el-msg-hidden'}>
                          {show ? e.message_dec : '••••••••'}
                        </span>
                      ) : (
                        <span className="el-msg-text">{e.error_message}</span>
                      )}
                      {hasEnc && (
                        <button className="el-reveal-btn" onClick={() => toggleReveal(e.id)}>
                          {show ? 'ocultar' : 'ver'}
                        </button>
                      )}
                    </td>

                    <td>
                      {hasEnc ? (
                        <span className={show ? 'el-ip-text' : 'el-ip-hidden'}>
                          {show ? e.ip_dec : '••••'}
                        </span>
                      ) : (
                        <span className="el-ip-text">{e.ip_address || '—'}</span>
                      )}
                    </td>

                    <td>
                      <code className="el-endpoint" title={e.endpoint}>{e.endpoint || '—'}</code>
                    </td>

                    <td>
                      {e.method
                        ? <span className="el-method-badge">{e.method}</span>
                        : <span className="el-dash">—</span>}
                    </td>

                    <td>
                      {e.user_id
                        ? <code className="el-code">{String(e.user_id).slice(0,8)}…</code>
                        : <span className="el-dash">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="el-pagination">
              <span className="el-page-info">Página {page} de {totalPages}</span>
              <div className="el-page-btns">
                <button className="el-page-btn" onClick={() => setPage(1)} disabled={page === 1} title="Primera">«</button>
                <button className="el-page-btn" onClick={() => setPage(p => Math.max(p-1,1))} disabled={page === 1}>‹ Ant.</button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p
                  if (totalPages <= 5)           p = i + 1
                  else if (page <= 3)            p = i + 1
                  else if (page >= totalPages-2) p = totalPages - 4 + i
                  else                           p = page - 2 + i
                  return (
                    <button key={p}
                      className={`el-page-btn ${page === p ? 'el-page-btn--active' : ''}`}
                      onClick={() => setPage(p)}>
                      {p}
                    </button>
                  )
                })}

                <button className="el-page-btn" onClick={() => setPage(p => Math.min(p+1,totalPages))} disabled={page === totalPages}>Sig. ›</button>
                <button className="el-page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Última">»</button>
              </div>
              <span className="el-page-info">{pageStart}–{pageEnd} de {total.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
function IconDownload() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function IconFile()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> }
function IconFilter()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> }
function IconReset()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg> }
function IconAlert()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg> }
function IconEmpty()    { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }