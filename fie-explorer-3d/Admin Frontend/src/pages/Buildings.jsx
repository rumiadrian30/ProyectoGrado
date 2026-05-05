// Admin Frontend/src/pages/Buildings.jsx
import { useState, useEffect } from 'react'
import { api, fmt } from '../api'

// ─── Constantes ──────────────────────────────────────────────
const TYPE_LABELS = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' }
const TYPE_BADGE  = { main: 'b-blue', secondary: 'b-gray', lab: 'b-teal' }

const EMPTY_FORM = {
  name: '', code: '', description: '', type: 'main', floor_count: 1,
}

// ─── Modal genérico ──────────────────────────────────────────
function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target.className === 'overlay' && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Formulario de edificio ───────────────────────────────────
function BuildingForm({ data, onChange, isEdit = false }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <>
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Nombre del edificio *</label>
          <input
            className="form-input"
            placeholder="Ej: Bloque Académico A"
            value={data.name || ''}
            onChange={e => set('name', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Código *</label>
          <input
            className="form-input"
            placeholder="Ej: FIE-A"
            value={data.code || ''}
            onChange={e => set('code', e.target.value.toUpperCase())}
            style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.05em' }}
          />
          <small style={{ color: 'var(--faint)', fontSize: '11px' }}>
            Identificador corto único (se convierte a mayúsculas)
          </small>
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
          <input
            className="form-input"
            type="number"
            min="1"
            max="20"
            value={data.floor_count || 1}
            onChange={e => set('floor_count', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea
          className="form-textarea"
          placeholder="Descripción del edificio, función principal, etc."
          value={data.description || ''}
          onChange={e => set('description', e.target.value)}
          rows={3}
        />
      </div>

      {isEdit && (
        <div className="form-group">
          <label className="form-label">Estado</label>
          <select
            className="form-select"
            value={data.is_active ? 'true' : 'false'}
            onChange={e => set('is_active', e.target.value === 'true')}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      )}
    </>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function Buildings() {
  const [buildings, setBuildings] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [toast,     setToast]     = useState(null)
  const [modal,     setModal]     = useState(null)   // { type: 'create'|'edit'|'delete', id? }
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setBuildings(await api('GET', '/buildings'))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setModal({ type: 'create' })
  }

  function openEdit(b) {
    setForm({
      name: b.name,
      code: b.code,
      description: b.description || '',
      type: b.type || 'main',
      floor_count: b.floor_count || 1,
      is_active: b.is_active,
    })
    setModal({ type: 'edit', id: b.id })
  }

  function openDelete(b) {
    setModal({ type: 'delete', id: b.id, name: b.name, hotspot_count: b.hotspot_count })
  }

  // ── CRUD handlers ────────────────────────────────────────────
  async function confirmCreate() {
    if (!form.name?.trim()) return showToast('El nombre es obligatorio.', 'error')
    if (!form.code?.trim()) return showToast('El código es obligatorio.', 'error')
    setSaving(true)
    try {
      await api('POST', '/buildings', form)
      setModal(null)
      showToast(`Edificio "${form.name}" creado correctamente.`)
      load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmEdit() {
    if (!form.name?.trim()) return showToast('El nombre es obligatorio.', 'error')
    setSaving(true)
    try {
      await api('PUT', `/buildings/${modal.id}`, form)
      setModal(null)
      showToast('Edificio actualizado correctamente.')
      load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    setSaving(true)
    try {
      await api('DELETE', `/buildings/${modal.id}`)
      setModal(null)
      showToast(`Edificio "${modal.name}" eliminado.`)
      load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(b) {
    try {
      await api('PATCH', `/buildings/${b.id}/toggle`)
      showToast(`Edificio "${b.name}" ${b.is_active ? 'desactivado' : 'activado'}.`)
      load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) return <div className="loader">Cargando…</div>
  if (error)   return <div className="alert alert-error">Error: {error}</div>

  const active   = buildings.filter(b => b.is_active)
  const inactive = buildings.filter(b => !b.is_active)

  return (
    <>
      {/* Cabecera */}
      <div className="page-hdr">
        <div>
          <div className="page-title">Edificios</div>
          <div className="page-sub">
            {active.length} activo{active.length !== 1 ? 's' : ''} · {inactive.length} inactivo{inactive.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo edificio
        </button>
      </div>

      {/* Grid de tarjetas */}
      {buildings.length === 0 ? (
        <div className="alert" style={{ textAlign: 'center', padding: '2rem' }}>
          No hay edificios registrados. Crea el primero con el botón de arriba.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '12px' }}>
          {buildings.map(b => (
            <div
              key={b.id}
              className="card"
              style={{
                padding: '16px',
                opacity: b.is_active ? 1 : 0.6,
                transition: 'opacity .2s',
              }}
            >
              {/* Cabecera tarjeta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge ${TYPE_BADGE[b.type] || 'b-gray'}`}>
                    {TYPE_LABELS[b.type] || b.type}
                  </span>
                  <code className="tag">{b.code}</code>
                </div>
                <span
                  title={b.is_active ? 'Activo' : 'Inactivo'}
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: b.is_active ? 'var(--success)' : 'var(--danger)',
                    display: 'inline-block', marginTop: 4, flexShrink: 0,
                  }}
                />
              </div>

              {/* Nombre y descripción */}
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{b.name}</h3>
              <p style={{
                fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '10px',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                minHeight: '2.8em',
              }}>
                {b.description || <span style={{ fontStyle: 'italic' }}>Sin descripción</span>}
              </p>

              {/* Stats */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '10px', borderTop: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--faint)' }}>
                  <span title="Plantas">{b.floor_count} planta{b.floor_count !== 1 ? 's' : ''}</span>
                  <span title="Hotspots activos">{b.hotspot_count} hotspot{b.hotspot_count !== 1 ? 's' : ''}</span>
                  <span title="Modelos 3D">{b.model_count} modelo{b.model_count !== 1 ? 's' : ''}</span>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-sm"
                    title={b.is_active ? 'Desactivar' : 'Activar'}
                    onClick={() => handleToggle(b)}
                    style={{ color: b.is_active ? 'var(--danger)' : 'var(--success)' }}
                  >
                    {b.is_active ? '⏸' : '▶'}
                  </button>
                  <button className="btn btn-sm" title="Editar" onClick={() => openEdit(b)}>
                    ✏
                  </button>
                  <button
                    className="btn btn-sm"
                    title="Eliminar"
                    onClick={() => openDelete(b)}
                    style={{ color: 'var(--danger)' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear */}
      {modal?.type === 'create' && (
        <Modal
          title="Nuevo edificio"
          onConfirm={confirmCreate}
          confirmLabel={saving ? 'Guardando…' : 'Crear edificio'}
          onClose={() => setModal(null)}
        >
          <BuildingForm data={form} onChange={setForm} />
        </Modal>
      )}

      {/* Modal: Editar */}
      {modal?.type === 'edit' && (
        <Modal
          title="Editar edificio"
          onConfirm={confirmEdit}
          confirmLabel={saving ? 'Guardando…' : 'Guardar cambios'}
          onClose={() => setModal(null)}
        >
          <BuildingForm data={form} onChange={setForm} isEdit />
        </Modal>
      )}

      {/* Modal: Eliminar */}
      {modal?.type === 'delete' && (
        <Modal
          title="Eliminar edificio"
          onConfirm={confirmDelete}
          confirmLabel={saving ? 'Eliminando…' : 'Eliminar'}
          danger
          onClose={() => setModal(null)}
        >
          <p style={{ marginBottom: '12px' }}>
            ¿Estás seguro de que quieres eliminar <strong>"{modal.name}"</strong>?
          </p>
          {modal.hotspot_count > 0 ? (
            <div className="alert alert-error">
              Este edificio tiene <strong>{modal.hotspot_count} hotspot(s) activo(s)</strong>.
              Debes desactivarlos antes de poder eliminar el edificio.
            </div>
          ) : (
            <div className="alert alert-error" style={{ fontSize: '13px' }}>
              Esta acción es <strong>irreversible</strong>. Se eliminarán también los modelos 3D
              e imágenes asociados sin hotspots activos.
            </div>
          )}
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>
      )}
    </>
  )
}
