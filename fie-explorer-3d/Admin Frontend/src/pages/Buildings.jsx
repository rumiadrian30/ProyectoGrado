import { useState, useEffect, useRef } from 'react'
import { api, fmt } from '../api'
import GlbPreview from '../components/GlbPreview'

const TYPE_LABELS = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' }
const TYPE_BADGE  = { main: 'b-blue', secondary: 'b-gray', lab: 'b-teal' }
const LOD_LABELS  = { 0: 'LOD 0 — Alta', 1: 'LOD 1 — Media', 2: 'LOD 2 — Baja' }
const LOD_BADGE   = { 0: 'b-green', 1: 'b-amber', 2: 'b-gray' }
const EMPTY_FORM  = {
  name: '', code: '', description: '', type: 'main', floor_count: 1,
  offset_x: 0, offset_y: 0, offset_z: 0,
}
const TRANSFORM_DEFAULTS = { scale_x: 1, scale_y: 1, scale_z: 1, rotate_x: 0, rotate_y: 0, rotate_z: 0 }

// ── Modal base ─────────────────────────────────────────────────────────────────
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

// ── ScaleEditor (idéntico al de Models) ───────────────────────────────────────
function ScaleEditor({ form, set }) {
  const [uniform, setUniform] = useState(true)
  function setScale(axis, val) {
    const n = parseFloat(val) || 0.001
    if (uniform) { set('scale_x', n); set('scale_y', n); set('scale_z', n) }
    else { set(`scale_${axis}`, n) }
  }
  const sx = form.scale_x ?? 1, sy = form.scale_y ?? 1, sz = form.scale_z ?? 1
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
                value={form[`scale_${ax}`] ?? 1} onChange={e => setScale(ax, e.target.value)} />
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

// ── RotationEditor (idéntico al de Models) ────────────────────────────────────
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
            {[{ ax: 'x', label: 'X — Cabeceo' }, { ax: 'z', label: 'Z — Alabeo' }].map(({ ax, label }) => (
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

// ── Formulario de edificio ────────────────────────────────────────────────────
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
      <div className="form-group">
        <label className="form-label">Posición en el mapa</label>
        <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.5 }}>
          Desplazamiento en metros desde el centro del campus. X = Este, Y = Altura, Z = Norte.
          Los modelos del edificio heredan esta posición automáticamente.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { field: 'offset_x', label: 'X — Este',   hint: '+Este / -Oeste' },
            { field: 'offset_y', label: 'Y — Altura', hint: '+Sube / -Baja'  },
            { field: 'offset_z', label: 'Z — Norte',  hint: '+Norte / -Sur'  },
          ].map(({ field, label, hint }) => (
            <div className="form-group" key={field}>
              <label className="form-label" style={{ fontSize: '11px' }}>{label}</label>
              <input className="form-input" type="number" step="0.5" placeholder="0"
                value={data[field] ?? 0}
                onChange={e => set(field, parseFloat(e.target.value) || 0)}
                style={{ textAlign: 'center', padding: '5px 6px', fontSize: '13px' }} />
              <small style={{ fontSize: '10px', color: 'var(--faint)', display: 'block', textAlign: 'center' }}>{hint}</small>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => { set('offset_x', 0); set('offset_y', 0); set('offset_z', 0) }}
          style={{ marginTop: '6px', fontSize: '11px', padding: '3px 10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
          Resetear a (0, 0, 0)
        </button>
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

// ── BuildingModels — formulario idéntico al de Models ─────────────────────────
function BuildingModels({ building, onToast }) {
  const [models,    setModels]    = useState(null)
  const [open,      setOpen]      = useState(false)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState({})
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [showPreview,    setShowPreview]    = useState(false)
  const [deleteChecking, setDeleteChecking] = useState(false)
  const [deleteModel,    setDeleteModel]    = useState(null)
  const [deleting,       setDeleting]       = useState(false)
  const fileInputRef = useRef(null)

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

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['glb', 'gltf'].includes(ext)) { onToast('Solo se aceptan archivos .glb o .gltf', 'error'); return }
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
          else { try { reject(new Error(JSON.parse(xhr.responseText).error || 'Error al subir')) } catch { reject(new Error(`Error ${xhr.status}`)) } }
        }
        xhr.onerror = () => reject(new Error('Error de red al subir el archivo'))
        xhr.send(formData)
      })
      setForm(f => ({ ...f, file_path: result.file_path, file_size_mb: result.file_size_mb, format: result.format }))
      onToast(`✅ "${file.name}" subido correctamente.`)
      setTimeout(() => setShowPreview(true), 300)
    } catch (err) { onToast(err.message, 'error') }
    finally { setUploading(false); setUploadPct(0); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  async function confirmNew() {
    if (!form.file_path?.trim()) return onToast('Selecciona un archivo .glb primero.', 'error')
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

  // Verificación previa antes de eliminar
  async function openDeleteModel(m) {
    setDeleteModel(null)
    setDeleteChecking(true)
    setModal({ type: 'del-model', id: m.id, name: m.file_path })
    try {
      const all = await api('GET', '/models')
      setDeleteModel(all.find(x => x.id === m.id) || null)
    } catch { setDeleteModel(null) }
    finally { setDeleteChecking(false) }
  }

  async function confirmDeleteModel() {
    setDeleting(true)
    try {
      await api('DELETE', `/models/${modal.id}`)
      setModal(null); setDeleteModel(null); onToast('Modelo eliminado.'); load()
    } catch (e) { onToast(e.message, 'error') }
    finally { setDeleting(false) }
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
            <span style={{ marginLeft: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0 6px', fontSize: '11px' }}>{models.length}</span>
          )}
        </span>
        <span style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ paddingBottom: '8px' }}>
          {models === null && <div style={{ fontSize: '12px', color: 'var(--faint)', padding: '4px 0' }}>Cargando…</div>}
          {models !== null && models.length === 0 && <div style={{ fontSize: '12px', color: 'var(--faint)', padding: '4px 0' }}>Sin modelos registrados.</div>}
          {models !== null && models.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 8px', borderRadius: '6px', marginBottom: '3px',
              background: m.is_active ? 'var(--bg)' : 'rgba(0,0,0,.03)', opacity: m.is_active ? 1 : 0.6,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 500, display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <span className="badge b-blue" style={{ fontSize: '10px' }}>{m.model_type}</span>
                  <span className={`badge ${LOD_BADGE[m.lod_level] || 'b-gray'}`} style={{ fontSize: '10px' }}>{LOD_LABELS[m.lod_level]}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--faint)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={m.file_path}>{m.file_path}</div>
              </div>
              <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                <button className="btn btn-sm btn-icon" title={m.is_active ? 'Desactivar' : 'Activar'}
                  onClick={() => toggleModel(m)}
                  style={{ color: m.is_active ? 'var(--danger)' : 'var(--success)' }}>
                  {m.is_active ? '⏸' : '▶'}
                </button>
                <button className="btn btn-sm btn-danger btn-icon" onClick={() => openDeleteModel(m)}>✕</button>
              </div>
            </div>
          ))}
          <button className="btn btn-sm" style={{ marginTop: '6px', width: '100%', fontSize: '12px' }}
            onClick={() => {
              setForm({ building_id: building.id, model_type: 'exterior', lod_level: 0, format: 'GLB', ...TRANSFORM_DEFAULTS })
              setShowPreview(false)
              setModal({ type: 'new' })
            }}>
            + Añadir modelo
          </button>
        </div>
      )}

      {/* ── Modal nuevo modelo (diseño idéntico al de Models.jsx) ── */}
      {modal?.type === 'new' && (
        <Modal title={`Registrar modelo — ${building.name}`}
          onConfirm={confirmNew}
          confirmLabel={saving ? 'Registrando…' : 'Registrar modelo'}
          disabled={!form.file_path || uploading || saving}
          onClose={() => { setModal(null); setShowPreview(false) }}>

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

          {/* ScaleEditor y RotationEditor — igual que en Models */}
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

      {/* ── Modal eliminar modelo con verificación y preview ── */}
      {modal?.type === 'del-model' && (() => {
        const m = deleteModel
        if (deleteChecking) {
          return (
            <Modal title="Confirmar eliminación" onConfirm={() => {}} confirmLabel="Verificando…" disabled onClose={() => { setModal(null); setDeleteModel(null) }}>
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔍</div>
                <div style={{ fontSize: '13px' }}>Verificando que el modelo existe en el servidor…</div>
              </div>
            </Modal>
          )
        }
        if (!m) {
          return (
            <Modal title="Modelo no encontrado" onConfirm={() => { setModal(null); setDeleteModel(null) }} confirmLabel="Cerrar" onClose={() => { setModal(null); setDeleteModel(null) }}>
              <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '32px' }}>⚠️</div>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  El modelo <code className="tag" style={{ fontSize: '11px' }}>{modal.name}</code> ya no existe o fue eliminado. Recarga la lista.
                </p>
              </div>
            </Modal>
          )
        }
        return (
          <Modal title="Eliminar modelo 3D"
            onConfirm={confirmDeleteModel}
            confirmLabel={deleting ? 'Eliminando…' : 'Sí, eliminar'}
            danger disabled={deleting}
            onClose={() => { setModal(null); setDeleteModel(null) }}>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#9a3412' }}>Esta acción es irreversible</div>
                <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '2px' }}>El archivo GLB será eliminado permanentemente del servidor.</div>
              </div>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
              <GlbPreview filePath={m.file_path} height={160} />
              <div style={{ padding: '10px 14px', background: 'var(--surface)' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      { label: 'Archivo',    value: <code style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--muted)', wordBreak: 'break-all' }}>{m.file_path}</code> },
                      { label: 'Tipo',       value: <span className="badge b-blue" style={{ fontSize: '10px', textTransform: 'capitalize' }}>{m.model_type}</span> },
                      { label: 'Resolución', value: <span className={`badge ${LOD_BADGE[m.lod_level] || 'b-gray'}`} style={{ fontSize: '10px' }}>{LOD_LABELS[m.lod_level] ?? `LOD ${m.lod_level}`}</span> },
                      { label: 'Tamaño',     value: m.file_size_mb ? `${m.file_size_mb} MB` : '—' },
                    ].map(row => (
                      <tr key={row.label}>
                        <td style={{ padding: '3px 10px 3px 0', color: 'var(--faint)', fontWeight: 500, width: '80px', verticalAlign: 'top' }}>{row.label}</td>
                        <td style={{ padding: '3px 0' }}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>¿Confirmas que deseas eliminar este modelo?</p>
          </Modal>
        )
      })()}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
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

  function validateForm(f) {
    if (!f.name?.trim()) { showToast('El nombre es obligatorio.', 'error'); return false }
    if (!f.code?.trim()) { showToast('El código es obligatorio.', 'error'); return false }
    return true
  }

  function buildPayload(f) {
    return { ...f, offset_x: parseFloat(f.offset_x) || 0, offset_y: parseFloat(f.offset_y) || 0, offset_z: parseFloat(f.offset_z) || 0 }
  }

  async function confirmCreate() {
    if (!validateForm(form)) return
    setSaving(true)
    try {
      await api('POST', '/buildings', buildPayload(form))
      setModal(null); showToast(`Edificio "${form.name}" creado correctamente.`); load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function confirmEdit() {
    if (!validateForm(form)) return
    setSaving(true)
    try {
      await api('PUT', `/buildings/${modal.id}`, buildPayload(form))
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
          <div className="page-sub">
            {active} activo{active !== 1 ? 's' : ''} · {buildings.length - active} inactivo{buildings.length - active !== 1 ? 's' : ''}
          </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span title={`Posición: X=${parseFloat(b.offset_x)||0} Y=${parseFloat(b.offset_y)||0} Z=${parseFloat(b.offset_z)||0}`}
                    style={{ fontSize: '13px', cursor: 'help' }}>📍</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block', background: b.is_active ? 'var(--success)' : 'var(--danger)' }} />
                </div>
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{b.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.8em' }}>
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
                    onClick={() => {
                      setForm({ ...b, offset_x: parseFloat(b.offset_x)||0, offset_y: parseFloat(b.offset_y)||0, offset_z: parseFloat(b.offset_z)||0 })
                      setModal({ type: 'edit', id: b.id })
                    }}>✏</button>
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
