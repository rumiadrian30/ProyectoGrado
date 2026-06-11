import { useState, useEffect } from 'react'
import { api } from '../api'

const GROUP_META = {
  login:         { label: 'Seguridad de acceso',  desc: 'Control de intentos de inicio de sesión y bloqueo de cuentas.' },
  session:       { label: 'Sesión',               desc: 'Duración y comportamiento de las sesiones de usuario.' },
  accessibility: { label: 'Accesibilidad',        desc: 'Opciones para facilitar el acceso al explorador público.' },
}

const STRING_OPTIONS = {
  'accessibility.font_size': [
    { value: 'small',  label: 'Pequeño' },
    { value: 'medium', label: 'Mediano (defecto)' },
    { value: 'large',  label: 'Grande' },
  ],
}

const TABS = [
  { id: 'login',         label: 'Seguridad',        icon: <IconShield /> },
  { id: 'session',       label: 'Sesión',            icon: <IconClock />  },
  { id: 'accessibility', label: 'Accesibilidad',     icon: <IconEye />    },
  { id: 'roles',         label: 'Límites de roles',  icon: <IconUsers />  },
]

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

  async function saveConfig(key, value) {
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await api('PUT', `/settings/config/${encodeURIComponent(key)}`, { config_value: String(value) })
      setEditing(e => { const n = { ...e }; delete n[key]; return n })
      showToast('Configuración guardada.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(s => ({ ...s, [key]: false })) }
  }

  async function resetConfig(key, label) {
    if (!confirm(`¿Restaurar "${label}" al valor por defecto?`)) return
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await api('POST', `/settings/config/${encodeURIComponent(key)}/reset`)
      showToast(`"${label}" restaurado al valor por defecto.`); loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(s => ({ ...s, [key]: false })) }
  }

  async function saveLimit(role) {
    const val = parseInt(editing[`limit_${role}`])
    if (isNaN(val) || val < 1 || val > 20) return showToast('El límite debe ser 1–20.', 'error')
    setSaving(s => ({ ...s, [`limit_${role}`]: true }))
    try {
      await api('PUT', `/settings/role-limits/${role}`, { max_count: val })
      setEditing(e => { const n = { ...e }; delete n[`limit_${role}`]; return n })
      showToast(`Límite del rol "${role}" actualizado.`); loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(s => ({ ...s, [`limit_${role}`]: false })) }
  }

  if (loading) return (
    <div className="st-loading"><div className="st-spinner" /><span>Cargando configuración…</span></div>
  )

  return (
    <div className="st-root">

      {/* Header */}
      <div className="st-page-hdr">
        <div>
          <h2 className="st-page-title">Configuración del sistema</h2>
          <p className="st-page-sub">Solo superadministradores pueden modificar estos parámetros.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="st-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`st-tab ${activeTab === t.id ? 'st-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            <span className="st-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Grupos de config */}
      {activeTab !== 'roles' && groups[activeTab] && (
        <div className="st-section">
          <div className="st-section-hdr">
            <h3 className="st-section-title">{GROUP_META[activeTab]?.label}</h3>
            <p className="st-section-desc">{GROUP_META[activeTab]?.desc}</p>
          </div>
          <div className="st-config-list">
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

      {/* Límites de roles */}
      {activeTab === 'roles' && (
        <div className="st-section">
          <div className="st-section-hdr">
            <h3 className="st-section-title">Límites de usuarios por rol</h3>
            <p className="st-section-desc">Número máximo de usuarios activos permitidos por cada rol.</p>
          </div>
          <div className="st-roles-grid">
            {limits.map(l => {
              const editKey = `limit_${l.role_name}`
              const isEdit  = editKey in editing
              const pct     = Math.round((l.active_count / l.max_count) * 100)
              const danger  = pct >= 100
              const warn    = pct >= 80 && !danger

              return (
                <div key={l.role_name} className={`st-role-card ${danger ? 'st-role-card--danger' : warn ? 'st-role-card--warn' : ''}`}>
                  <div className="st-role-header">
                    <div className={`st-role-icon st-role-icon--${l.role_name}`}>
                      {l.role_name === 'superadmin' ? <IconCrown /> : <IconUser />}
                    </div>
                    <div>
                      <span className="st-role-name">{l.role_name}</span>
                      <span className="st-role-meta">
                        {l.active_count} activo{l.active_count !== 1 ? 's' : ''} · {l.available} cupo{l.available !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="st-progress-track">
                    <div
                      className={`st-progress-bar ${danger ? 'st-progress-bar--danger' : warn ? 'st-progress-bar--warn' : ''}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="st-progress-labels">
                    <span>{l.active_count} / {l.max_count} usuarios</span>
                    {danger && <span className="st-limit-reached">Límite alcanzado</span>}
                  </div>

                  {/* Editor de límite */}
                  <div className="st-role-footer">
                    <span className="st-role-footer-label">Máximo:</span>
                    {isEdit ? (
                      <div className="st-role-edit-row">
                        <input type="number" min="1" max="20" autoFocus
                          className="st-input st-input--sm st-input--center"
                          value={editing[editKey]}
                          onChange={e => setEditing(ed => ({ ...ed, [editKey]: e.target.value }))} />
                        <button className="st-btn st-btn--primary st-btn--sm"
                          onClick={() => saveLimit(l.role_name)}
                          disabled={saving[editKey]}>
                          {saving[editKey] ? '…' : <><IconCheck /> Guardar</>}
                        </button>
                        <button className="st-btn st-btn--ghost st-btn--sm"
                          onClick={() => setEditing(e => { const n = { ...e }; delete n[editKey]; return n })}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="st-role-view-row">
                        <span className="st-role-max-value">{l.max_count}</span>
                        <button className="st-btn st-btn--ghost st-btn--sm"
                          onClick={() => setEditing(e => ({ ...e, [editKey]: l.max_count }))}>
                          <IconEdit /> Cambiar
                        </button>
                      </div>
                    )}
                  </div>

                  {l.updated_by_name && (
                    <span className="st-role-updated">Actualizado por {l.updated_by_name}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {toast && (
        <div className={`st-toast ${toast.type === 'error' ? 'st-toast--error' : 'st-toast--success'}`}>
          {toast.type === 'error' ? <IconAlert /> : <IconCheck />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

/* ── ConfigRow ──────────────────────────────────────────────── */
function ConfigRow({ cfg, editing, saving, setEditing, onSave, onReset }) {
  const key       = cfg.config_key
  const isEdit    = key in editing
  const isSav     = saving[key]
  const isDefault = cfg.config_value === cfg.default_value
  const options   = STRING_OPTIONS[key] || null

  return (
    <div className="st-config-row">
      <div className="st-config-info">
        <span className="st-config-label">{cfg.label}</span>
        {cfg.description && <span className="st-config-desc">{cfg.description}</span>}
        {cfg.min_value !== null && cfg.max_value !== null && (
          <span className="st-config-range">Rango: {cfg.min_value} – {cfg.max_value}</span>
        )}
      </div>

      <div className="st-config-control">
        {isEdit ? (
          <>
            {cfg.value_type === 'boolean' && (
              <select className="st-input st-input--select"
                value={editing[key]}
                onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))}>
                <option value="true">Activado</option>
                <option value="false">Desactivado</option>
              </select>
            )}
            {cfg.value_type === 'integer' && (
              <input type="number" autoFocus
                min={cfg.min_value ?? 1} max={cfg.max_value ?? 9999}
                className="st-input st-input--sm st-input--center"
                value={editing[key]}
                onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))} />
            )}
            {cfg.value_type === 'string' && options && (
              <select className="st-input st-input--select"
                value={editing[key]}
                onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))}>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {cfg.value_type === 'string' && !options && (
              <input type="text" autoFocus className="st-input"
                value={editing[key]}
                onChange={e => setEditing(ed => ({ ...ed, [key]: e.target.value }))} />
            )}
            <button className="st-btn st-btn--primary st-btn--sm"
              onClick={() => onSave(key, editing[key])} disabled={isSav}>
              {isSav ? '…' : <IconCheck />}
            </button>
            <button className="st-btn st-btn--ghost st-btn--sm"
              onClick={() => setEditing(e => { const n = { ...e }; delete n[key]; return n })}
              disabled={isSav}>
              <IconX />
            </button>
          </>
        ) : (
          <>
            <ValueDisplay type={cfg.value_type} value={cfg.config_value} options={options} />
            {!isDefault && <span className="st-modified-badge">modificado</span>}
            <button className="st-btn st-btn--ghost st-btn--sm"
              onClick={() => setEditing(e => ({ ...e, [key]: cfg.config_value }))}>
              <IconEdit />
            </button>
            {!isDefault && (
              <button className="st-btn st-btn--ghost st-btn--sm" title="Restaurar valor por defecto"
                onClick={() => onReset(key, cfg.label)}>
                <IconReset />
              </button>
            )}
          </>
        )}
      </div>

      {cfg.updated_by_name && (
        <span className="st-config-updated">Modificado por {cfg.updated_by_name}</span>
      )}
    </div>
  )
}

/* ── ValueDisplay ───────────────────────────────────────────── */
function ValueDisplay({ type, value, options }) {
  if (type === 'boolean') {
    const on = value === 'true'
    return (
      <span className={`st-bool-badge ${on ? 'st-bool-badge--on' : 'st-bool-badge--off'}`}>
        <span className="st-bool-dot" />
        {on ? 'Activado' : 'Desactivado'}
      </span>
    )
  }
  if (options) {
    const opt = options.find(o => o.value === value)
    return <span className="st-option-badge">{opt?.label || value}</span>
  }
  return <span className="st-numeric-value">{value}</span>
}

/* ── Icons ──────────────────────────────────────────────────── */
function IconShield()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function IconClock()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> }
function IconEye()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconSettings() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
function IconUsers()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IconCrown()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 20h20M4 20l2-10 6 5 6-5 2 10"/><circle cx="12" cy="6" r="2"/></svg> }
function IconUser()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function IconEdit()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconCheck()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> }
function IconX()        { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconReset()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg> }
function IconAlert()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg> }