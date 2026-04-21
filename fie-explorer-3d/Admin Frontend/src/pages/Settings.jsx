import { useState, useEffect } from 'react'
import { api } from '../api'

// ── Metadatos de grupos ───────────────────────────────────────
const GROUP_META = {
  login: {
    label: 'Seguridad de acceso',
    desc:  'Control de intentos de inicio de sesión y bloqueo de cuentas.',
  },
  session: {
    label: 'Sesión',
    desc:  'Duración y comportamiento de las sesiones de usuario.',
  },
  accessibility: {
    label: 'Accesibilidad',
    desc:  'Opciones para facilitar el acceso al explorador público.',
  },
  system: {
    label: 'Sistema',
    desc:  'Comportamiento general del explorador 3D.',
  },
}

const STRING_OPTIONS = {
  'accessibility.font_size': [
    { value:'small',  label:'Pequeño' },
    { value:'medium', label:'Mediano (defecto)' },
    { value:'large',  label:'Grande' },
  ],
  'accessibility.language': [
    { value:'es', label:'Español' },
    { value:'en', label:'English' },
  ],
}

export default function Settings() {
  const [limits,    setLimits]    = useState([])
  const [groups,    setGroups]    = useState({})
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState({})
  const [editing,   setEditing]   = useState({})
  const [toast,     setToast]     = useState(null)
  const [activeTab, setActiveTab] = useState('login')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [l, c] = await Promise.all([
        api('GET', '/settings/role-limits'),
        api('GET', '/settings/config'),
      ])
      setLimits(l)
      setGroups(c.groups || {})
    } catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  // ── Config general ──────────────────────────────────────────
  async function saveConfig(key, value) {
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await api('PUT', `/settings/config/${encodeURIComponent(key)}`, { config_value: String(value) })
      setEditing(e => { const n={...e}; delete n[key]; return n })
      showToast('Configuración guardada.')
      loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(s => ({ ...s, [key]: false })) }
  }

  async function resetConfig(key, label) {
    if (!confirm(`¿Restaurar "${label}" al valor por defecto?`)) return
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await api('POST', `/settings/config/${encodeURIComponent(key)}/reset`)
      showToast(`"${label}" restaurado al valor por defecto.`)
      loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(s => ({ ...s, [key]: false })) }
  }

  // ── Límites de roles ────────────────────────────────────────
  async function saveLimit(role) {
    const val = parseInt(editing[`limit_${role}`])
    if (isNaN(val) || val < 1 || val > 20) return showToast('El límite debe ser 1–20.', 'error')
    setSaving(s => ({ ...s, [`limit_${role}`]: true }))
    try {
      await api('PUT', `/settings/role-limits/${role}`, { max_count: val })
      setEditing(e => { const n={...e}; delete n[`limit_${role}`]; return n })
      showToast(`Límite del rol "${role}" actualizado.`)
      loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(s => ({ ...s, [`limit_${role}`]: false })) }
  }

  if (loading) return <div className="loader">Cargando configuración…</div>

  const TABS = [
    { id:'login',         label:'🔐 Seguridad'      },
    { id:'session',       label:'⏱️ Sesión'           },
    { id:'accessibility', label:'♿ Accesibilidad'    },
    { id:'system',        label:'⚙️ Sistema'          },
    { id:'roles',         label:'👥 Límites de roles' },
  ]

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Configuración del sistema</div>
          <div className="page-sub">Solo superadministradores pueden modificar estos parámetros.</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-row" style={{ marginBottom:'18px' }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── Grupos de configuración ── */}
      {activeTab !== 'roles' && groups[activeTab] && (
        <div>
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'13px', fontWeight:600 }}>
              {GROUP_META[activeTab]?.icon} {GROUP_META[activeTab]?.label}
            </div>
            <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'2px' }}>
              {GROUP_META[activeTab]?.desc}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {groups[activeTab].map(cfg => (
              <ConfigRow
                key={cfg.config_key}
                cfg={cfg}
                editing={editing}
                saving={saving}
                setEditing={setEditing}
                onSave={saveConfig}
                onReset={resetConfig}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Límites de roles ── */}
      {activeTab === 'roles' && (
        <div>
          <div style={{ marginBottom:'14px' }}>
            <div style={{ fontSize:'13px', fontWeight:600 }}>Límites de usuarios por rol</div>
            <div style={{ fontSize:'12px', color:'var(--muted)', marginTop:'2px' }}>
              Número máximo de usuarios activos permitidos por cada rol.
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:'12px' }}>
            {limits.map(l => {
              const editKey = `limit_${l.role_name}`
              const isEdit  = editKey in editing
              const pct     = Math.round((l.active_count / l.max_count) * 100)
              const danger  = pct >= 100
              const warn    = pct >= 80 && !danger
              const barColor = danger ? '#dc2626' : warn ? '#d97706' : '#003087'
              const roleColors = {
                superadmin: { bg:'#f5f3ff', border:'#ddd6fe', accent:'#7c3aed', icon:'👑' },
                admin:      { bg:'#eff6ff', border:'#bfdbfe', accent:'#1d4ed8', icon:'👤' },
              }
              const rc = roleColors[l.role_name] || roleColors.admin

              return (
                <div key={l.role_name} style={{
                  background:'#fff', borderRadius:12, padding:'18px 20px',
                  border:`1px solid ${rc.border}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:rc.bg,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>
                      {rc.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'14px', textTransform:'capitalize' }}>{l.role_name}</div>
                      <div style={{ fontSize:'11px', color:'var(--muted)' }}>
                        {l.active_count} activo{l.active_count!==1?'s':''} · {l.available} cupo{l.available!==1?'s':''}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom:'14px' }}>
                    <div style={{ height:5, background:'#f1f5f9', borderRadius:9999, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`,
                        background:barColor, borderRadius:9999, transition:'width .3s' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between',
                      fontSize:'10px', color:'var(--faint)', marginTop:'3px' }}>
                      <span>{l.active_count} / {l.max_count} usuarios</span>
                      {danger && <span style={{ color:'var(--danger)', fontWeight:600 }}>Límite alcanzado</span>}
                    </div>
                  </div>

                  <div style={{ display:'flex', alignItems:'center', gap:'8px',
                    paddingTop:'12px', borderTop:'1px solid var(--border)' }}>
                    <span style={{ fontSize:'12px', color:'var(--muted)' }}>Máximo:</span>
                    {isEdit ? (
                      <>
                        <input type="number" min="1" max="20" autoFocus
                          value={editing[editKey]}
                          onChange={e => setEditing(ed => ({ ...ed, [editKey]: e.target.value }))}
                          style={{ width:60, padding:'4px 8px', border:'1.5px solid var(--accent)',
                            borderRadius:6, fontFamily:'inherit', fontSize:'13px',
                            fontWeight:600, textAlign:'center' }}/>
                        <button className="btn btn-primary btn-sm"
                          onClick={() => saveLimit(l.role_name)}
                          disabled={saving[editKey]}>
                          {saving[editKey] ? '…' : '✓ Guardar'}
                        </button>
                        <button className="btn btn-sm"
                          onClick={() => setEditing(e => { const n={...e}; delete n[editKey]; return n })}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight:700, fontSize:'18px', color:rc.accent, minWidth:28 }}>
                          {l.max_count}
                        </span>
                        <button className="btn btn-sm" style={{ marginLeft:'auto' }}
                          onClick={() => setEditing(e => ({ ...e, [editKey]: l.max_count }))}>
                          ✏ Cambiar
                        </button>
                      </>
                    )}
                  </div>
                  {l.updated_by_name && (
                    <div style={{ fontSize:'10px', color:'var(--faint)', marginTop:'6px' }}>
                      Actualizado por {l.updated_by_name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {toast && <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>}
    </>
  )
}

// ── Componente fila de configuración ─────────────────────────
function ConfigRow({ cfg, editing, saving, setEditing, onSave, onReset }) {
  const key     = cfg.config_key
  const isEdit  = key in editing
  const isSav   = saving[key]
  const isDefault = cfg.config_value === cfg.default_value

  function startEdit() {
    setEditing(e => ({ ...e, [key]: cfg.config_value }))
  }
  function cancelEdit() {
    setEditing(e => { const n={...e}; delete n[key]; return n })
  }

  const options = STRING_OPTIONS[key] || null

  return (
    <div className="card" style={{ padding:'14px 18px', display:'flex',
      alignItems:'flex-start', gap:'16px', flexWrap:'wrap' }}>

      {/* Info del parámetro */}
      <div style={{ flex:'1 1 220px', minWidth:0 }}>
        <div style={{ fontSize:'13px', fontWeight:500, marginBottom:'2px' }}>{cfg.label}</div>
        {cfg.description && (
          <div style={{ fontSize:'11px', color:'var(--muted)', lineHeight:1.5 }}>{cfg.description}</div>
        )}
        {cfg.min_value !== null && cfg.max_value !== null && (
          <div style={{ fontSize:'10px', color:'var(--faint)', marginTop:'2px' }}>
            Rango: {cfg.min_value} – {cfg.max_value}
          </div>
        )}
      </div>

      {/* Control del valor */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
        {isEdit ? (
          <>
            {/* Boolean */}
            {cfg.value_type === 'boolean' && (
              <select className="form-select" style={{ width:120 }}
                value={editing[key]}
                onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))}>
                <option value="true">Activado</option>
                <option value="false">Desactivado</option>
              </select>
            )}
            {/* Integer */}
            {cfg.value_type === 'integer' && (
              <input type="number" autoFocus
                min={cfg.min_value ?? 1} max={cfg.max_value ?? 9999}
                className="form-input" style={{ width:80 }}
                value={editing[key]}
                onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))}/>
            )}
            {/* String con opciones */}
            {cfg.value_type === 'string' && options && (
              <select className="form-select" style={{ width:160 }}
                value={editing[key]}
                onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))}>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {/* String libre */}
            {cfg.value_type === 'string' && !options && (
              <input type="text" autoFocus className="form-input" style={{ width:140 }}
                value={editing[key]}
                onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))}/>
            )}

            <button className="btn btn-primary btn-sm" onClick={() => onSave(key, editing[key])} disabled={isSav}>
              {isSav ? '…' : '✓'}
            </button>
            <button className="btn btn-sm" onClick={cancelEdit} disabled={isSav}>✕</button>
          </>
        ) : (
          <>
            {/* Valor actual como badge */}
            <ValueDisplay type={cfg.value_type} value={cfg.config_value} options={options} />

            {!isDefault && (
              <span style={{ fontSize:'10px', color:'var(--warning)',
                background:'#fef3c7', padding:'1px 5px', borderRadius:3 }}>
                modificado
              </span>
            )}

            <button className="btn btn-sm" onClick={startEdit}>✏</button>
            {!isDefault && (
              <button className="btn btn-sm" title="Restaurar valor por defecto"
                onClick={() => onReset(key, cfg.label)}>↩</button>
            )}
          </>
        )}
      </div>

      {/* Última actualización */}
      {cfg.updated_by_name && (
        <div style={{ width:'100%', fontSize:'10px', color:'var(--faint)', marginTop:'-4px' }}>
          Modificado por {cfg.updated_by_name}
        </div>
      )}
    </div>
  )
}

function ValueDisplay({ type, value, options }) {
  if (type === 'boolean') {
    const on = value === 'true'
    return (
      <span style={{
        padding:'3px 10px', borderRadius:9999, fontSize:'12px', fontWeight:600,
        background: on ? '#dcfce7' : '#f1f5f9',
        color:      on ? '#15803d' : '#6b7280',
      }}>
        {on ? '● Activado' : '○ Desactivado'}
      </span>
    )
  }
  if (options) {
    const opt = options.find(o => o.value === value)
    return <span className="badge b-blue">{opt?.label || value}</span>
  }
  return (
    <span style={{ fontWeight:700, fontSize:'16px', color:'var(--text)', minWidth:30, textAlign:'center' }}>
      {value}
    </span>
  )
}
