import { useState, useEffect, useRef } from 'react'
import { api, fmt } from '../api'

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

// ─── Editor de escala (solo escala — la posición la controla el edificio) ──────
function ScaleEditor({ form, set }) {
  const [uniform, setUniform] = useState(true)

  function setScale(axis, val) {
    const n = parseFloat(val) || 0.001
    if (uniform) {
      set('scale_x', n); set('scale_y', n); set('scale_z', n)
    } else {
      set(`scale_${axis}`, n)
    }
  }

  const sx = form.scale_x ?? 1
  const sy = form.scale_y ?? 1
  const sz = form.scale_z ?? 1

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginTop: '4px' }}>
      <div style={{
        background: 'var(--bg)', padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
          Escala del modelo
        </span>
        <button type="button" className="btn btn-sm"
          style={{ fontSize: '11px', padding: '2px 8px' }}
          onClick={() => { set('scale_x', 1); set('scale_y', 1); set('scale_z', 1) }}>
          Resetear 1×
        </button>
      </div>

      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Escala (X / Y / Z)</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={uniform} onChange={e => setUniform(e.target.checked)}
              style={{ accentColor: 'var(--primary)' }} />
            Uniforme
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {['x', 'y', 'z'].map(ax => (
            <div key={ax}>
              <label style={{ fontSize: '10px', color: 'var(--faint)', display: 'block', marginBottom: '2px', textAlign: 'center' }}>
                {ax.toUpperCase()}
              </label>
              <input
                className="form-input"
                type="number" step="0.01" min="0.001"
                style={{ textAlign: 'center', padding: '4px', fontSize: '12px' }}
                value={form[`scale_${ax}`] ?? 1}
                onChange={e => setScale(ax, e.target.value)}
              />
            </div>
          ))}
        </div>
        {/* Presets rápidos */}
        <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[0.1, 0.25, 0.5, 1, 2, 5].map(v => (
            <button key={v} type="button"
              style={{
                fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
                border: '1px solid var(--border)', cursor: 'pointer',
                background: (sx === v && sy === v && sz === v) ? 'var(--primary)' : 'transparent',
                color: (sx === v && sy === v && sz === v) ? '#fff' : 'var(--muted)',
              }}
              onClick={() => { set('scale_x', v); set('scale_y', v); set('scale_z', v) }}>
              {v}×
            </button>
          ))}
        </div>

        {/* Info: posición controlada por edificio */}
        <div style={{
          marginTop: '10px', padding: '8px 10px',
          background: 'var(--bg-soft, #f8fafc)',
          border: '1px solid var(--border-soft, #e5e7eb)',
          borderRadius: '6px', fontSize: '11px', color: 'var(--muted)',
          display: 'flex', alignItems: 'flex-start', gap: '6px',
        }}>
          <span>ℹ️</span>
          <span>La posición (X, Y, Z) la controla el <strong>edificio padre</strong>. Edítala en la sección Edificios.</span>
        </div>
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

  const SCALE_DEFAULTS = { scale_x: 1, scale_y: 1, scale_z: 1 }

  function openNew() {
    setForm({
      model_type: 'exterior', lod_level: 0, format: 'GLB',
      building_id: buildings[0]?.id || '',
      ...SCALE_DEFAULTS,
    })
    setModal({ type: 'new' })
  }

  function openEditScale(m) {
    setForm({
      scale_x: parseFloat(m.scale_x) || 1,
      scale_y: parseFloat(m.scale_y) || 1,
      scale_z: parseFloat(m.scale_z) || 1,
    })
    setModal({ type: 'edit-scale', id: m.id, name: m.file_path })
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['glb', 'gltf'].includes(ext)) {
      showToast('Solo se aceptan archivos .glb o .gltf', 'error'); return
    }
    setUploading(true); setUploadPct(0)
    try {
      const formData = new FormData()
      formData.append('model', file)
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/models/upload')
        xhr.withCredentials = true
        xhr.upload.onprogress = ev => {
          if (ev.lengthComputable) setUploadPct(Math.round(ev.loaded / ev.total * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
          else { try { reject(new Error(JSON.parse(xhr.responseText).error)) } catch { reject(new Error(`Error ${xhr.status}`)) } }
        }
        xhr.onerror = () => reject(new Error('Error de red'))
        xhr.send(formData)
      })
      setForm(f => ({ ...f, file_path: result.file_path, file_size_mb: result.file_size_mb, format: result.format }))
      showToast(`✅ "${file.name}" subido correctamente.`)
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

  async function confirmEditScale() {
    setSaving(true)
    try {
      // Solo enviar escala — la posición la controla el edificio
      await api('PUT', `/models/${modal.id}`, {
        scale_x: form.scale_x,
        scale_y: form.scale_y,
        scale_z: form.scale_z,
      })
      setModal(null); showToast('Escala actualizada. Recarga el visor para ver los cambios.'); loadAll()
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
    try {
      await api('DELETE', `/models/${modal.id}`)
      setModal(null); showToast('Modelo eliminado.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
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
                <th>Escala</th><th>Posición (del edificio)</th>
                <th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9}><div className="empty-state">Sin modelos registrados</div></td></tr>
                : filtered.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>{m.building_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--faint)' }}>{m.building_code}</div>
                    </td>
                    <td><span className="badge b-blue" style={{ textTransform: 'capitalize' }}>{m.model_type}</span></td>
                    <td><span className={`badge ${LOD_BADGE[m.lod_level]}`}>{LOD_LABELS[m.lod_level]}</span></td>
                    <td style={{ maxWidth: 200 }}>
                      <code className="mono" style={{
                        fontSize: '11px', color: 'var(--muted)',
                        display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{m.file_path}</code>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {m.file_size_mb ? `${m.file_size_mb} MB` : '—'}
                    </td>
                    <td>
                      {scaleLabel(m)
                        ? <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '12px' }}>⤢ {scaleLabel(m)}</span>
                        : <span style={{ color: 'var(--faint)', fontSize: '12px' }}>1×</span>}
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
                        <button className="btn btn-sm btn-icon" title="Editar escala"
                          onClick={() => openEditScale(m)}>⚙</button>
                        <button className="btn btn-sm btn-icon" title={m.is_active ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleActive(m)}>{m.is_active ? '⊘' : '✓'}</button>
                        <button className="btn btn-sm btn-danger btn-icon" title="Eliminar"
                          onClick={() => setModal({ type: 'delete', id: m.id, name: m.file_path })}>✕</button>
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
          onClose={() => { setModal(null); setForm({}) }}>

          <div className="form-group">
            <label className="form-label">Edificio *</label>
            <select className="form-select" value={form.building_id}
              onChange={e => set('building_id', e.target.value)}>
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
              <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', background: '#f0fdf4', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>✅ Archivo subido</div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.file_path}</div>
                  {form.file_size_mb && <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '1px' }}>{form.file_size_mb} MB · {form.format}</div>}
                </div>
                <button type="button" className="btn btn-sm" style={{ flexShrink: 0, fontSize: '11px' }}
                  onClick={() => { set('file_path', ''); set('file_size_mb', null); fileInputRef.current?.click() }}>
                  Cambiar
                </button>
              </div>
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
            <label className="form-label">Versión (opcional)</label>
            <input className="form-input" placeholder="v1.0" value={form.version || ''} onChange={e => set('version', e.target.value)} />
          </div>
        </Modal>
      )}

      {/* ── Modal: Editar escala ── */}
      {modal?.type === 'edit-scale' && (
        <Modal title="Escala del modelo"
          onConfirm={confirmEditScale}
          confirmLabel={saving ? 'Guardando…' : 'Guardar escala'}
          disabled={saving}
          onClose={() => setModal(null)}>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
            <code className="tag" style={{ fontSize: '10px' }}>{modal.name}</code>
          </p>
          <ScaleEditor form={form} set={set} />
        </Modal>
      )}

      {/* ── Modal: Eliminar ── */}
      {modal?.type === 'delete' && (
        <Modal title="Confirmar eliminación" onConfirm={confirmDelete}
          confirmLabel="Eliminar" danger onClose={() => setModal(null)}>
          <p style={{ fontSize: '13px', textAlign: 'center' }}>
            ¿Eliminar el modelo <code className="tag">{modal.name}</code>?
          </p>
        </Modal>
      )}

      {toast && <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>}
    </>
  )
}