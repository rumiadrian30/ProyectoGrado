/**
 * BuildingModels.jsx
 * Sección expandible dentro de cada tarjeta de edificio.
 * Reemplaza el bloque BuildingModels dentro de Buildings.jsx.
 *
 * CAMBIO PRINCIPAL: el campo "Ruta del archivo" se reemplaza por
 * un botón "Seleccionar archivo .glb / .gltf" que:
 *   1. Abre el explorador de archivos del sistema operativo
 *   2. Sube el archivo al backend → POST /api/models/upload
 *   3. Rellena automáticamente file_path, file_size_mb y format
 */

import { useState, useRef } from 'react'
import { api } from '../api'

const LOD_LABELS = { 0: 'LOD 0 — Alta', 1: 'LOD 1 — Media', 2: 'LOD 2 — Baja' }

export function BuildingModels({ building, onToast }) {
  const [models,    setModels]   = useState(null)
  const [open,      setOpen]     = useState(false)
  const [modal,     setModal]    = useState(null)
  const [form,      setForm]     = useState({})
  const [saving,    setSaving]   = useState(false)
  const [uploading, setUploading]= useState(false)
  const [uploadPct, setUploadPct]= useState(0)
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

  function openNew() {
    setForm({ building_id: building.id, model_type: 'exterior', lod_level: 0, format: 'GLB' })
    setModal({ type: 'new' })
  }

  // ── Upload del archivo ────────────────────────────────────────
  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (!['glb', 'gltf'].includes(ext)) {
      onToast('Solo se aceptan archivos .glb o .gltf', 'error')
      return
    }

    setUploading(true)
    setUploadPct(0)

    try {
      const formData = new FormData()
      formData.append('model', file)

      // Usamos XMLHttpRequest para mostrar progreso real
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/models/upload')

        // Incluir cookie de auth automáticamente
        xhr.withCredentials = true

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadPct(Math.round(ev.loaded / ev.total * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || 'Error al subir')) }
            catch { reject(new Error(`Error ${xhr.status}`)) }
          }
        }
        xhr.onerror = () => reject(new Error('Error de red al subir el archivo'))
        xhr.send(formData)
      })

      // Rellenar el formulario automáticamente con los datos devueltos
      setForm(f => ({
        ...f,
        file_path:    result.file_path,
        file_size_mb: result.file_size_mb,
        format:       result.format,
      }))
      onToast(`✅ Archivo "${file.name}" subido correctamente.`)
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setUploading(false)
      setUploadPct(0)
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Registrar modelo en BD ────────────────────────────────────
  async function confirmNew() {
    if (!form.file_path?.trim()) return onToast('Selecciona un archivo .glb primero.', 'error')
    setSaving(true)
    try {
      await api('POST', '/models', form)
      setModal(null)
      onToast('Modelo registrado correctamente.')
      load()
    } catch (e) { onToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  async function toggleModel(m) {
    try {
      await api('PUT', `/models/${m.id}`, { is_active: !m.is_active })
      onToast(`Modelo ${!m.is_active ? 'activado' : 'desactivado'}.`); load()
    } catch (e) { onToast(e.message, 'error') }
  }

  async function confirmDelete() {
    try {
      await api('DELETE', `/models/${modal.id}`)
      setModal(null); onToast('Modelo eliminado.'); load()
    } catch (e) { onToast(e.message, 'error') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: '10px' }}>
      {/* Cabecera expandible */}
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
          {models === null && <div style={{ fontSize: '12px', color: 'var(--faint)' }}>Cargando…</div>}
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
            onClick={openNew}>
            + Añadir modelo
          </button>
        </div>
      )}

      {/* ── Modal: Nuevo modelo ── */}
      {modal?.type === 'new' && (
        <div className="overlay" onClick={e => e.target.className === 'overlay' && setModal(null)}>
          <div className="modal">
            <h3>Nuevo modelo — {building.name}</h3>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select className="form-select" value={form.model_type}
                  onChange={e => set('model_type', e.target.value)}>
                  <option value="exterior">Exterior</option>
                  <option value="interior">Interior</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nivel LOD *</label>
                <select className="form-select" value={form.lod_level}
                  onChange={e => set('lod_level', parseInt(e.target.value))}>
                  <option value={0}>0 — Alta resolución</option>
                  <option value={1}>1 — Media resolución</option>
                  <option value={2}>2 — Baja resolución</option>
                </select>
              </div>
            </div>

            {/* ── Selector de archivo ── */}
            <div className="form-group">
              <label className="form-label">Archivo del modelo *</label>

              {/* Input oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Botón de selección */}
              {!form.file_path && !uploading && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.65rem', fontSize: '13px' }}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  📂 Seleccionar archivo .glb / .gltf
                </button>
              )}

              {/* Barra de progreso durante el upload */}
              {uploading && (
                <div style={{
                  border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                    Subiendo archivo… {uploadPct}%
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${uploadPct}%`,
                      background: 'var(--primary)', borderRadius: '4px',
                      transition: 'width 200ms',
                    }}/>
                  </div>
                </div>
              )}

              {/* Archivo subido con éxito */}
              {form.file_path && !uploading && (
                <div style={{
                  border: '1px solid #bbf7d0', borderRadius: '8px',
                  background: '#f0fdf4', padding: '10px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                      ✅ Archivo subido
                    </div>
                    <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px', fontFamily: 'monospace' }}>
                      {form.file_path}
                    </div>
                    {form.file_size_mb && (
                      <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '1px' }}>
                        {form.file_size_mb} MB · {form.format}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: '11px', flexShrink: 0 }}
                    onClick={() => { set('file_path', ''); set('file_size_mb', null); fileInputRef.current?.click() }}
                    type="button"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              <small style={{ color: 'var(--faint)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                El archivo se guarda en <code>public/models/</code> del visor público. Máximo 200 MB.
              </small>
            </div>

            {/* Versión (opcional) */}
            <div className="form-group">
              <label className="form-label">Versión (opcional)</label>
              <input className="form-input" placeholder="v1.0"
                value={form.version || ''}
                onChange={e => set('version', e.target.value)} />
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={confirmNew}
                disabled={!form.file_path || uploading || saving}
              >
                {saving ? 'Registrando…' : 'Registrar modelo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Eliminar modelo ── */}
      {modal?.type === 'del-model' && (
        <div className="overlay" onClick={e => e.target.className === 'overlay' && setModal(null)}>
          <div className="modal">
            <h3>Eliminar modelo</h3>
            <p style={{ fontSize: '13px', textAlign: 'center' }}>
              ¿Eliminar el modelo <code className="tag">{modal.name}</code>?
            </p>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
