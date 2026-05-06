import { useState, useEffect } from 'react'
import { api, fmt } from '../api'

const TYPE_LABELS = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' }
const TYPE_BADGE  = { main: 'b-blue', secondary: 'b-gray', lab: 'b-teal' }
const LOD_LABELS  = { 0: 'LOD 0 — Alta', 1: 'LOD 1 — Media', 2: 'LOD 2 — Baja' }
const EMPTY_FORM  = { name: '', code: '', description: '', type: 'main', floor_count: 1 }

function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target.className === 'overlay' && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function BuildingForm({ data, onChange, isEdit = false }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <>
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Nombre del edificio *</label>
          <input className="form-input" placeholder="Ej: Bloque Académico A"
            value={data.name || ''} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Código *</label>
          <input className="form-input" placeholder="Ej: FIE-A"
            value={data.code || ''}
            onChange={e => set('code', e.target.value.toUpperCase())}
            style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '.05em' }} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Tipo *</label>
          <select className="form-select" value={data.type || 'main'} onChange={e => set('type', e.target.value)}>
            <option value="main">Principal</option>
            <option value="secondary">Secundario</option>
            <option value="lab">Laboratorio</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Número de plantas</label>
          <input className="form-input" type="number" min="1" max="20"
            value={data.floor_count || 1}
            onChange={e => set('floor_count', parseInt(e.target.value) || 1)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea className="form-textarea" rows={3}
          placeholder="Descripción del edificio, función principal, etc."
          value={data.description || ''} onChange={e => set('description', e.target.value)} />
      </div>
      {isEdit && (
        <div className="form-group">
          <label className="form-label">Estado</label>
          <select className="form-select"
            value={data.is_active ? 'true' : 'false'}
            onChange={e => set('is_active', e.target.value === 'true')}>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      )}
    </>
  )
}

