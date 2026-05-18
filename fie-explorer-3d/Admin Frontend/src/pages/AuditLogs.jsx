import { useState, useEffect, useCallback } from 'react'
import { api, fmt, actionBadgeClass } from '../api'

const ACTIONS      = ['ALL','CREATE','UPDATE','DELETE','LOGIN','LOGOUT','ACTIVATE','DEACTIVATE']
const PER_PAGE_OPS = [10, 25, 50, 100]

function today()    { return new Date().toISOString().slice(0,10) }
function thirtyDaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0,10)
}

export default function AuditLogs() {
  // ── Filtros ────────────────────────────────────────────────
  const [action,    setAction]    = useState('ALL')
  const [dateFrom,  setDateFrom]  = useState(thirtyDaysAgo())
  const [dateTo,    setDateTo]    = useState(today())
  const [perPage,   setPerPage]   = useState(25)
  const [page,      setPage]      = useState(1)

  // ── Datos ──────────────────────────────────────────────────
  const [rows,       setRows]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [revealed,   setRevealed]   = useState({})

  // ── Exportación ────────────────────────────────────────────
  const [exporting, setExporting]   = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // ── Carga ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({
        per_page:  perPage,
        page,
        ...(action   !== 'ALL' && { action }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res = await api('GET', `/audit-logs?${params}`)
      setRows(res.data)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [action, dateFrom, dateTo, perPage, page])

  useEffect(() => { load() }, [load])

  // ── Reset de página al cambiar filtros ─────────────────────
  function applyFilters() { setPage(1) }

  // ── Exportar CSV ───────────────────────────────────────────
  async function exportCSV() {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        ...(action   !== 'ALL' && { action }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      // Usar fetch directo para obtener el blob
      const res = await fetch(`/api/audit-logs/export?${params}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Error al generar el CSV')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) { alert('Error al exportar: ' + e.message) }
    finally     { setExporting(false) }
  }

  function toggleReveal(id) {
    setRevealed(r => ({ ...r, [id]: !r[id] }))
  }


  async function exportPDF() {
    setExportingPdf(true)
    try {
      // Recopilar todos los datos filtrados (hasta 5000)
      const params = new URLSearchParams({
        per_page: 500, page: 1,
        ...(action   !== 'ALL' && { action }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo   }),
      })
      const res  = await api('GET', `/audit-logs?${params}`)
      const data = res.data || []

      // Construir HTML del PDF
      const actionColors = {
        CREATE:'#16a34a', UPDATE:'#1d4ed8', DELETE:'#dc2626',
        LOGIN:'#0891b2', LOGOUT:'#6b7280', ACTIVATE:'#16a34a', DEACTIVATE:'#9a3412',
      }

      const rows = data.map(l => {
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
          <td>${old_v ? '<span style="background:#fee2e2;padding:1px 4px;border-radius:3px;font-size:10px">'+old_v+'</span>' : ''}<br>${new_v ? '<span style="background:#dcfce7;padding:1px 4px;border-radius:3px;font-size:10px">'+new_v+'</span>' : ''}</td>
        </tr>`
      }).join('')

      const filterDesc = [
        action !== 'ALL' ? `Acción: ${action}` : '',
        dateFrom ? `Desde: ${dateFrom}` : '',
        dateTo   ? `Hasta: ${dateTo}`   : '',
      ].filter(Boolean).join('  ·  ') || 'Sin filtros'

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Logs de Auditoría — FIE Explorer 3D</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
  .header { background: #BC0613; color: #fff; padding: 14px 20px; margin-bottom: 14px; }
  .header h1 { font-size: 16px; margin-bottom: 2px; }
  .header p  { font-size: 10px; opacity: .8; }
  .meta { display: flex; justify-content: space-between; padding: 0 20px 10px;
    font-size: 10px; color: #555; border-bottom: 1px solid #e5e7eb; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 0 auto; }
  th { background: #1F3864; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; font-size: 10px; }
  tr:nth-child(even) td { background: #f9fafb; }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 9px; }
  small { color: #6b7280; font-size: 9px; }
  .footer { margin-top: 16px; padding: 8px 20px; border-top: 1px solid #e5e7eb;
    font-size: 9px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <h1>Registros de Auditoría — FIE Explorer 3D</h1>
  <p>Facultad de Informática y Electrónica · ESPOCH · Generado el ${new Date().toLocaleString('es-EC')}</p>
</div>
<div class="meta">
  <span>Filtros: ${filterDesc}</span>
  <span>Total de registros: ${data.length.toLocaleString()}</span>
</div>
<table>
  <thead>
    <tr>
      <th>Fecha / Hora</th><th>Administrador</th><th>Acción</th>
      <th>Entidad</th><th>IP</th><th>Valores old → new</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  FIE Explorer 3D · Panel Administrativo · Documento generado automáticamente · Solo lectura
</div>
</body>
</html>`

      // Abrir ventana e imprimir como PDF
      const win = window.open('', '_blank', 'width=1100,height=800')
      win.document.write(html)
      win.document.close()
      win.onload = () => {
        setTimeout(() => {
          win.print()
          win.close()
        }, 400)
      }
    } catch (e) { alert('Error al generar PDF: ' + e.message) }
    finally     { setExportingPdf(false) }
  }

  // ── Paginación ─────────────────────────────────────────────
  const pageStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const pageEnd   = Math.min(page * perPage, total)

  return (
    <>
      {/* Cabecera */}
      <div className="page-hdr">
        <div>
          <div className="page-title">Registros de auditoría</div>
          <div className="page-sub">
            {loading ? 'Cargando…' : `${total.toLocaleString()} registros · Solo lectura`}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="badge b-amber" style={{ fontSize:'10px' }}>INMUTABLE</span>
          <button
            className="btn btn-sm btn-primary"
            onClick={exportCSV}
            disabled={exporting || loading || total === 0}
            title="Exportar registros filtrados a CSV"
          >
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
          <button
            className="btn btn-sm"
            onClick={exportPDF}
            disabled={exportingPdf || loading || total === 0}
            title="Exportar registros filtrados a PDF"
          >
            {exportingPdf ? 'Generando…' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
        padding:'14px 16px', marginBottom:14,
        display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end',
      }}>
        {/* Acción */}
        <div>
          <div className="form-label" style={{ marginBottom:4 }}>Acción</div>
          <select className="form-select" style={{ width:140 }}
            value={action} onChange={e => { setAction(e.target.value); setPage(1) }}>
            {ACTIONS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'Todas' : a}</option>)}
          </select>
        </div>

        {/* Fecha desde */}
        <div>
          <div className="form-label" style={{ marginBottom:4 }}>Desde</div>
          <input type="date" className="form-input" style={{ width:150 }}
            value={dateFrom}
            max={dateTo}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
        </div>

        {/* Fecha hasta */}
        <div>
          <div className="form-label" style={{ marginBottom:4 }}>Hasta</div>
          <input type="date" className="form-input" style={{ width:150 }}
            value={dateTo}
            min={dateFrom}
            onChange={e => { setDateTo(e.target.value); setPage(1) }} />
        </div>

        {/* Por página */}
        <div>
          <div className="form-label" style={{ marginBottom:4 }}>Por página</div>
          <select className="form-select" style={{ width:80 }}
            value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
            {PER_PAGE_OPS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Botones */}
        <div style={{ display:'flex', gap:6, alignSelf:'flex-end' }}>
          <button className="btn btn-sm btn-primary" onClick={load} disabled={loading}>
            {loading ? '…' : 'Aplicar'}
          </button>
          <button className="btn btn-sm" onClick={() => {
            setAction('ALL'); setDateFrom(thirtyDaysAgo()); setDateTo(today()); setPage(1)
          }}>
            ↺ Limpiar
          </button>
        </div>

        {/* Info de resultados */}
        {!loading && total > 0 && (
          <div style={{ marginLeft:'auto', fontSize:11, color:'var(--muted)', alignSelf:'flex-end' }}>
            Mostrando {pageStart}–{pageEnd} de {total.toLocaleString()}
          </div>
        )}
      </div>

      {/* Errores */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabla */}
      <div className="card card-flush" style={{ opacity: loading ? 0.6 : 1, transition:'opacity .2s' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width:130 }}>Fecha / Hora</th>
                <th>Administrador</th>
                <th style={{ width:120 }}>Acción</th>
                <th>Entidad</th>
                <th style={{ width:130 }}>IP</th>
                <th style={{ width:160 }}>Agente</th>
                <th>Valores old → new</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      Sin registros para los filtros seleccionados
                    </div>
                  </td>
                </tr>
              ) : rows.map(l => {
                const show   = revealed[l.id]
                const hasEnc = !!l.ip_raw_hex
                return (
                  <tr key={l.id}>
                    {/* Fecha */}
                    <td style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap' }}>
                      {fmt(l.created_at)}
                    </td>

                    {/* Admin */}
                    <td>
                      <div style={{ fontWeight:500, fontSize:13 }}>{l.admin_name || '—'}</div>
                      <div style={{ fontSize:10, color:'var(--faint)' }}>{l.admin_email || ''}</div>
                    </td>

                    {/* Acción badge */}
                    <td>
                      <span className={`badge ${actionBadgeClass(l.action)}`}>{l.action}</span>
                    </td>

                    {/* Entidad */}
                    <td>
                      {l.entity_type
                        ? <code className="tag">{l.entity_type}</code>
                        : <span style={{ color:'var(--faint)' }}>auth</span>}
                      {l.entity_id && (
                        <div style={{ fontSize:10, color:'var(--faint)', marginTop:2 }}>
                          {String(l.entity_id).slice(0,8)}…
                        </div>
                      )}
                    </td>

                    {/* IP */}
                    <td style={{ fontSize:12 }}>
                      {hasEnc ? (
                        <>
                          {show
                            ? <span style={{ color:'var(--text)' }}>{l.ip_address}</span>
                            : <span style={{ color:'var(--faint)', fontStyle:'italic' }}>••••••••</span>}
                          <button className="btn-reveal" onClick={() => toggleReveal(l.id)}>
                            {show ? 'ocultar' : 'ver'}
                          </button>
                        </>
                      ) : (
                        <span>{l.ip_address || '—'}</span>
                      )}
                    </td>

                    {/* Agente */}
                    <td style={{ fontSize:11, maxWidth:160 }}>
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

                    {/* Old / New values */}
                    <td>
                      <div style={{ display:'flex', gap:4, flexDirection:'column' }}>
                        {l.old_values && (
                          <span className="old-val" title={JSON.stringify(l.old_values)}>
                            {JSON.stringify(l.old_values).slice(0, 80)}{JSON.stringify(l.old_values).length > 80 ? '…' : ''}
                          </span>
                        )}
                        {l.new_values && (
                          <span className="new-val" title={JSON.stringify(l.new_values)}>
                            {JSON.stringify(l.new_values).slice(0, 80)}{JSON.stringify(l.new_values).length > 80 ? '…' : ''}
                          </span>
                        )}
                        {!l.old_values && !l.new_values && (
                          <span style={{ color:'var(--faint)', fontSize:11 }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 16px', borderTop:'1px solid var(--border)',
            fontSize:12,
          }}>
            <span style={{ color:'var(--muted)' }}>
              Página {page} de {totalPages}
            </span>
            <div style={{ display:'flex', gap:4 }}>
              <button className="btn btn-sm" onClick={() => setPage(1)} disabled={page===1}>«</button>
              <button className="btn btn-sm" onClick={() => setPage(p => Math.max(p-1,1))} disabled={page===1}>‹ Anterior</button>

              {/* Números de página centrados */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 5) p = i + 1
                else if (page <= 3) p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else p = page - 2 + i
                return (
                  <button key={p} className={`btn btn-sm ${page===p ? 'btn-primary' : ''}`}
                    onClick={() => setPage(p)}>
                    {p}
                  </button>
                )
              })}

              <button className="btn btn-sm" onClick={() => setPage(p => Math.min(p+1,totalPages))} disabled={page===totalPages}>Siguiente ›</button>
              <button className="btn btn-sm" onClick={() => setPage(totalPages)} disabled={page===totalPages}>»</button>
            </div>
            <span style={{ color:'var(--muted)' }}>
              {pageStart}–{pageEnd} de {total.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
