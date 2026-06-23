import { useState, useEffect, useRef } from 'react'
import { api, fmt, API } from '../api'
import GlbPreview from '../components/GlbPreview'

const LOD_LABELS = { 0: 'Alta (LOD 0)', 1: 'Media (LOD 1)', 2: 'Baja (LOD 2)' }
const TRANSFORM_DEFAULTS = { scale_x: 1, scale_y: 1, scale_z: 1, rotate_x: 0, rotate_y: 0, rotate_z: 0 }

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

/* ── Modal ──────────────────────────────────────────────────── */
function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose, disabled = false }) {
  return (
    <div className="md-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="md-modal">
        <div className="md-modal-header">
          <h3 className="md-modal-title">{title}</h3>
          <button className="md-modal-close" onClick={onClose} aria-label="Cerrar"><IconX /></button>
        </div>
        <div className="md-modal-body">{children}</div>
        <div className="md-modal-footer">
          <button className="md-btn md-btn--ghost" onClick={onClose}>Cancelar</button>
          <button
            className={`md-btn ${danger ? 'md-btn--danger' : 'md-btn--primary'}`}
            onClick={onConfirm} disabled={disabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── ScaleEditor ────────────────────────────────────────────── */
function ScaleEditor({ form, set }) {
  const [uniform, setUniform] = useState(true)

  function setScale(axis, val) {
    const n = parseFloat(val) || 0.001
    if (uniform) { set('scale_x', n); set('scale_y', n); set('scale_z', n) }
    else set(`scale_${axis}`, n)
  }

  const sx = form.scale_x ?? 1, sy = form.scale_y ?? 1, sz = form.scale_z ?? 1

  return (
    <div className="md-transform-box">
      <div className="md-transform-header">
        <span className="md-transform-title">Escala del modelo</span>
        <button type="button" className="md-btn md-btn--xs md-btn--ghost"
          onClick={() => { set('scale_x', 1); set('scale_y', 1); set('scale_z', 1) }}>
          Resetear 1×
        </button>
      </div>
      <div className="md-transform-body">
        <div className="md-transform-row-hdr">
          <span className="md-field-label">Escala (X / Y / Z)</span>
          <label className="md-uniform-toggle">
            <input type="checkbox" checked={uniform} onChange={e => setUniform(e.target.checked)} />
            Uniforme
          </label>
        </div>
        <div className="md-grid-3">
          {['x', 'y', 'z'].map(ax => (
            <div key={ax} className="md-axis-field">
              <span className="md-axis-label">{ax.toUpperCase()}</span>
              <input className="md-input md-input--center" type="number" step="0.01" min="0.001"
                value={form[`scale_${ax}`] ?? 1}
                onChange={e => setScale(ax, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="md-preset-row">
          {[0.1, 0.25, 0.5, 1, 2, 5].map(v => (
            <button key={v} type="button"
              className={`md-preset-btn ${sx === v && sy === v && sz === v ? 'md-preset-btn--active' : ''}`}
              onClick={() => { set('scale_x', v); set('scale_y', v); set('scale_z', v) }}>
              {v}×
            </button>
          ))}
        </div>
        <div className="md-info-note">
          La posición (X, Y, Z) la controla el <strong>edificio padre</strong>. Edítala en la sección Edificios.
        </div>
      </div>
    </div>
  )
}

/* ── RotationEditor ─────────────────────────────────────────── */
function RotationEditor({ form, set }) {
  const Y_PRESETS = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <div className="md-transform-box" style={{ marginTop: '10px' }}>
      <div className="md-transform-header">
        <span className="md-transform-title">Rotación del modelo (grados)</span>
        <button type="button" className="md-btn md-btn--xs md-btn--ghost"
          onClick={() => { set('rotate_x', 0); set('rotate_y', 0); set('rotate_z', 0) }}>
          Resetear 0°
        </button>
      </div>
      <div className="md-transform-body">
        <div className="md-transform-row-hdr">
          <span className="md-field-label">Y — Orientación (guiñada)</span>
          <div className="md-axis-inline">
            <input type="number" step="1" min="-360" max="360"
              className="md-input md-input--sm md-input--center"
              value={form.rotate_y ?? 0}
              onChange={e => set('rotate_y', parseFloat(e.target.value) || 0)} />
            <span className="md-unit">°</span>
          </div>
        </div>
        <input type="range" min="-180" max="180" step="1"
          className="md-range"
          value={form.rotate_y ?? 0}
          onChange={e => set('rotate_y', parseFloat(e.target.value))} />
        <div className="md-preset-row">
          {Y_PRESETS.map(v => (
            <button key={v} type="button"
              className={`md-preset-btn ${(form.rotate_y ?? 0) === v ? 'md-preset-btn--active' : ''}`}
              onClick={() => set('rotate_y', v)}>
              {v}°
            </button>
          ))}
        </div>
        <details className="md-details">
          <summary className="md-details-summary">Avanzado: X (cabeceo) y Z (alabeo)</summary>
          <div className="md-grid-2" style={{ marginTop: '10px' }}>
            {[{ ax: 'x', label: 'X — Cabeceo' }, { ax: 'z', label: 'Z — Alabeo' }].map(({ ax, label }) => (
              <div key={ax}>
                <span className="md-field-label" style={{ display: 'block', marginBottom: '5px' }}>{label}</span>
                <div className="md-axis-inline">
                  <input type="number" step="1" min="-180" max="180"
                    className="md-input md-input--sm md-input--center"
                    value={form[`rotate_${ax}`] ?? 0}
                    onChange={e => set(`rotate_${ax}`, parseFloat(e.target.value) || 0)} />
                  <span className="md-unit">°</span>
                </div>
                <div className="md-preset-row" style={{ marginTop: '5px' }}>
                  {[-90, -45, 0, 45, 90].map(v => (
                    <button key={v} type="button"
                      className={`md-preset-btn ${(form[`rotate_${ax}`] ?? 0) === v ? 'md-preset-btn--active' : ''}`}
                      onClick={() => set(`rotate_${ax}`, v)}>
                      {v}°
                    </button>
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

/* ── DeleteModelDialog ──────────────────────────────────────── */
function DeleteModelDialog({ modal, onConfirm, onClose, checking, deleting }) {
  const m = modal.model

  if (checking) return (
    <Modal title="Verificando modelo…" onConfirm={() => {}} confirmLabel="Verificando…" disabled onClose={onClose}>
      <div className="md-checking">
        <div className="md-spinner" />
        <span>Verificando que el modelo existe en el servidor…</span>
      </div>
    </Modal>
  )

  if (!m) return (
    <Modal title="Modelo no encontrado" onConfirm={onClose} confirmLabel="Cerrar" onClose={onClose}>
      <div className="md-not-found">
        <IconAlert />
        <p>El modelo <code className="md-code">{modal.name}</code> ya no existe o fue eliminado por otro administrador.</p>
      </div>
    </Modal>
  )

  return (
    <Modal title="Eliminar modelo 3D"
      onConfirm={onConfirm}
      confirmLabel={deleting ? 'Eliminando…' : 'Sí, eliminar'}
      danger disabled={deleting}
      onClose={onClose}>

      <div className="md-alert md-alert--warn" style={{ marginBottom: '14px' }}>
        <div className="md-alert-title">Esta acción es irreversible</div>
        <div className="md-alert-body">El archivo GLB será eliminado permanentemente del servidor.</div>
      </div>

      <div className="md-preview-wrap" style={{ marginBottom: '14px' }}>
        <GlbPreview filePath={m.file_path} height={180} />
        <div className="md-preview-meta">
          {[
            { label: 'Archivo',    value: <code className="md-code" style={{ wordBreak: 'break-all' }}>{m.file_path}</code> },
            { label: 'Edificio',   value: m.building_name ? `${m.building_name} (${m.building_code || ''})` : '—' },
            { label: 'Resolución', value: <span className={`md-lod-badge md-lod-badge--${m.lod_level}`}>{LOD_LABELS[m.lod_level] ?? `LOD ${m.lod_level}`}</span> },
            { label: 'Tamaño',     value: m.file_size_mb ? `${m.file_size_mb} MB` : '—' },
            { label: 'Estado',     value: <span className={`md-status ${m.is_active ? 'md-status--active' : 'md-status--inactive'}`}><span className="md-status-dot" />{m.is_active ? 'Activo' : 'Inactivo'}</span> },
          ].map(row => (
            <div key={row.label} className="md-meta-row">
              <span className="md-meta-label">{row.label}</span>
              <span className="md-meta-value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="md-delete-confirm-text">¿Confirmas que deseas eliminar este modelo?</p>
    </Modal>
  )
}

/* ── Página principal ───────────────────────────────────────── */
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
  const [fileError, setFileError] = useState(null)
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

  function openNew() {
    setForm({ lod_level: 0, format: 'GLB', building_id: buildings[0]?.id || '', ...TRANSFORM_DEFAULTS })
    setShowPreview(false); setFileError(null); setModal({ type: 'new' })
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
    setShowPreview(false); setModal({ type: 'edit-transform', id: m.id, name: m.file_path })
  }

  async function openDelete(m) {
    setDeleteModel(null); setDeleteChecking(true)
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

    // Limpiar error previo sin tocar el resto del form
    setFileError(null)

    // Validación de formato en el cliente — mensaje descriptivo
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['glb', 'gltf'].includes(ext)) {
      setFileError(
        `Formato no permitido: .${ext}. ` +
        `El visor 3D solo acepta archivos .glb o .gltf. ` +
        `Los archivos .${ext} no son compatibles.`
      )
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Validación de tamaño en el cliente (50 MB)
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > 50) {
      setFileError(
        `El archivo pesa ${sizeMB.toFixed(1)} MB, supera el límite de 50 MB. ` +
        `Optimiza el modelo antes de subirlo (reduce polígonos o texturas).`
      )
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true); setUploadPct(0); setShowPreview(false)
    try {
      const formData = new FormData()
      formData.append('model', file)
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API}/models/upload`)
        xhr.withCredentials = true
        xhr.upload.onprogress = ev => { if (ev.lengthComputable) setUploadPct(Math.round(ev.loaded / ev.total * 100)) }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
          else {
            let msg = `Error del servidor (${xhr.status})`
            try {
              const body = JSON.parse(xhr.responseText)
              msg = body.error || msg
            } catch { /* mantener msg genérico */ }
            reject(new Error(msg))
          }
        }
        xhr.onerror = () => reject(new Error('Error de red al subir el archivo. Verifica tu conexión.'))
        xhr.send(formData)
      })
      // Actualizar solo los campos del archivo, sin tocar edificio, LOD ni transforms
      setForm(f => ({ ...f, file_path: result.file_path, file_size_mb: result.file_size_mb, format: result.format }))
      showToast(`"${file.name}" subido correctamente.`)
      setTimeout(() => setShowPreview(true), 300)
    } catch (err) {
      // Error inline persistente — el formulario NO se limpia
      setFileError(err.message)
    }
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
      setModal(null); showToast('Escala y rotación actualizadas.'); loadAll()
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

  if (loading) return (
    <div className="md-loading">
      <div className="md-spinner" />
      <span>Cargando modelos…</span>
    </div>
  )

  return (
    <div className="md-root">

      {/* Header */}
      <div className="md-page-hdr">
        <div>
          <h2 className="md-page-title">Modelos 3D</h2>
          <p className="md-page-sub">
            {models.length} modelos · Posición controlada por el edificio · Escala editable aquí
          </p>
        </div>
        <button className="md-btn md-btn--primary" onClick={openNew}>
          <IconPlus /> Registrar modelo
        </button>
      </div>

      {/* Filtro */}
      <div className="md-tabs">
        <button className={`md-tab ${filter === 'all' ? 'md-tab--active' : ''}`} onClick={() => setFilter('all')}>
          Todos
          <span className="md-tab-count">{models.length}</span>
        </button>
        {buildings.map(b => {
          const count = models.filter(m => m.building_id === b.id).length
          return (
            <button key={b.id}
              className={`md-tab ${filter === b.id ? 'md-tab--active' : ''}`}
              onClick={() => setFilter(b.id)}>
              {b.code}
              <span className="md-tab-count">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="md-table-wrap">
        <table className="md-table">
          <thead>
            <tr>
              <th>Edificio</th>
              <th>Resolución</th>
              <th>Archivo</th>
              <th>Tamaño</th>
              <th>Escala</th>
              <th>Rot. Y</th>
              <th>Posición</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="md-empty">
                    <IconEmpty />
                    <span>Sin modelos registrados</span>
                  </div>
                </td>
              </tr>
            ) : filtered.map(m => {
              const sl = scaleLabel(m)
              const pl = positionLabel(m)
              const ry = parseFloat(m.rotate_y) || 0
              return (
                <tr key={m.id} className="md-row">
                  <td>
                    <span className="md-cell-name">{m.building_name}</span>
                    <span className="md-cell-sub">{m.building_code}</span>
                  </td>
                  <td>
                    <span className={`md-lod-badge md-lod-badge--${m.lod_level}`}>
                      {LOD_LABELS[m.lod_level]}
                    </span>
                  </td>
                  <td className="md-cell-file">
                    <code className="md-code md-code--truncate" title={m.file_path}>{m.file_path}</code>
                  </td>
                  <td className="md-cell-mono">{m.file_size_mb ? `${m.file_size_mb} MB` : <span className="md-dash">—</span>}</td>
                  <td className="md-cell-mono">
                    {sl
                      ? <span className="md-transform-value">{sl}</span>
                      : <span className="md-dash">1×</span>}
                  </td>
                  <td className="md-cell-mono">
                    {ry !== 0
                      ? <span className="md-transform-value">{ry}°</span>
                      : <span className="md-dash">0°</span>}
                  </td>
                  <td>
                    {pl
                      ? <code className="md-code">{pl}</code>
                      : <span className="md-dash">(0, 0, 0)</span>}
                  </td>
                  <td>
                    <span className={`md-status ${m.is_active ? 'md-status--active' : 'md-status--inactive'}`}>
                      <span className="md-status-dot" />
                      {m.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="md-actions">
                      <button className="md-action-btn" title="Escala y rotación" onClick={() => openEditTransform(m)}>
                        <IconSettings />
                      </button>
                      <button
                        className={`md-action-btn ${m.is_active ? 'md-action-btn--warn' : 'md-action-btn--ok'}`}
                        title={m.is_active ? 'Desactivar' : 'Activar'}
                        onClick={() => toggleActive(m)}>
                        {m.is_active ? <IconPause /> : <IconPlay />}
                      </button>
                      <button className="md-action-btn md-action-btn--danger" title="Eliminar" onClick={() => openDelete(m)}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Nuevo modelo */}
      {modal?.type === 'new' && (
        <Modal title="Registrar modelo 3D"
          onConfirm={confirmNew}
          confirmLabel={saving ? 'Registrando…' : 'Registrar'}
          disabled={!form.file_path || uploading || saving}
          onClose={() => { setModal(null); setForm({}); setShowPreview(false) }}>

          <div className="md-form">
            <div className="md-field">
              <label className="md-label">Edificio <span className="md-required">*</span></label>
              <select className="md-input" value={form.building_id} onChange={e => set('building_id', e.target.value)}>
                <option value="">— Selecciona un edificio —</option>
                {buildings.filter(b => b.is_active).map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
                {buildings.filter(b => !b.is_active).length > 0 && (
                  <optgroup label="Inactivos">
                    {buildings.filter(b => !b.is_active).map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="md-field">
              <label className="md-label">Nivel LOD <span className="md-required">*</span></label>
              <select className="md-input" value={form.lod_level} onChange={e => set('lod_level', parseInt(e.target.value))}>
                <option value={0}>0 — Alta resolución</option>
                <option value={1}>1 — Media resolución</option>
                <option value={2}>2 — Baja resolución</option>
              </select>
            </div>

            <div className="md-field">
              <label className="md-label">Archivo del modelo <span className="md-required">*</span></label>
              <input ref={fileInputRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={handleFileChange} />

              {!form.file_path && !uploading && (
                <button type="button" className="md-btn md-btn--primary md-btn--full"
                  onClick={() => fileInputRef.current?.click()}>
                  <IconUpload /> Seleccionar archivo .glb / .gltf
                </button>
              )}

              {uploading && (
                <div className="md-upload-progress">
                  <span className="md-upload-label">Subiendo… {uploadPct}%</span>
                  <div className="md-progress-track">
                    <div className="md-progress-bar" style={{ width: `${uploadPct}%` }} />
                  </div>
                </div>
              )}

              {form.file_path && !uploading && (
                <>
                  <div className="md-file-ok">
                    <div className="md-file-ok-info">
                      <span className="md-file-ok-title"><IconCheck /> Archivo subido</span>
                      <span className="md-file-ok-path">{form.file_path}</span>
                      {form.file_size_mb && <span className="md-file-ok-meta">{form.file_size_mb} MB · {form.format}</span>}
                    </div>
                    <div className="md-file-ok-actions">
                      <button type="button" className="md-btn md-btn--ghost md-btn--sm"
                        onClick={() => setShowPreview(p => !p)}>
                        {showPreview ? 'Ocultar' : 'Preview'}
                      </button>
                      <button type="button" className="md-btn md-btn--ghost md-btn--sm"
                        onClick={() => { set('file_path', ''); set('file_size_mb', null); setShowPreview(false); setFileError(null); fileInputRef.current?.click() }}>
                        Cambiar
                      </button>
                    </div>
                  </div>
                  {showPreview && (
                    <div className="md-preview-wrap">
                      <GlbPreview filePath={form.file_path} height={50} />
                    </div>
                  )}
                </>
              )}

              {fileError && !uploading && (
                <div className="md-file-error">
                  <IconAlert />
                  <span>{fileError}</span>
                  <button type="button" className="md-btn md-btn--ghost md-btn--sm"
                    onClick={() => { setFileError(null); fileInputRef.current?.click() }}>
                    Reintentar
                  </button>
                </div>
              )}

              <span className="md-field-hint">Máx. 50 MB · Formatos: .glb, .gltf</span>
            </div>

            <div className="md-field">
              <label className="md-label">Escala inicial</label>
              <ScaleEditor form={form} set={set} />
            </div>
            <div className="md-field">
              <label className="md-label">Rotación inicial</label>
              <RotationEditor form={form} set={set} />
            </div>
            <div className="md-field">
              <label className="md-label">Versión (opcional)</label>
              <input className="md-input" placeholder="v1.0"
                value={form.version || ''} onChange={e => set('version', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar escala/rotación */}
      {modal?.type === 'edit-transform' && (
        <Modal title="Escala y rotación del modelo"
          onConfirm={confirmEditTransform}
          confirmLabel={saving ? 'Guardando…' : 'Guardar cambios'}
          disabled={saving}
          onClose={() => { setModal(null); setShowPreview(false) }}>

          <div className="md-form">
            <code className="md-code" style={{ marginBottom: '4px', display: 'block' }}>{modal.name}</code>

            <button type="button" className="md-btn md-btn--ghost md-btn--full"
              style={{ marginBottom: '4px' }}
              onClick={() => setShowPreview(p => !p)}>
              {showPreview ? 'Ocultar preview 3D' : 'Mostrar preview 3D del modelo'}
            </button>

            {showPreview && form.file_path && (
              <div className="md-preview-wrap" style={{ marginBottom: '4px' }}>
                <GlbPreview filePath={form.file_path} height={180} />
              </div>
            )}

            <ScaleEditor form={form} set={set} />
            <RotationEditor form={form} set={set} />
          </div>
        </Modal>
      )}

      {/* Modal: Eliminar */}
      {modal?.type === 'delete' && (
        <DeleteModelDialog
          modal={{ ...modal, model: deleteModel }}
          checking={deleteChecking}
          deleting={deleting}
          onConfirm={confirmDelete}
          onClose={() => { setModal(null); setDeleteModel(null) }}
        />
      )}

      {toast && (
        <div className={`md-toast ${toast.type === 'error' ? 'md-toast--error' : 'md-toast--success'}`}>
          {toast.type === 'error' ? <IconAlert /> : <IconCheck />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
function IconPlus()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IconSettings() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
function IconTrash()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function IconCheck()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> }
function IconPause()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg> }
function IconPlay()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8"/></svg> }
function IconX()        { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconAlert()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg> }
function IconUpload()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }
function IconEmpty()    { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z"/><path d="M12 2v18M4 6.5l8 5 8-5"/></svg> }