function BuildingModels({ building, onToast }) {
  const [models, setModels] = useState(null)
  const [open,   setOpen]   = useState(false)
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const all = await api('GET', '/models')
      setModels(all.filter(m => m.building_id === building.id))
    } catch (e) { onToast(e.message, 'error') }
  }

  function toggle() {
    if (!open && models === null) load()
    setOpen(o => !o)
  }

  async function confirmNew() {
    if (!form.file_path?.trim()) return onToast('La ruta del archivo es obligatoria.', 'error')
    setSaving(true)
    try {
      await api('POST', '/models', form)
      setModal(null); onToast('Modelo registrado correctamente.'); load()
    } catch (e) { onToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function toggleModel(m) {
    try {
      await api('PUT', `/models/${m.id}`, { is_active: !m.is_active })
      onToast(`Modelo ${!m.is_active ? 'activado' : 'desactivado'}.`); load()
    } catch (e) { onToast(e.message, 'error') }
  }

  async function confirmDeleteModel() {
    try {
      await api('DELETE', `/models/${modal.id}`)
      setModal(null); onToast('Modelo eliminado.'); load()
    } catch (e) { onToast(e.message, 'error') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: '10px' }}>
      <button onClick={toggle} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 0', fontSize: '12px', color: 'var(--muted)',
      }}>
        <span>
          📦 Modelos 3D
          {models !== null && (
            <span style={{
              marginLeft: 6, background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '0 6px', fontSize: '11px',
            }}>{models.length}</span>
          )}
        </span>
        <span style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ paddingBottom: '8px' }}>
          {models === null && <div style={{ fontSize: '12px', color: 'var(--faint)', padding: '4px 0' }}>Cargando…</div>}
          {models !== null && models.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--faint)', padding: '4px 0' }}>Sin modelos registrados.</div>
          )}
          {models !== null && models.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 8px', borderRadius: '6px', marginBottom: '3px',
              background: m.is_active ? 'var(--bg)' : 'rgba(0,0,0,.03)',
              opacity: m.is_active ? 1 : 0.6,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 500, display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span className="badge b-blue" style={{ fontSize: '10px' }}>{m.model_type}</span>
                  <span style={{ color: 'var(--muted)' }}>{LOD_LABELS[m.lod_level]}</span>
                </div>
                <div style={{
                  fontSize: '11px', color: 'var(--faint)', marginTop: '2px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px',
                }} title={m.file_path}>{m.file_path}</div>
              </div>
              <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                <button className="btn btn-sm btn-icon"
                  title={m.is_active ? 'Desactivar' : 'Activar'}
                  onClick={() => toggleModel(m)}
                  style={{ color: m.is_active ? 'var(--danger)' : 'var(--success)' }}>
                  {m.is_active ? '⏸' : '▶'}
                </button>
                <button className="btn btn-sm btn-danger btn-icon"
                  onClick={() => setModal({ type: 'del-model', id: m.id, name: m.file_path })}>✕</button>
              </div>
            </div>
          ))}
          <button className="btn btn-sm" style={{ marginTop: '6px', width: '100%', fontSize: '12px' }}
            onClick={() => { setForm({ building_id: building.id, model_type: 'exterior', lod_level: 0, format: 'GLB' }); setModal({ type: 'new' }) }}>
            + Añadir modelo
          </button>
        </div>
      )}

      {modal?.type === 'new' && (
        <Modal title={`Nuevo modelo — ${building.name}`} onConfirm={confirmNew}
          confirmLabel={saving ? 'Guardando…' : 'Registrar modelo'} onClose={() => setModal(null)}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tipo *</label>
              <select className="form-select" value={form.model_type} onChange={e => set('model_type', e.target.value)}>
                <option value="exterior">Exterior</option>
                <option value="interior">Interior</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nivel LOD *</label>
              <select className="form-select" value={form.lod_level} onChange={e => set('lod_level', parseInt(e.target.value))}>
                <option value={0}>0 — Alta resolución</option>
                <option value={1}>1 — Media resolución</option>
                <option value={2}>2 — Baja resolución</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ruta del archivo *</label>
            <input className="form-input" placeholder="/models/fie-main_exterior_lod0.glb"
              value={form.file_path || ''} onChange={e => set('file_path', e.target.value)} />
            <small style={{ color: 'var(--faint)', fontSize: '11px' }}>Ruta relativa desde public/ del frontend.</small>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tamaño (MB)</label>
              <input className="form-input" type="number" step="0.1"
                value={form.file_size_mb || ''} onChange={e => set('file_size_mb', parseFloat(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Formato</label>
              <select className="form-select" value={form.format} onChange={e => set('format', e.target.value)}>
                <option value="GLB">GLB</option>
                <option value="GLTF">GLTF</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'del-model' && (
        <Modal title="Eliminar modelo" onConfirm={confirmDeleteModel}
          confirmLabel="Eliminar" danger onClose={() => setModal(null)}>
          <p style={{ fontSize: '13px', textAlign: 'center' }}>
            ¿Eliminar el modelo <code className="tag">{modal.name}</code>?
          </p>
        </Modal>
      )}
    </div>
  )
}

export default function Buildings() {
  const [buildings, setBuildings] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [toast,     setToast]     = useState(null)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try { setBuildings(await api('GET', '/buildings')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  async function confirmCreate() {
    if (!form.name?.trim()) return showToast('El nombre es obligatorio.', 'error')
    if (!form.code?.trim()) return showToast('El código es obligatorio.', 'error')
    setSaving(true)
    try {
      await api('POST', '/buildings', form)
      setModal(null); showToast(`Edificio "${form.name}" creado correctamente.`); load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function confirmEdit() {
    if (!form.name?.trim()) return showToast('El nombre es obligatorio.', 'error')
    setSaving(true)
    try {
      await api('PUT', `/buildings/${modal.id}`, form)
      setModal(null); showToast('Edificio actualizado correctamente.'); load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    setSaving(true)
    try {
      await api('DELETE', `/buildings/${modal.id}`)
      setModal(null); showToast(`Edificio "${modal.name}" eliminado.`); load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleToggle(b) {
    try {
      await api('PATCH', `/buildings/${b.id}/toggle`)
      showToast(`Edificio "${b.name}" ${b.is_active ? 'desactivado' : 'activado'}.`); load()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="loader">Cargando…</div>
  if (error)   return <div className="alert alert-error">Error: {error}</div>

  const active = buildings.filter(b => b.is_active).length

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Edificios</div>
          <div className="page-sub">{active} activo{active !== 1 ? 's' : ''} · {buildings.length - active} inactivo{buildings.length - active !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal({ type: 'create' }) }}>
          + Nuevo edificio
        </button>
      </div>

      {buildings.length === 0 ? (
        <div className="alert" style={{ textAlign: 'center', padding: '2rem' }}>
          No hay edificios registrados. Crea el primero con el botón de arriba.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '12px' }}>
          {buildings.map(b => (
            <div key={b.id} className="card" style={{ padding: '16px', opacity: b.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge ${TYPE_BADGE[b.type] || 'b-gray'}`}>{TYPE_LABELS[b.type] || b.type}</span>
                  <code className="tag">{b.code}</code>
                </div>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4, display: 'inline-block',
                  background: b.is_active ? 'var(--success)' : 'var(--danger)',
                }} />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{b.name}</h3>
              <p style={{
                fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '10px',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', minHeight: '2.8em',
              }}>
                {b.description || <span style={{ fontStyle: 'italic' }}>Sin descripción</span>}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--faint)' }}>
                  <span>{b.floor_count} planta{b.floor_count !== 1 ? 's' : ''}</span>
                  <span>{b.hotspot_count ?? 0} hotspot{(b.hotspot_count ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-sm" title={b.is_active ? 'Desactivar' : 'Activar'}
                    onClick={() => handleToggle(b)}
                    style={{ color: b.is_active ? 'var(--danger)' : 'var(--success)' }}>
                    {b.is_active ? '⏸' : '▶'}
                  </button>
                  <button className="btn btn-sm" title="Editar"
                    onClick={() => { setForm({ ...b }); setModal({ type: 'edit', id: b.id }) }}>✏</button>
                  <button className="btn btn-sm" title="Eliminar"
                    onClick={() => setModal({ type: 'delete', id: b.id, name: b.name, hotspot_count: b.hotspot_count })}
                    style={{ color: 'var(--danger)' }}>🗑</button>
                </div>
              </div>
              <BuildingModels building={b} onToast={showToast} />
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'create' && (
        <Modal title="Nuevo edificio" onConfirm={confirmCreate}
          confirmLabel={saving ? 'Guardando…' : 'Crear edificio'} onClose={() => setModal(null)}>
          <BuildingForm data={form} onChange={setForm} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Editar edificio" onConfirm={confirmEdit}
          confirmLabel={saving ? 'Guardando…' : 'Guardar cambios'} onClose={() => setModal(null)}>
          <BuildingForm data={form} onChange={setForm} isEdit />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal title="Eliminar edificio" onConfirm={confirmDelete}
          confirmLabel={saving ? 'Eliminando…' : 'Eliminar'} danger onClose={() => setModal(null)}>
          <p style={{ marginBottom: '12px' }}>¿Eliminar <strong>"{modal.name}"</strong>?</p>
          {(modal.hotspot_count ?? 0) > 0
            ? <div className="alert alert-error">Tiene <strong>{modal.hotspot_count} hotspot(s) activo(s)</strong>. Desactívalos primero.</div>
            : <div className="alert alert-error" style={{ fontSize: '13px' }}>Esta acción es <strong>irreversible</strong>.</div>
          }
        </Modal>
      )}

      {toast && <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>}
    </>
  )
}
