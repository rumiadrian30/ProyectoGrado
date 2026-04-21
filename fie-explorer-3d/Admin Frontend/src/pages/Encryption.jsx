import { useState, useEffect } from 'react'
import { api, fmt } from '../api'

export default function Encryption() {
  const [auditData,  setAuditData]  = useState(null)
  const [errorData,  setErrorData]  = useState(null)
  const [sqlExamples, setSqlExamples] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('overview')
  const [copiedIdx,  setCopiedIdx]  = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [a, e, s] = await Promise.all([
        api('GET', '/encryption/audit-evidence'),
        api('GET', '/encryption/error-evidence'),
        api('GET', '/encryption/sql-examples'),
      ])
      setAuditData(a)
      setErrorData(e)
      setSqlExamples(s)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function copySQL(sql, idx) {
    navigator.clipboard.writeText(sql)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  function shortHex(hex) {
    if (!hex) return '—'
    return '\\x' + hex.slice(0, 32) + '…'
  }

  if (loading) return <div className="loader">Cargando evidencia de cifrado…</div>

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Evidencia de cifrado AES-256</div>
          <div className="page-sub">
            Algoritmo: <code className="tag">pgp_sym_encrypt</code> · Extensión: <code className="tag">pgcrypto</code> · PostgreSQL
          </div>
        </div>
        <span className="enc-badge-lg">🔐 AES-256</span>
      </div>

      {/* Resumen de tablas cifradas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'18px' }}>
        <div className="enc-summary-card">
          <div className="enc-summary-title">📋 audit_logs</div>
          <div className="enc-summary-fields">
            <EncField col="ip_encrypted" type="BYTEA" plain="ip_address (NULL)" algo="pgp_sym_encrypt" />
            <EncField col="agent_encrypted" type="BYTEA" plain="user_agent (NULL)" algo="pgp_sym_encrypt" />
          </div>
          <div className="enc-summary-count">{auditData?.total ?? 0} registros cifrados</div>
        </div>
        <div className="enc-summary-card">
          <div className="enc-summary-title">⚠️ error_logs</div>
          <div className="enc-summary-fields">
            <EncField col="ip_encrypted" type="BYTEA" plain="ip_address (NULL)" algo="pgp_sym_encrypt" />
            <EncField col="message_encrypted" type="BYTEA" plain="error_message = [CIFRADO]" algo="pgp_sym_encrypt" />
          </div>
          <div className="enc-summary-count">{errorData?.total ?? 0} registros cifrados</div>
        </div>
        <div className="enc-summary-card">
          <div className="enc-summary-title">👤 admin_users</div>
          <div className="enc-summary-fields">
            <EncField col="password_hash" type="TEXT" plain="contraseña" algo="bcrypt (hash)" />
            <EncField col="email_encrypted" type="BYTEA" plain="email" algo="pgp_sym_encrypt" />
          </div>
          <div className="enc-summary-count">Hash unidireccional + cifrado bidireccional</div>
        </div>
        <div className="enc-summary-card enc-how">
          <div className="enc-summary-title">⚙️ Cómo funciona</div>
          <ol style={{ paddingLeft:'16px', fontSize:'12px', color:'var(--muted)', lineHeight:'1.7' }}>
            <li>Al insertar, Node.js llama <code>pgp_sym_encrypt(valor, clave)</code></li>
            <li>PostgreSQL cifra con <strong>AES-256</strong> y almacena <strong>BYTEA</strong></li>
            <li>El SELECT directo devuelve datos ilegibles (<code>\x...</code>)</li>
            <li>Para descifrar: <code>pgp_sym_decrypt(col, clave)</code></li>
            <li>El panel Admin descifra en tiempo real vía API</li>
          </ol>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-row">
        {[
          { id:'overview',  label:'📊 Vista comparada' },
          { id:'audit',     label:'📋 audit_logs' },
          { id:'errors',    label:'⚠️ error_logs' },
          { id:'sql',       label:'🗄️ SQL para pgAdmin' },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── VISTA COMPARADA ── */}
      {activeTab === 'overview' && auditData?.data?.length > 0 && (
        <div className="card" style={{ padding:'18px' }}>
          <p style={{ fontSize:'13px', fontWeight:500, marginBottom:'14px' }}>
            Comparación: valor cifrado (BYTEA) vs valor descifrado — tabla <code className="tag">audit_logs</code>
          </p>
          <div className="compare-grid">
            <div className="compare-header">🔒 ip_encrypted (BYTEA en BD)</div>
            <div className="compare-header">✅ IP descifrada (pgp_sym_decrypt)</div>
            <div className="compare-header">🔒 agent_encrypted (BYTEA en BD)</div>
            <div className="compare-header">✅ User-Agent descifrado</div>
            {auditData.data.slice(0,6).map(r => (
              <>
                <div key={r.id+'a'} className="enc-cell">{shortHex(r.ip_raw_hex)}</div>
                <div key={r.id+'b'} className="dec-cell">{r.ip_dec}</div>
                <div key={r.id+'c'} className="enc-cell">{shortHex(r.agent_raw_hex)}</div>
                <div key={r.id+'d'} className="dec-cell" style={{ fontSize:'10px' }}>
                  {(r.agent_dec || '').slice(0,60)}{r.agent_dec?.length > 60 ? '…' : ''}
                </div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* ── AUDIT LOGS ── */}
      {activeTab === 'audit' && (
        <div className="card card-flush">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID (parcial)</th><th>Acción</th><th>Fecha</th>
                  <th>🔒 ip_encrypted (BYTEA)</th>
                  <th>✅ IP descifrada</th>
                  <th>Bytes cifrados</th>
                </tr>
              </thead>
              <tbody>
                {(auditData?.data || []).map(r => (
                  <tr key={r.id}>
                    <td><code className="tag">{String(r.id).slice(0,8)}…</code></td>
                    <td><span className="badge b-blue">{r.action}</span></td>
                    <td style={{ fontSize:'11px', color:'var(--muted)' }}>{fmt(r.created_at)}</td>
                    <td><span className="enc-value" title={r.ip_raw_hex}>{shortHex(r.ip_raw_hex)}</span></td>
                    <td><span className="dec-value">{r.ip_dec}</span></td>
                    <td><span className="badge b-gray">{r.ip_enc_bytes} B</span></td>
                  </tr>
                ))}
                {!auditData?.data?.length && (
                  <tr><td colSpan={6}><div className="empty-state">Sin registros cifrados aún. Realiza un login.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ERROR LOGS ── */}
      {activeTab === 'errors' && (
        <div className="card card-flush">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Severidad</th><th>error_message <small>(campo plano)</small></th>
                  <th>🔒 message_encrypted (BYTEA)</th>
                  <th>✅ Mensaje descifrado</th>
                  <th>🔒 ip_encrypted</th>
                  <th>✅ IP</th>
                  <th>Bytes</th>
                </tr>
              </thead>
              <tbody>
                {(errorData?.data || []).map(r => (
                  <tr key={r.id}>
                    <td><span className={`badge b-${r.severity === 'ERROR' || r.severity === 'FATAL' ? 'red' : 'amber'}`}>{r.severity}</span></td>
                    <td><span className="enc-tag">[CIFRADO]</span></td>
                    <td><span className="enc-value" title={r.msg_raw_hex}>{shortHex(r.msg_raw_hex)}</span></td>
                    <td><span className="dec-value" style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', display:'block' }}>{r.message_dec}</span></td>
                    <td><span className="enc-value" title={r.ip_raw_hex}>{shortHex(r.ip_raw_hex)}</span></td>
                    <td><span className="dec-value">{r.ip_dec}</span></td>
                    <td><span className="badge b-gray">{r.msg_enc_bytes} B</span></td>
                  </tr>
                ))}
                {!errorData?.data?.length && (
                  <tr><td colSpan={7}><div className="empty-state">Sin errores cifrados. Ve a "Error Logs" y genera uno de prueba.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SQL PARA PGADMIN ── */}
      {activeTab === 'sql' && sqlExamples && (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div className="enc-banner" style={{ marginBottom:0 }}>
            <span className="enc-icon">💡</span>
            <p>Copia estas consultas y ejecútalas en <strong>pgAdmin 4 → Query Tool</strong> sobre la BD <code>fie_explorer_3d</code> para verificar el cifrado directamente en la base de datos.</p>
          </div>

          {sqlExamples.queries.map((q, i) => (
            <div key={i} className="sql-card">
              <div className="sql-header">
                <div>
                  <span className="sql-num">{i + 1}</span>
                  <span className="sql-title">{q.title}</span>
                  <span className="tag" style={{ marginLeft:'8px' }}>{q.table}</span>
                </div>
                <button className="btn btn-sm" onClick={() => copySQL(q.sql, i)}>
                  {copiedIdx === i ? '✅ Copiado' : '📋 Copiar'}
                </button>
              </div>
              <pre className="sql-block">{q.sql}</pre>
              <div className="sql-expected">
                <span style={{ fontSize:'11px', fontWeight:600, color:'var(--muted)' }}>Resultado esperado: </span>
                <span style={{ fontSize:'11px', color:'var(--muted)' }}>{q.expected}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function EncField({ col, type, plain, algo }) {
  return (
    <div className="enc-field-row">
      <code className="tag">{col}</code>
      <span className="enc-type">{type}</span>
      <span className="enc-algo">{algo}</span>
    </div>
  )
}
