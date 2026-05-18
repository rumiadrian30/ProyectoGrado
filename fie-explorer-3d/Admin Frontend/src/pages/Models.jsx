import { useState, useEffect, useRef } from 'react'
import { api, fmt } from '../api'
import GlbPreview from '../components/GlbPreview'

const LOD_LABELS = { 0: 'Alta (LOD 0)', 1: 'Media (LOD 1)', 2: 'Baja (LOD 2)' }
const LOD_BADGE  = { 0: 'b-green', 1: 'b-amber', 2: 'b-gray' }

function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose, disabled = false }) {
  return (
    <div className="overlay" onClick={e => e.target.className === 'overlay' && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm} disabled={disabled}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function ScaleEditor({ form, set }) {
  const [uniform, setUniform] = useState(true)
  function setScale(axis, val) {
    const n = parseFloat(val) || 0.001
    if (uniform) { set('scale_x', n); set('scale_y', n); set('scale_z', n) }
    else { set(`scale_${axis}`, n) }
  }
  const sx = form.scale_x ?? 1
  const sy = form.scale_y ?? 1
  const sz = form.scale_z ?? 1
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginTop: '4px' }}>
      <div style={{ background: 'var(--bg)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Escala del modelo</span>
        <button type="button" className="btn btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }}
          onClick={() => { set('scale_x', 1); set('scale_y', 1); set('scale_z', 1) }}>Resetear 1×</button>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Escala (X / Y / Z)</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={uniform} onChange={e => setUniform(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
            Uniforme
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {['x', 'y', 'z'].map(ax => (
            <div key={ax}>
              <label style={{ fontSize: '10px', color: 'var(--faint)', display: 'block', marginBottom: '2px', textAlign: 'center' }}>{ax.toUpperCase()}</label>
              <input className="form-input" type="number" step="0.01" min="0.001"
                style={{ textAlign: 'center', padding: '4px', fontSize: '12px' }}
                value={form[`scale_${ax}`] ?? 1}
                onChange={e => setScale(ax, e.target.value)} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[0.1, 0.25, 0.5, 1, 2, 5].map(v => (
            <button key={v} type="button"
              style={{
                fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
                border: '1px solid var(--border)', cursor: 'pointer',
                background: (sx === v && sy === v && sz === v) ? 'var(--primary)' : 'transparent',
                color: (sx === v && sy === v && sz === v) ? '#fff' : 'var(--muted)',
              }}
              onClick={() => { set('scale_x', v); set('scale_y', v); set('scale_z', v) }}>{v}×</button>
          ))}
        </div>
        <div style={{ marginTop: '10px', padding: '8px 10px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <span>La posición (X, Y, Z) la controla el <strong>edificio padre</strong>. Edítala en la sección Edificios.</span>
        </div>
      </div>
    </div>
  )
}

function RotationEditor({ form, set }) {
  const Y_PRESETS = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginTop: '8px' }}>
      <div style={{ background: 'var(--bg)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Rotación del modelo (grados)</span>
        <button type="button" className="btn btn-sm" style={{ fontSize: '11px', padding: '2px 8px' }}
          onClick={() => { set('rotate_x', 0); set('rotate_y', 0); set('rotate_z', 0) }}>Resetear 0°</button>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Y — Orientación (guiñada)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="number" step="1" min="-360" max="360"
                value={form.rotate_y ?? 0}
                onChange={e => set('rotate_y', parseFloat(e.target.value) || 0)}
                style={{ width: '70px', padding: '3px 6px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '12px', fontWeight: 700 }} />
              <span style={{ fontSize: '11px', color: 'var(--faint)' }}>°</span>
            </div>
          </div>
          <input type="range" min="-180" max="180" step="1"
            value={form.rotate_y ?? 0}
            onChange={e => set('rotate_y', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary, #BC0613)', cursor: 'pointer' }} />
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '4px' }}>
            {Y_PRESETS.map(v => (
              <button key={v} type="button"
                style={{
                  flex: 1, padding: '2px 0', fontSize: '10px', borderRadius: '4px',
                  border: '1px solid var(--border)', cursor: 'pointer', minWidth: '30px',
                  background: (form.rotate_y ?? 0) === v ? 'var(--primary, #BC0613)' : 'transparent',
                  color: (form.rotate_y ?? 0) === v ? '#fff' : 'var(--muted)',
                }}
                onClick={() => set('rotate_y', v)}>{v}°</button>
            ))}
          </div>
        </div>
        <details style={{ marginTop: '4px' }}>
          <summary style={{ fontSize: '11px', color: 'var(--muted)', cursor: 'pointer', userSelect: 'none', padding: '3px 0' }}>
            Avanzado: X (cabeceo) y Z (alabeo)
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
            {[
              { ax: 'x', label: 'X — Cabeceo' },
              { ax: 'z', label: 'Z — Alabeo' },
            ].map(({ ax, label }) => (
              <div key={ax}>
                <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '3px' }}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input type="number" step="1" min="-180" max="180"
                    value={form[`rotate_${ax}`] ?? 0}
                    onChange={e => set(`rotate_${ax}`, parseFloat(e.target.value) || 0)}
                    style={{ flex: 1, padding: '4px 6px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '12px' }} />
                  <span style={{ fontSize: '11px', color: 'var(--faint)' }}>°</span>
                </div>
                <div style={{ display: 'flex', gap: '2px', marginTop: '3px' }}>
                  {[-90, -45, 0, 45, 90].map(v => (
                    <button key={v} type="button"
                      style={{
                        flex: 1, padding: '1px 0', fontSize: '9px', borderRadius: '3px',
                        border: '1px solid var(--border)', cursor: 'pointer',
                        background: (form[`rotate_${ax}`] ?? 0) === v ? 'var(--primary, #BC0613)' : 'transparent',
                        color: (form[`rotate_${ax}`] ?? 0) === v ? '#fff' : 'var(--muted)',
                      }}
                      onClick={() => set(`rotate_${ax}`, v)}>{v}°</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}

function scaleLabel(m) {
  const x = parseFloat(m.scale_x) || 1
  const y = parseFloat(m.scale_y) || 1
  const z = parseFloat(m.scale_z) || 1
  if (x === y && y === z) return x === 1 ? null : `${x}×`
  return `X:${x} Y:${y} Z:${z}`
}

function positionLabel(m) {
  const x = parseFloat(m.building_offset_x) || 0
  const y = parseFloat(m.building_offset_y) || 0
  const z = parseFloat(m.building_offset_z) || 0
  if (x === 0 && y === 0 && z === 0) return null
  return `(${x}, ${y}, ${z})`
}

// ── Diálogo de confirmación de eliminación con verificación y preview ──────────
function DeleteModelDialog({ modal, onConfirm, onClose, checking, deleting }) {
  const m = modal.model

  if (checking) {
    return (
      <Modal title="Confirmar eliminación" onConfirm={() => {}} confirmLabel="Verificando…" disabled onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔍</div>
          <div style={{ fontSize: '13px' }}>Verificando que el modelo existe en el servidor…</div>
        </div>
      </Modal>
    )
  }

  if (!m) {
    return (
      <Modal title="Modelo no encontrado" onConfirm={onClose} confirmLabel="Cerrar" onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '32px' }}>⚠️</div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: 280 }}>
            El modelo <code className="tag" style={{ fontSize: '11px' }}>{modal.name}</code> ya no existe
            o fue eliminado por otro administrador. Recarga la lista.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Eliminar modelo 3D"
      onConfirm={onConfirm}
      confirmLabel={deleting ? 'Eliminando…' : 'Sí, eliminar'}
      danger
      disabled={deleting}
      onClose={onClose}
    >
      {/* Advertencia */}
      <div style={{
        background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px',
        padding: '10px 14px', marginBottom: '14px',
        display: 'flex', alignItems: 'flex-start', gap: '8px',
      }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#9a3412' }}>Esta acción es irreversible</div>
          <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '2px' }}>
            El archivo GLB será eliminado permanentemente del servidor.
          </div>
        </div>
      </div>

      {/* Preview + detalles */}
      <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
        <GlbPreview filePath={m.file_path} height={180} />
        <div style={{ padding: '12px 14px', background: 'var(--surface)' }}>
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Archivo',    value: <code style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--muted)', wordBreak: 'break-all' }}>{m.file_path}</code> },
                { label: 'Edificio',   value: m.building_name ? `${m.building_name} (${m.building_code || ''})` : '—' },
                { label: 'Tipo',       value: <span className="badge b-blue" style={{ fontSize: '10px', textTransform: 'capitalize' }}>{m.model_type}</span> },
                { label: 'Resolución', value: <span className={`badge ${LOD_BADGE[m.lod_level] || 'b-gray'}`} style={{ fontSize: '10px' }}>{LOD_LABELS[m.lod_level] ?? `LOD ${m.lod_level}`}</span> },
                { label: 'Tamaño',     value: m.file_size_mb ? `${m.file_size_mb} MB` : '—' },
                { label: 'Estado',     value: m.is_active
                    ? <span style={{ color: 'var(--success)', fontWeight: 500 }}>● Activo</span>
                    : <span style={{ color: 'var(--danger)',  fontWeight: 500 }}>● Inactivo</span> },
              ].map(row => (
                <tr key={row.label}>
                  <td style={{ padding: '4px 10px 4px 0', color: 'var(--faint)', fontWeight: 500, width: '80px', verticalAlign: 'top' }}>{row.label}</td>
                  <td style={{ padding: '4px 0' }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
        ¿Confirmas que deseas eliminar este modelo?
      </p>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Models() {
  const [models,    setModels]    = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState(null)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState({})
  const [filter,    setFilter]    = useState('all')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [showPreview,    setShowPreview]    = useState(false)
  const [deleteChecking, setDeleteChecking] = useState(false)
  const [deleteModel,    setDeleteModel]    = useState(null)
  const [deleting,       setDeleting]       = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [m, b] = await Promise.all([api('GET', '/models'), api('GET', '/buildings')])
      setModels(m); setBuildings(b)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const TRANSFORM_DEFAULTS = { scale_x: 1, scale_y: 1, scale_z: 1, rotate_x: 0, rotate_y: 0, rotate_z: 0 }

  function openNew() {
    setForm({ model_type: 'exterior', lod_level: 0, format: 'GLB', building_id: buildings[0]?.id || '', ...TRANSFORM_DEFAULTS })
    setShowPreview(false)
    setModal({ type: 'new' })
  }

  function openEditTransform(m) {
    setForm({
      file_path: m.file_path,
      scale_x:  parseFloat(m.scale_x)  || 1,
      scale_y:  parseFloat(m.scale_y)  || 1,
      scale_z:  parseFloat(m.scale_z)  || 1,
      rotate_x: parseFloat(m.rotate_x) || 0,
      rotate_y: parseFloat(m.rotate_y) || 0,
      rotate_z: parseFloat(m.rotate_z) || 0,
    })
    setShowPreview(false)
    setModal({ type: 'edit-transform', id: m.id, name: m.file_path })
  }

  // Abre el diálogo de eliminar verificando primero si existe en el servidor
  async function openDelete(m) {
    setDeleteModel(null)
    setDeleteChecking(true)
    setModal({ type: 'delete', id: m.id, name: m.file_path })
    try {
      const all = await api('GET', '/models')
      setDeleteModel(all.find(x => x.id === m.id) || null)
    } catch { setDeleteModel(null) }
    finally { setDeleteChecking(false) }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['glb', 'gltf'].includes(ext)) { showToast('Solo se aceptan archivos .glb o .gltf', 'error'); return }
    setUploading(true); setUploadPct(0); setShowPreview(false)
    try {
      const formData = new FormData()
      formData.append('model', file)
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/models/upload')
        xhr.withCredentials = true
        xhr.upload.onprogress = ev => { if (ev.lengthComputable) setUploadPct(Math.round(ev.loaded / ev.total * 100)) }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
          else { try { reject(new Error(JSON.parse(xhr.responseText).error)) } catch { reject(new Error(`Error ${xhr.status}`)) } }
        }
        xhr.onerror = () => reject(new Error('Error de red'))
        xhr.send(formData)
      })
      setForm(f => ({ ...f, file_path: result.file_path, file_size_mb: result.file_size_mb, format: result.format }))
      showToast(`✅ "${file.name}" subido correctamente.`)
      setTimeout(() => setShowPreview(true), 300)
    } catch (err) { showToast(err.message, 'error') }
    finally { setUploading(false); setUploadPct(0); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  async function confirmNew() {
    if (!form.building_id)       return showToast('Selecciona un edificio.', 'error')
    if (!form.file_path?.trim()) return showToast('Selecciona un archivo .glb primero.', 'error')
    setSaving(true)
    try {
      await api('POST', '/models', form)
      setModal(null); showToast('Modelo registrado correctamente.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function confirmEditTransform() {
    setSaving(true)
    try {
      await api('PUT', `/models/${modal.id}`, {
        scale_x: form.scale_x, scale_y: form.scale_y, scale_z: form.scale_z,
        rotate_x: form.rotate_x, rotate_y: form.rotate_y, rotate_z: form.rotate_z,
      })
      setModal(null); showToast('Escala y rotación actualizadas. Recarga el visor para ver los cambios.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function toggleActive(m) {
    try {
      await api('PUT', `/models/${m.id}`, { is_active: !m.is_active })
      showToast(`Modelo ${!m.is_active ? 'activado' : 'desactivado'}.`); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await api('DELETE', `/models/${modal.id}`)
      setModal(null); setDeleteModel(null); showToast('Modelo eliminado correctamente.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
    finally { setDeleting(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const filtered = filter === 'all' ? models : models.filter(m => m.building_id === filter)

  if (loading) return <div className="loader">Cargando…</div>

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Modelos 3D</div>
          <div className="page-sub">{models.length} modelos · Posición controlada por el edificio · Escala editable aquí</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Registrar modelo</button>
      </div>

      <div className="tab-row">
        <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
        {buildings.map(b => (
          <button key={b.id} className={`tab-btn ${filter === b.id ? 'active' : ''}`}
            onClick={() => setFilter(b.id)}>{b.code}</button>
        ))}
      </div>

      <div className="card card-flush">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Edificio</th><th>Tipo</th><th>Resolución</th>
                <th>Archivo</th><th>Tamaño</th>
                <th>Escala</th><th>Rotación Y</th><th>Posición (del edificio)</th>
                <th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={10}><div className="empty-state">Sin modelos registrados</div></td></tr>
                : filtered.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>{m.building_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--faint)' }}>{m.building_code}</div>
                    </td>
                    <td><span className="badge b-blue" style={{ textTransform: 'capitalize' }}>{m.model_type}</span></td>
                    <td><span className={`badge ${LOD_BADGE[m.lod_level]}`}>{LOD_LABELS[m.lod_level]}</span></td>
                    <td style={{ maxWidth: 200 }}>
                      <code className="mono" style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.file_path}</code>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{m.file_size_mb ? `${m.file_size_mb} MB` : '—'}</td>
                    <td>
                      {scaleLabel(m)
                        ? <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '12px' }}>⤢ {scaleLabel(m)}</span>
                        : <span style={{ color: 'var(--faint)', fontSize: '12px' }}>1×</span>}
                    </td>
                    <td>
                      {parseFloat(m.rotate_y) !== 0 && (
                        <span style={{ color: '#6d28d9', fontWeight: 700, fontSize: '12px' }}>⟳ {parseFloat(m.rotate_y)||0}°</span>
                      )}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {positionLabel(m)
                        ? <code style={{ fontSize: '10px' }}>{positionLabel(m)}</code>
                        : <span style={{ color: 'var(--faint)' }}>(0, 0, 0)</span>}
                    </td>
                    <td>
                      {m.is_active
                        ? <span style={{ color: 'var(--success)', fontSize: '12px' }}>● Activo</span>
                        : <span style={{ color: 'var(--danger)',  fontSize: '12px' }}>● Inactivo</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-sm btn-icon" title="Escala y rotación" onClick={() => openEditTransform(m)}>⚙</button>
                        <button className="btn btn-sm btn-icon" title={m.is_active ? 'Desactivar' : 'Activar'} onClick={() => toggleActive(m)}>{m.is_active ? '⊘' : '✓'}</button>
                        <button className="btn btn-sm btn-danger btn-icon" title="Eliminar" onClick={() => openDelete(m)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Nuevo modelo ── */}
      {modal?.type === 'new' && (
        <Modal title="Registrar modelo 3D" onConfirm={confirmNew}
          confirmLabel={saving ? 'Registrando…' : 'Registrar'}
          disabled={!form.file_path || uploading || saving}
          onClose={() => { setModal(null); setForm({}); setShowPreview(false) }}>

          <div className="form-group">
            <label className="form-label">Edificio *</label>
            <select className="form-select" value={form.building_id} onChange={e => set('building_id', e.target.value)}>
              <option value="">— Selecciona un edificio —</option>
              {buildings.filter(b => b.is_active).map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
              {buildings.filter(b => !b.is_active).length > 0 && (
                <optgroup label="── Inactivos ──">
                  {buildings.filter(b => !b.is_active).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

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
            <label className="form-label">Archivo del modelo *</label>
            <input ref={fileInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={handleFileChange} />
            {!form.file_path && !uploading && (
              <button type="button" className="btn btn-primary"
                style={{ width: '100%', padding: '0.65rem', fontSize: '13px' }}
                onClick={() => fileInputRef.current?.click()}>
                📂 Seleccionar archivo .glb / .gltf
              </button>
            )}
            {uploading && (
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Subiendo… {uploadPct}%</div>
                <div style={{ background: 'var(--bg)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadPct}%`, background: 'var(--primary, #BC0613)', borderRadius: '4px', transition: 'width 200ms' }} />
                </div>
              </div>
            )}
            {form.file_path && !uploading && (
              <>
                <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', background: '#f0fdf4', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>✅ Archivo subido</div>
                    <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.file_path}</div>
                    {form.file_size_mb && <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '1px' }}>{form.file_size_mb} MB · {form.format}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button type="button" className="btn btn-sm" style={{ fontSize: '11px' }}
                      onClick={() => setShowPreview(p => !p)}>
                      {showPreview ? '◐ Ocultar' : '◉ Preview'}
                    </button>
                    <button type="button" className="btn btn-sm" style={{ fontSize: '11px' }}
                      onClick={() => { set('file_path', ''); set('file_size_mb', null); setShowPreview(false); fileInputRef.current?.click() }}>
                      Cambiar
                    </button>
                  </div>
                </div>
                {showPreview && (
                  <div style={{ marginBottom: '8px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <GlbPreview filePath={form.file_path} height={200} />
                  </div>
                )}
              </>
            )}
            <small style={{ color: 'var(--faint)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
              Máx. 200 MB · Formatos: .glb, .gltf
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Escala inicial</label>
            <ScaleEditor form={form} set={set} />
          </div>
          <div className="form-group">
            <label className="form-label">Rotación inicial</label>
            <RotationEditor form={form} set={set} />
          </div>
          <div className="form-group">
            <label className="form-label">Versión (opcional)</label>
            <input className="form-input" placeholder="v1.0" value={form.version || ''} onChange={e => set('version', e.target.value)} />
          </div>
        </Modal>
      )}

      {/* ── Modal: Editar escala/rotación ── */}
      {modal?.type === 'edit-transform' && (
        <Modal title="Escala y rotación del modelo"
          onConfirm={confirmEditTransform}
          confirmLabel={saving ? 'Guardando…' : 'Guardar cambios'}
          disabled={saving}
          onClose={() => { setModal(null); setShowPreview(false) }}>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
            <code className="tag" style={{ fontSize: '10px' }}>{modal.name}</code>
          </p>
          <div style={{ marginBottom: '10px' }}>
            <button type="button" className="btn btn-sm" style={{ width: '100%', fontSize: '12px' }}
              onClick={() => setShowPreview(p => !p)}>
              {showPreview ? '◐ Ocultar preview 3D' : '◉ Mostrar preview 3D del modelo'}
            </button>
          </div>
          {showPreview && form.file_path && (
            <div style={{ marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <GlbPreview filePath={form.file_path} height={180} />
            </div>
          )}
          <ScaleEditor form={form} set={set} />
          <RotationEditor form={form} set={set} />
        </Modal>
      )}

      {/* ── Modal: Eliminar (con verificación y preview) ── */}
      {modal?.type === 'delete' && (
        <DeleteModelDialog
          modal={{ ...modal, model: deleteModel }}
          checking={deleteChecking}
          deleting={deleting}
          onConfirm={confirmDelete}
          onClose={() => { setModal(null); setDeleteModel(null) }}
        />
      )}

      {toast && <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>}
    </>
  )
}
