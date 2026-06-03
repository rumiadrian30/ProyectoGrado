import { useState, useEffect, useCallback } from 'react'
import { api, fmt, actionBadgeClass } from '../api'

const ACTIONS      = ['ALL','CREATE','UPDATE','DELETE','LOGIN','LOGOUT','ACTIVATE','DEACTIVATE']
const PER_PAGE_OPS = [10, 25, 50, 100]

function today()         { return new Date().toISOString().slice(0,10) }
function thirtyDaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10)
}

export default function AuditLogs() {
  const [action,    setAction]    = useState('ALL')
  const [dateFrom,  setDateFrom]  = useState(thirtyDaysAgo())
  const [dateTo,    setDateTo]    = useState(today())
  const [perPage,   setPerPage]   = useState(25)
  const [page,      setPage]      = useState(1)

  const [rows,       setRows]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [revealed,   setRevealed]   = useState({})
  const [exporting,    setExporting]    = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({
        per_page: perPage, page,
        ...(action !== 'ALL' && { action }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res = await api('GET', `/audit-logs?${params}`)
      setRows(res.data); setTotal(res.total); setTotalPages(res.total_pages)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [action, dateFrom, dateTo, perPage, page])

  useEffect(() => { load() }, [load])

  function toggleReveal(id) { setRevealed(r => ({ ...r, [id]: !r[id] })) }

  async function exportCSV() {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        ...(action !== 'ALL' && { action }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res  = await fetch(`/api/audit-logs/export?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Error al generar el CSV')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `audit_logs_${today()}.csv`
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
        ...(action !== 'ALL' && { action }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res  = await api('GET', `/audit-logs?${params}`)
      const data = res.data || []

      const actionColors = {
        CREATE:'#16a34a', UPDATE:'#1d4ed8', DELETE:'#dc2626',
        LOGIN:'#0891b2', LOGOUT:'#6b7280', ACTIVATE:'#16a34a', DEACTIVATE:'#9a3412',
      }

      const rowsHtml = data.map(l => {
        const color = actionColors[l.action] || '#374151'
        const fecha = l.created_at ? new Date(l.created_at).toLocaleString('es-EC') : '—'
        const ip    = l.ip_address || '••••••••'
        const old_v = l.old_values ? JSON.stringify(l.old_values).slice(0,60) : ''
        const new_v = l.new_values ? JSON.stringify(l.new_values).slice(0,60) : ''
        return `<tr>
          <td>${fecha}</td>
          <td><strong>${l.admin_name||'—'}</strong><br><small>${l.admin_email||''}</small></td>
          <td><span style="color:${color};font-weight:700;font-size:11px">${l.action}</span></td>
          <td><code>${l.entity_type||'auth'}</code>${l.entity_id?'<br><small>'+String(l.entity_id).slice(0,8)+'…</small>':''}</td>
          <td>${ip}</td>
          <td>${old_v?'<span style="background:#fee2e2;padding:1px 4px;border-radius:3px;font-size:10px">'+old_v+'</span>':''}<br>${new_v?'<span style="background:#dcfce7;padding:1px 4px;border-radius:3px;font-size:10px">'+new_v+'</span>':''}</td>
        </tr>`
      }).join('')

      const filterDesc = [
        action !== 'ALL' ? `Acción: ${action}` : '',
        dateFrom ? `Desde: ${dateFrom}` : '',
        dateTo   ? `Hasta: ${dateTo}` : '',
      ].filter(Boolean).join('  ·  ') || 'Sin filtros'

      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Logs de Auditoría — Explorador 3D FIE</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#111}
.header{background:#BC0613;color:#fff;padding:14px 20px;margin-bottom:14px}
.header h1{font-size:16px;margin-bottom:2px}.header p{font-size:10px;opacity:.8}
.meta{display:flex;justify-content:space-between;padding:0 20px 10px;font-size:10px;color:#555;border-bottom:1px solid #e5e7eb;margin-bottom:10px}
table{width:100%;border-collapse:collapse}th{background:#1F3864;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
td{padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:10px}
tr:nth-child(even) td{background:#f9fafb}code{background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:9px}
small{color:#6b7280;font-size:9px}.footer{margin-top:16px;padding:8px 20px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center}</style>
</head><body>
<div class="header"><h1>Registros de Auditoría — Explorador 3D FIE</h1>
<p>Facultad de Informática y Electrónica · ESPOCH · Generado el ${new Date().toLocaleString('es-EC')}</p></div>
<div class="meta"><span>Filtros: ${filterDesc}</span><span>Total: ${data.length.toLocaleString()}</span></div>
<table><thead><tr><th>Fecha / Hora</th><th>Administrador</th><th>Acción</th><th>Entidad</th><th>IP</th><th>Valores old → new</th></tr></thead>
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

  return (
    <div className="al-root">

      {/* Header */}
      <div className="al-page-hdr">
        <div>
          <h2 className="al-page-title">Registros de auditoría</h2>
          <p className="al-page-sub">
            {loading ? 'Cargando…' : `${total.toLocaleString()} registros · Solo lectura`}
          </p>
        </div>
        <div className="al-hdr-actions">
          <span className="al-immutable-badge">INMUTABLE</span>
          <button className="al-btn al-btn--primary"
            onClick={exportCSV} disabled={exporting || loading || total === 0}>
            <IconDownload /> {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
          <button className="al-btn al-btn--ghost"
            onClick={exportPDF} disabled={exportingPdf || loading || total === 0}>
            <IconFile /> {exportingPdf ? 'Generando…' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="al-filters">
        <div className="al-filter-row">
          <div className="al-filter-field">
            <label className="al-filter-label">Acción</label>
            <select className="al-input al-input--select"
              value={action} onChange={e => { setAction(e.target.value); setPage(1) }}>
              {ACTIONS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'Todas' : a}</option>)}
            </select>
          </div>
          <div className="al-filter-field">
            <label className="al-filter-label">Desde</label>
            <input type="date" className="al-input"
              value={dateFrom} max={dateTo}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
          </div>
          <div className="al-filter-field">
            <label className="al-filter-label">Hasta</label>
            <input type="date" className="al-input"
              value={dateTo} min={dateFrom}
              onChange={e => { setDateTo(e.target.value); setPage(1) }} />
          </div>
          <div className="al-filter-field">
            <label className="al-filter-label">Por página</label>
            <select className="al-input al-input--select al-input--narrow"
              value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
              {PER_PAGE_OPS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="al-filter-btns">
            <button className="al-btn al-btn--primary" onClick={load} disabled={loading}>
              {loading ? <div className="al-spinner-sm" /> : <IconFilter />}
              Aplicar
            </button>
            <button className="al-btn al-btn--ghost" onClick={() => {
              setAction('ALL'); setDateFrom(thirtyDaysAgo()); setDateTo(today()); setPage(1)
            }}>
              <IconReset /> Limpiar
            </button>
          </div>
          {!loading && total > 0 && (
            <span className="al-results-info">
              {pageStart}–{pageEnd} de {total.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="al-error">
          <IconAlert /><span>{error}</span>
        </div>
      )}

      {/* Tabla */}
      <div className="al-table-wrap" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
        <table className="al-table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Administrador</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>IP</th>
              <th>Agente</th>
              <th>Valores old → new</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="al-empty">
                    <IconEmpty />
                    <span>Sin registros para los filtros seleccionados</span>
                  </div>
                </td>
              </tr>
            ) : rows.map(l => {
              const show   = revealed[l.id]
              const hasEnc = !!l.ip_raw_hex
              return (
                <tr key={l.id} className="al-row">
                  <td className="al-cell-time">{fmt(l.created_at)}</td>

                  <td>
                    <span className="al-admin-name">{l.admin_name || '—'}</span>
                    <span className="al-admin-email">{l.admin_email || ''}</span>
                  </td>

                  <td>
                    <span className={`al-action-badge al-action-badge--${(l.action||'').toLowerCase()}`}>
                      {l.action}
                    </span>
                  </td>

                  <td>
                    {l.entity_type
                      ? <code className="al-code">{l.entity_type}</code>
                      : <span className="al-dash">auth</span>}
                    {l.entity_id && (
                      <span className="al-entity-id">{String(l.entity_id).slice(0,8)}…</span>
                    )}
                  </td>

                  <td>
                    {hasEnc ? (
                      <div className="al-reveal-wrap">
                        <span className={show ? 'al-ip-visible' : 'al-ip-hidden'}>
                          {show ? l.ip_address : '••••••••'}
                        </span>
                        <button className="al-reveal-btn" onClick={() => toggleReveal(l.id)}>
                          {show ? 'ocultar' : 'ver'}
                        </button>
                      </div>
                    ) : (
                      <span className="al-ip-visible">{l.ip_address || '—'}</span>
                    )}
                  </td>

                  <td className="al-cell-agent">
                    {hasEnc ? (
                      show
                        ? <span className="al-agent-text">{l.agent_dec || '—'}</span>
                        : <span className="al-ip-hidden">••••••••</span>
                    ) : <span className="al-dash">—</span>}
                  </td>

                  <td>
                    <div className="al-values">
                      {l.old_values && (
                        <span className="al-old-val" title={JSON.stringify(l.old_values)}>
                          {JSON.stringify(l.old_values).slice(0,80)}{JSON.stringify(l.old_values).length > 80 ? '…' : ''}
                        </span>
                      )}
                      {l.new_values && (
                        <span className="al-new-val" title={JSON.stringify(l.new_values)}>
                          {JSON.stringify(l.new_values).slice(0,80)}{JSON.stringify(l.new_values).length > 80 ? '…' : ''}
                        </span>
                      )}
                      {!l.old_values && !l.new_values && <span className="al-dash">—</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="al-pagination">
            <span className="al-page-info">Página {page} de {totalPages}</span>
            <div className="al-page-btns">
              <button className="al-page-btn" onClick={() => setPage(1)} disabled={page === 1} title="Primera">«</button>
              <button className="al-page-btn" onClick={() => setPage(p => Math.max(p-1,1))} disabled={page === 1}>‹ Ant.</button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 5)      p = i + 1
                else if (page <= 3)       p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else                      p = page - 2 + i
                return (
                  <button key={p}
                    className={`al-page-btn ${page === p ? 'al-page-btn--active' : ''}`}
                    onClick={() => setPage(p)}>
                    {p}
                  </button>
                )
              })}

              <button className="al-page-btn" onClick={() => setPage(p => Math.min(p+1,totalPages))} disabled={page === totalPages}>Sig. ›</button>
              <button className="al-page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Última">»</button>
            </div>
            <span className="al-page-info">{pageStart}–{pageEnd} de {total.toLocaleString()}</span>
          </div>
        )}
      </div>
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