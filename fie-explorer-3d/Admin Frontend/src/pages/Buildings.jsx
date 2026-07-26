import { useState, useEffect, useRef } from 'react'
import { api, fmt, API } from '../api'
import GlbPreview from '../components/GlbPreview'
import { useCachedQuery } from '../cache/useCachedQuery'
import { invalidate }     from '../cache/queryCache'

const TYPE_LABELS = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' }
const LOD_LABELS  = { 0: 'LOD 0 — Alta', 1: 'LOD 1 — Media', 2: 'LOD 2 — Baja' }
const EMPTY_FORM  = {
  name: '', code: '', description: '', type: 'main', floor_count: 1,
  offset_x: 0, offset_y: 0, offset_z: 0,
}
const TRANSFORM_DEFAULTS = { scale_x: 1, scale_y: 1, scale_z: 1, rotate_x: 0, rotate_y: 0, rotate_z: 0 }

/* ── Modal ──────────────────────────────────────────────────── */
function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose, disabled = false }) {
  return (
    <div className="bl-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bl-modal">
        <div className="bl-modal-header">
          <h3 className="bl-modal-title">{title}</h3>
          <button className="bl-modal-close" onClick={onClose} aria-label="Cerrar"><IconX /></button>
        </div>
        <div className="bl-modal-body">{children}</div>
        <div className="bl-modal-footer">
          <button className="bl-btn bl-btn--ghost" onClick={onClose}>Cancelar</button>
          <button
            className={`bl-btn ${danger ? 'bl-btn--danger' : 'bl-btn--primary'}`}
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
    <div className="bl-transform-box">
      <div className="bl-transform-header">
        <span className="bl-transform-title">Escala del modelo</span>
        <button type="button" className="bl-btn bl-btn--xs bl-btn--ghost"
          onClick={() => { set('scale_x', 1); set('scale_y', 1); set('scale_z', 1) }}>
          Resetear 1×
        </button>
      </div>
      <div className="bl-transform-body">
        <div className="bl-transform-row-header">
          <span className="bl-field-label">Escala (X / Y / Z)</span>
          <label className="bl-uniform-toggle">
            <input type="checkbox" checked={uniform} onChange={e => setUniform(e.target.checked)} />
            Uniforme
          </label>
        </div>
        <div className="bl-grid-3">
          {['x', 'y', 'z'].map(ax => (
            <div key={ax} className="bl-axis-field">
              <span className="bl-axis-label">{ax.toUpperCase()}</span>
              <input className="bl-input bl-input--center" type="number" step="0.01" min="0.001"
                value={form[`scale_${ax}`] ?? 1}
                onChange={e => setScale(ax, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="bl-preset-row">
          {[0.1, 0.25, 0.5, 1, 2, 5].map(v => (
            <button key={v} type="button"
              className={`bl-preset-btn ${(sx === v && sy === v && sz === v) ? 'bl-preset-btn--active' : ''}`}
              onClick={() => { set('scale_x', v); set('scale_y', v); set('scale_z', v) }}>
              {v}×
            </button>
          ))}
        </div>
        <div className="bl-info-note">
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
    <div className="bl-transform-box">
      <div className="bl-transform-header">
        <span className="bl-transform-title">Rotación del modelo (grados)</span>
        <button type="button" className="bl-btn bl-btn--xs bl-btn--ghost"
          onClick={() => { set('rotate_x', 0); set('rotate_y', 0); set('rotate_z', 0) }}>
          Resetear 0°
        </button>
      </div>
      <div className="bl-transform-body">
        <div className="bl-transform-row-header">
          <span className="bl-field-label">Y — Orientación (guiñada)</span>
          <div className="bl-axis-inline">
            <input type="number" step="1" min="-360" max="360"
              className="bl-input bl-input--sm bl-input--center"
              value={form.rotate_y ?? 0}
              onChange={e => set('rotate_y', parseFloat(e.target.value) || 0)} />
            <span className="bl-unit">°</span>
          </div>
        </div>
        <input type="range" min="-180" max="180" step="1"
          className="bl-range"
          value={form.rotate_y ?? 0}
          onChange={e => set('rotate_y', parseFloat(e.target.value))} />
        <div className="bl-preset-row">
          {Y_PRESETS.map(v => (
            <button key={v} type="button"
              className={`bl-preset-btn ${(form.rotate_y ?? 0) === v ? 'bl-preset-btn--active' : ''}`}
              onClick={() => set('rotate_y', v)}>
              {v}°
            </button>
          ))}
        </div>
        <details className="bl-details">
          <summary className="bl-details-summary">Avanzado: X (cabeceo) y Z (alabeo)</summary>
          <div className="bl-grid-2" style={{ marginTop: '10px' }}>
            {[{ ax: 'x', label: 'X — Cabeceo' }, { ax: 'z', label: 'Z — Alabeo' }].map(({ ax, label }) => (
              <div key={ax}>
                <span className="bl-field-label" style={{ display: 'block', marginBottom: '5px' }}>{label}</span>
                <div className="bl-axis-inline">
                  <input type="number" step="1" min="-180" max="180"
                    className="bl-input bl-input--sm bl-input--center"
                    value={form[`rotate_${ax}`] ?? 0}
                    onChange={e => set(`rotate_${ax}`, parseFloat(e.target.value) || 0)} />
                  <span className="bl-unit">°</span>
                </div>
                <div className="bl-preset-row" style={{ marginTop: '5px' }}>
                  {[-90, -45, 0, 45, 90].map(v => (
                    <button key={v} type="button"
                      className={`bl-preset-btn ${(form[`rotate_${ax}`] ?? 0) === v ? 'bl-preset-btn--active' : ''}`}
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

/* ── BuildingForm ───────────────────────────────────────────── */
function BuildingForm({ data, onChange, isEdit = false }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <div className="bl-form">
      <span className="bl-form-section">Identificación</span>

      <div className="bl-grid-2">
        <div className="bl-field">
          <label className="bl-label">Nombre <span className="bl-required">*</span></label>
          <input className="bl-input" placeholder="Bloque Académico A"
            value={data.name || ''} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="bl-field">
          <label className="bl-label">Código <span className="bl-required">*</span></label>
          <input className="bl-input bl-input--mono" placeholder="FIE-A"
            value={data.code || ''}
            onChange={e => set('code', e.target.value.toUpperCase())} />
        </div>
      </div>

      <div className="bl-grid-2">
        <div className="bl-field">
          <label className="bl-label">Tipo <span className="bl-required">*</span></label>
          <select className="bl-input" value={data.type || 'main'} onChange={e => set('type', e.target.value)}>
            <option value="main">Principal</option>
            <option value="secondary">Secundario</option>
            <option value="lab">Laboratorio</option>
          </select>
        </div>
        <div className="bl-field">
          <label className="bl-label">Número de plantas</label>
          <input className="bl-input" type="number" min="1" max="20"
            value={data.floor_count || 1}
            onChange={e => set('floor_count', parseInt(e.target.value) || 1)} />
        </div>
      </div>

      <div className="bl-field">
        <label className="bl-label">Descripción</label>
        <textarea className="bl-input bl-textarea" rows={3}
          placeholder="Descripción del edificio, función principal, etc."
          value={data.description || ''} onChange={e => set('description', e.target.value)} />
      </div>

      <span className="bl-form-section" style={{ marginTop: '8px' }}>Posición en el mapa</span>
      <p className="bl-form-hint">
        Desplazamiento en metros desde el centro del campus. X = Este, Y = Altura, Z = Norte.
        Los modelos del edificio heredan esta posición automáticamente.
      </p>

      <div className="bl-grid-3">
        {[
          { field: 'offset_x', label: 'X — Este',   hint: '+Este / -Oeste' },
          { field: 'offset_y', label: 'Y — Altura', hint: '+Sube / -Baja'  },
          { field: 'offset_z', label: 'Z — Norte',  hint: '+Norte / -Sur'  },
        ].map(({ field, label, hint }) => (
          <div className="bl-field" key={field}>
            <label className="bl-label" style={{ fontSize: '11px' }}>{label}</label>
            <input className="bl-input bl-input--center" type="number" step="0.5" placeholder="0"
              value={data[field] ?? 0}
              onChange={e => set(field, parseFloat(e.target.value) || 0)} />
            <span className="bl-field-hint bl-field-hint--center">{hint}</span>
          </div>
        ))}
      </div>

      <button type="button" className="bl-btn bl-btn--ghost bl-btn--sm"
        style={{ marginTop: '4px' }}
        onClick={() => { set('offset_x', 0); set('offset_y', 0); set('offset_z', 0) }}>
        Resetear a (0, 0, 0)
      </button>

      {/* ── Modo Interior ─────────────────────────────────── */}
      <span className="bl-form-section" style={{ marginTop: '16px' }}>Modo Interior</span>

      <div className="bl-transform-box bl-interior-box">
        <div className="bl-transform-header">
          <label className="bl-uniform-toggle bl-interior-toggle">
            <input
              type="checkbox"
              checked={!!data.has_interior}
              onChange={e => set('has_interior', e.target.checked)}
            />
            Vista interior activada
          </label>

          {data.has_interior && (
            <span className="bl-interior-state">Configurado</span>
          )}
        </div>

        <div className="bl-transform-body">
          <p className="bl-form-hint">
            Permite ocultar una parte del GLB y mover la cámara hacia una vista interna del edificio.
          </p>

          {data.has_interior && (
            <details className="bl-details bl-interior-details">
              <summary className="bl-details-summary bl-interior-summary">
                Opciones avanzadas de interior
              </summary>

              <div className="bl-interior-content">
                <div className="bl-alert bl-alert--info">
                  El GLB debe tener un grupo nombrado según el campo Nombre del grupo exterior para que el corte funcione.
                </div>

                <div className="bl-field">
                  <label className="bl-label">Nombre del grupo exterior en el GLB</label>
                  <input
                    className="bl-input"
                    placeholder="Exterior"
                    value={data.exterior_group_name ?? 'Exterior'}
                    onChange={e => set('exterior_group_name', e.target.value)}
                  />
                  <span className="bl-field-hint">
                    Nombre exacto del grupo Three.js a ocultar al entrar. Es sensible a mayúsculas.
                  </span>
                </div>

                <div className="bl-field">
                  <label className="bl-label">Cámara interior — Posición (X / Y / Z)</label>
                  <div className="bl-grid-3">
                    {[
                      { field: 'interior_cam_x', label: 'X', placeholder: '0'  },
                      { field: 'interior_cam_y', label: 'Y', placeholder: '8'  },
                      { field: 'interior_cam_z', label: 'Z', placeholder: '15' },
                    ].map(({ field, label, placeholder }) => (
                      <div key={field} className="bl-axis-field">
                        <span className="bl-axis-label">{label}</span>
                        <input
                          className="bl-input bl-input--center"
                          type="number"
                          step="0.5"
                          placeholder={placeholder}
                          value={data[field] ?? ''}
                          onChange={e => set(field, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="bl-field-hint">
                    Posición inicial de la cámara al entrar al interior.
                  </span>
                </div>

                <div className="bl-field">
                  <label className="bl-label">Cámara interior — Target (X / Y / Z)</label>
                  <div className="bl-grid-3">
                    {[
                      { field: 'interior_target_x', label: 'X', placeholder: '0' },
                      { field: 'interior_target_y', label: 'Y', placeholder: '2' },
                      { field: 'interior_target_z', label: 'Z', placeholder: '0' },
                    ].map(({ field, label, placeholder }) => (
                      <div key={field} className="bl-axis-field">
                        <span className="bl-axis-label">{label}</span>
                        <input
                          className="bl-input bl-input--center"
                          type="number"
                          step="0.5"
                          placeholder={placeholder}
                          value={data[field] ?? ''}
                          onChange={e => set(field, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                  </div>
                  <span className="bl-field-hint">
                    Punto al que mira la cámara al entrar al interior.
                  </span>
                </div>

                <button
                  type="button"
                  className="bl-btn bl-btn--ghost bl-btn--sm"
                  onClick={() => {
                    set('exterior_group_name', 'Exterior')
                    set('interior_cam_x', 0)
                    set('interior_cam_y', 8)
                    set('interior_cam_z', 15)
                    set('interior_target_x', 0)
                    set('interior_target_y', 2)
                    set('interior_target_z', 0)
                  }}
                >
                  Restaurar valores recomendados
                </button>
              </div>
            </details>
          )}
        </div>
      </div>

      {isEdit && (
        <div className="bl-field" style={{ marginTop: '16px' }}>
          <label className="bl-label">Estado</label>
          <select className="bl-input"
            value={data.is_active ? 'true' : 'false'}
            onChange={e => set('is_active', e.target.value === 'true')}>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      )}
    </div>
  )
}

/* ── BuildingModels ─────────────────────────────────────────── */
function BuildingModels({ building, onToast, onReloadBuildings }) {
  const [models,         setModels]         = useState(null)
  const [open,           setOpen]           = useState(false)
  const [modal,          setModal]          = useState(null)
  const [form,           setForm]           = useState({})
  const [saving,         setSaving]         = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [uploadPct,      setUploadPct]      = useState(0)
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
        xhr.open('POST', `${API}/models/upload`)
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
      onToast(`"${file.name}" subido correctamente.`)
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
      onToast(`Modelo ${!m.is_active ? 'activado' : 'desactivado'}.`)
      await load()
      if (onReloadBuildings) await onReloadBuildings()
    } catch (e) { onToast(e.message, 'error') }
  }

  async function openDeleteModel(m) {
    setDeleteModel(null); setDeleteChecking(true)
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
      setModal(null); setDeleteModel(null); onToast('Modelo eliminado.'); await load()
      if (onReloadBuildings) await onReloadBuildings()
    } catch (e) { onToast(e.message, 'error') }
    finally { setDeleting(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="bl-models-section">
      <button className="bl-models-toggle" onClick={toggle}>
        <span className="bl-models-toggle-left">
          <IconModel />
          Modelos 3D
          {models !== null && (
            <span className="bl-models-count">{models.length}</span>
          )}
        </span>
        <span className={`bl-models-chevron ${open ? 'bl-models-chevron--open' : ''}`}>
          <IconChevronDown />
        </span>
      </button>

      {open && (
        <div className="bl-models-body">
          {models === null && <div className="bl-models-empty">Cargando…</div>}
          {models !== null && models.length === 0 && (
            <div className="bl-models-empty">Sin modelos registrados.</div>
          )}
          {models !== null && models.map(m => (
            <div key={m.id} className={`bl-model-row ${!m.is_active ? 'bl-model-row--inactive' : ''}`}>
              <div className="bl-model-info">
                <span className={`bl-lod-badge bl-lod-badge--${m.lod_level}`}>
                  {LOD_LABELS[m.lod_level] ?? `LOD ${m.lod_level}`}
                </span>
                <span className="bl-model-path" title={m.file_path}>{m.file_path}</span>
              </div>
              <div className="bl-model-actions">
                <button
                  className={`bl-action-btn ${m.is_active ? 'bl-action-btn--warn' : 'bl-action-btn--ok'}`}
                  title={m.is_active ? 'Desactivar' : 'Activar'}
                  onClick={() => toggleModel(m)}>
                  {m.is_active ? <IconPause /> : <IconPlay />}
                </button>
                <button className="bl-action-btn bl-action-btn--danger"
                  onClick={() => openDeleteModel(m)}>
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
          <button className="bl-add-model-btn"
            onClick={() => {
              setForm({ building_id: building.id, lod_level: 0, format: 'GLB', ...TRANSFORM_DEFAULTS })
              setShowPreview(false)
              setModal({ type: 'new' })
            }}>
            <IconPlus /> Añadir modelo
          </button>
        </div>
      )}

      {/* Modal nuevo modelo */}
      {modal?.type === 'new' && (
        <Modal title={`Registrar modelo — ${building.name}`}
          onConfirm={confirmNew}
          confirmLabel={saving ? 'Registrando…' : 'Registrar modelo'}
          disabled={!form.file_path || uploading || saving}
          onClose={() => { setModal(null); setShowPreview(false) }}>

          <div className="bl-form">
            <div className="bl-field">
              <label className="bl-label">Nivel LOD <span className="bl-required">*</span></label>
              <select className="bl-input" value={form.lod_level}
                onChange={e => set('lod_level', parseInt(e.target.value))}>
                <option value={0}>0 — Alta resolución</option>
                <option value={1}>1 — Media resolución</option>
                <option value={2}>2 — Baja resolución</option>
              </select>
            </div>

            <div className="bl-field">
              <label className="bl-label">Archivo del modelo <span className="bl-required">*</span></label>
              <input ref={fileInputRef} type="file" accept=".glb,.gltf"
                style={{ display: 'none' }} onChange={handleFileChange} />

              {!form.file_path && !uploading && (
                <button type="button" className="bl-btn bl-btn--primary bl-btn--full"
                  onClick={() => fileInputRef.current?.click()}>
                  <IconUpload /> Seleccionar archivo .glb / .gltf
                </button>
              )}

              {uploading && (
                <div className="bl-upload-progress">
                  <span className="bl-upload-label">Subiendo… {uploadPct}%</span>
                  <div className="bl-progress-track">
                    <div className="bl-progress-bar" style={{ width: `${uploadPct}%` }} />
                  </div>
                </div>
              )}

              {form.file_path && !uploading && (
                <>
                  <div className="bl-file-ok">
                    <div className="bl-file-ok-info">
                      <span className="bl-file-ok-title"><IconCheck /> Archivo subido</span>
                      <span className="bl-file-ok-path">{form.file_path}</span>
                      {form.file_size_mb && (
                        <span className="bl-file-ok-meta">{form.file_size_mb} MB · {form.format}</span>
                      )}
                    </div>
                    <div className="bl-file-ok-actions">
                      <button type="button" className="bl-btn bl-btn--ghost bl-btn--sm"
                        onClick={() => setShowPreview(p => !p)}>
                        {showPreview ? 'Ocultar' : 'Preview'}
                      </button>
                      <button type="button" className="bl-btn bl-btn--ghost bl-btn--sm"
                        onClick={() => { set('file_path', ''); set('file_size_mb', null); setShowPreview(false); fileInputRef.current?.click() }}>
                        Cambiar
                      </button>
                    </div>
                  </div>
                  {showPreview && (
                    <div className="bl-preview-wrap">
                      <GlbPreview filePath={form.file_path} height={200} />
                    </div>
                  )}
                </>
              )}
              <span className="bl-field-hint">Máx. 200 MB · Formatos: .glb, .gltf</span>
            </div>

            <div className="bl-field">
              <label className="bl-label">Escala inicial</label>
              <ScaleEditor form={form} set={set} />
            </div>
            <div className="bl-field">
              <label className="bl-label">Rotación inicial</label>
              <RotationEditor form={form} set={set} />
            </div>
            <div className="bl-field">
              <label className="bl-label">Versión (opcional)</label>
              <input className="bl-input" placeholder="v1.0"
                value={form.version || ''} onChange={e => set('version', e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal eliminar modelo */}
      {modal?.type === 'del-model' && (() => {
        const m = deleteModel
        if (deleteChecking) return (
          <Modal title="Verificando modelo…" onConfirm={() => {}} confirmLabel="Verificando…"
            disabled onClose={() => { setModal(null); setDeleteModel(null) }}>
            <div className="bl-checking">
              <div className="bl-spinner" />
              <span>Verificando que el modelo existe en el servidor…</span>
            </div>
          </Modal>
        )
        if (!m) return (
          <Modal title="Modelo no encontrado"
            onConfirm={() => { setModal(null); setDeleteModel(null) }}
            confirmLabel="Cerrar"
            onClose={() => { setModal(null); setDeleteModel(null) }}>
            <div className="bl-not-found">
              <IconAlert />
              <p>El modelo <code className="bl-code">{modal.name}</code> ya no existe o fue eliminado.</p>
            </div>
          </Modal>
        )
        return (
          <Modal title="Eliminar modelo 3D"
            onConfirm={confirmDeleteModel}
            confirmLabel={deleting ? 'Eliminando…' : 'Sí, eliminar'}
            danger disabled={deleting}
            onClose={() => { setModal(null); setDeleteModel(null) }}>
            <div className="bl-alert bl-alert--warn" style={{ marginBottom: '14px' }}>
              <div className="bl-alert-title">Esta acción es irreversible</div>
              <div className="bl-alert-body">El archivo GLB será eliminado permanentemente del servidor.</div>
            </div>
            <div className="bl-preview-wrap" style={{ marginBottom: '14px' }}>
              <GlbPreview filePath={m.file_path} height={160} />
              <div className="bl-preview-meta">
                <div className="bl-meta-row"><span>Archivo</span><code className="bl-code">{m.file_path}</code></div>
                <div className="bl-meta-row">
                  <span>Resolución</span>
                  <span className={`bl-lod-badge bl-lod-badge--${m.lod_level}`}>
                    {LOD_LABELS[m.lod_level] ?? `LOD ${m.lod_level}`}
                  </span>
                </div>
                {m.file_size_mb && <div className="bl-meta-row"><span>Tamaño</span><span>{m.file_size_mb} MB</span></div>}
              </div>
            </div>
            <p className="bl-delete-confirm-text">¿Confirmas que deseas eliminar este modelo?</p>
          </Modal>
        )
      })()}
    </div>
  )
}

/* ── Página principal ───────────────────────────────────────── */
export default function Buildings() {
  const [toast,     setToast]     = useState(null)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)

  const { data: buildings = [], loading, error, refresh: load } = useCachedQuery(
    'buildings',
    () => api('GET', '/buildings')
  )

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
      setModal(null); showToast(`Edificio "${form.name}" creado correctamente.`); 
      invalidate('buildings')
      load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function confirmEdit() {
    if (!validateForm(form)) return
    setSaving(true)
    try {
      await api('PUT', `/buildings/${modal.id}`, buildPayload(form))
      setModal(null); showToast('Edificio actualizado correctamente.'); 
      invalidate('buildings')
      load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    setSaving(true)
    try {
      await api('DELETE', `/buildings/${modal.id}`)
      setModal(null); showToast(`Edificio "${modal.name}" eliminado.`); 
      invalidate('buildings')
      load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function handleToggle(b) {
    if (b.is_active && (b.model_count ?? 0) > 0) {
      setModal({ type: 'deactivate', id: b.id, name: b.name, model_count: b.model_count })
      return
    }
    await doToggle(b)
  }

  async function doToggle(b) {
    try {
      await api('PATCH', `/buildings/${b.id}/toggle`)
      showToast(`Edificio "${b.name}" ${b.is_active ? 'desactivado' : 'activado'}.`)
      invalidate('buildings')
      load()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return (
    <div className="bl-loading">
      <div className="bl-spinner" />
      <span>Cargando edificios…</span>
    </div>
  )

  if (error) return (
    <div className="bl-alert bl-alert--error">
      <IconAlert /><span>{error}</span>
    </div>
  )

  const active = buildings.filter(b => b.is_active).length

  return (
    <div className="bl-root">

      <div className="bl-page-hdr">
        <div>
          <h2 className="bl-page-title">Edificios</h2>
          <p className="bl-page-sub">
            {active} activo{active !== 1 ? 's' : ''} · {buildings.length - active} inactivo{buildings.length - active !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="bl-btn bl-btn--primary"
          onClick={() => { setForm(EMPTY_FORM); setModal({ type: 'create' }) }}>
          <IconPlus /> Nuevo edificio
        </button>
      </div>

      {buildings.length === 0 ? (
        <div className="bl-empty-page">
          <IconBuilding />
          <span>No hay edificios registrados. Crea el primero con el botón de arriba.</span>
        </div>
      ) : (
        <div className="bl-grid-cards">
          {buildings.map(b => (
            <div key={b.id} className={`bl-card ${!b.is_active ? 'bl-card--inactive' : ''}`}>
              <div className="bl-card-top">
                <div className="bl-card-badges">
                  <span className={`bl-type-badge bl-type-badge--${b.type}`}>
                    {TYPE_LABELS[b.type] || b.type}
                  </span>
                  <code className="bl-code-tag">{b.code}</code>
                </div>
                <div className="bl-card-status">
                  <span
                    className="bl-position-hint"
                    title={`Posición: X=${parseFloat(b.offset_x)||0} Y=${parseFloat(b.offset_y)||0} Z=${parseFloat(b.offset_z)||0}`}
                  >
                    <IconPosition />
                  </span>
                  <span className={`bl-status-dot ${b.is_active ? 'bl-status-dot--active' : 'bl-status-dot--inactive'}`} />
                </div>
              </div>

              <h3 className="bl-card-name">{b.name}</h3>
              <p className="bl-card-desc">
                {b.description || <em className="bl-no-desc">Sin descripción</em>}
              </p>

              <div className="bl-card-footer">
                <div className="bl-card-meta">
                  <span>{b.floor_count} planta{b.floor_count !== 1 ? 's' : ''}</span>
                  <span>{b.hotspot_count ?? 0} hotspot{(b.hotspot_count ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                <div className="bl-card-actions">
                  <button className={`bl-action-btn ${b.is_active ? 'bl-action-btn--warn' : 'bl-action-btn--ok'}`}
                    title={b.is_active ? 'Desactivar' : 'Activar'}
                    onClick={() => handleToggle(b)}>
                    {b.is_active ? <IconPause /> : <IconPlay />}
                  </button>
                  <button className="bl-action-btn" title="Editar"
                    onClick={() => {
                      setForm({ ...b, offset_x: parseFloat(b.offset_x)||0, offset_y: parseFloat(b.offset_y)||0, offset_z: parseFloat(b.offset_z)||0 })
                      setModal({ type: 'edit', id: b.id })
                    }}>
                    <IconEdit />
                  </button>
                  <button className="bl-action-btn bl-action-btn--danger" title="Eliminar"
                    onClick={() => setModal({ type: 'delete', id: b.id, name: b.name, hotspot_count: b.hotspot_count, total_hotspot_count: b.total_hotspot_count, model_count: b.model_count })}>
                    <IconTrash />
                  </button>
                </div>
              </div>

              <BuildingModels building={b} onToast={showToast} onReloadBuildings={load} />
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

      {modal?.type === 'delete' && (() => {
        const activeHs    = modal.hotspot_count       ?? 0
        const totalHs     = modal.total_hotspot_count ?? activeHs
        const inactiveHs  = totalHs - activeHs
        const activeModels = modal.model_count ?? 0
        const blocked = activeHs > 0 || activeModels > 0
        return (
          <Modal title="Eliminar edificio"
            onConfirm={blocked ? undefined : confirmDelete}
            confirmLabel={blocked ? 'No disponible' : saving ? 'Eliminando…' : 'Eliminar'}
            danger disabled={blocked || saving}
            onClose={() => setModal(null)}>

            <p className="bl-delete-name">¿Eliminar <strong>"{modal.name}"</strong>?</p>

            {activeHs > 0 && (
              <div className="bl-alert bl-alert--error">
                Tiene <strong>{activeHs} hotspot{activeHs !== 1 ? 's' : ''} activo{activeHs !== 1 ? 's' : ''}</strong>.
                Ve a <em>Hotspots</em> y desactívalos antes de eliminar el edificio.
              </div>
            )}
            {activeHs === 0 && inactiveHs > 0 && (
              <div className="bl-alert bl-alert--warn">
                El edificio tiene <strong>{inactiveHs} hotspot{inactiveHs !== 1 ? 's' : ''} inactivo{inactiveHs !== 1 ? 's' : ''}</strong> que también se eliminarán.
              </div>
            )}
            {activeModels > 0 && (
              <div className="bl-alert bl-alert--error">
                Tiene <strong>{activeModels} modelo{activeModels !== 1 ? 's' : ''} 3D activo{activeModels !== 1 ? 's' : ''}</strong>.
                Ve a <em>Modelos 3D</em> y desactívalos antes de eliminar el edificio.
              </div>
            )}
            <div className="bl-alert bl-alert--error">
              Esta acción es <strong>irreversible</strong>.
            </div>
          </Modal>
        )
      })()}

      {modal?.type === 'deactivate' && (
        <Modal title="Desactivar edificio"
          onConfirm={async () => {
            const b = buildings.find(x => x.id === modal.id)
            setModal(null)
            if (b) await doToggle(b)
          }}
          confirmLabel="Sí, desactivar" danger
          onClose={() => setModal(null)}>
          <p className="bl-delete-name">¿Desactivar <strong>"{modal.name}"</strong>?</p>
          <div className="bl-alert bl-alert--warn">
            Este edificio tiene <strong>{modal.model_count} modelo{modal.model_count !== 1 ? 's' : ''} 3D activo{modal.model_count !== 1 ? 's' : ''}</strong>.
            Al desactivar el edificio, los modelos seguirán activos. Considera desactivarlos también desde <em>Modelos 3D</em>.
          </div>
          <div className="bl-alert bl-alert--info">
            Puedes volver a activar el edificio en cualquier momento.
          </div>
        </Modal>
      )}

      {toast && (
        <div className={`bl-toast ${toast.type === 'error' ? 'bl-toast--error' : 'bl-toast--success'}`}>
          {toast.type === 'error' ? <IconAlert /> : <IconCheck />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
function IconPlus()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IconEdit()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconTrash()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function IconCheck()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> }
function IconPause()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg> }
function IconPlay()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8"/></svg> }
function IconX()        { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconAlert()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg> }
function IconUpload()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }
function IconModel()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z"/><path d="M12 2v18M4 6.5l8 5 8-5"/></svg> }
function IconBuilding() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><path d="M9 9h1m4 0h1M9 13h1m4 0h1"/></svg> }
function IconPosition() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function IconChevronDown() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg> }