import { useState, useEffect } from 'react'
import { api, fmt, typeBadgeClass } from '../api'
import SchedulePicker from '../components/SchedulePicker'
import { useInteriorCameras } from '../hooks/useInteriorCameras'

const TYPE_LABELS = {
  classroom: 'Aula',
  lab:       'Laboratorio',
  office:    'Oficina',
  service:   'Servicio',
  access:    'Acceso',
}

const TYPE_ICONS = {
  classroom: <IconClassroom />,
  lab:       <IconLab />,
  office:    <IconOffice />,
  service:   <IconService />,
  access:    <IconAccess />,
}

/* ── Modal ──────────────────────────────────────────────────── */
function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose }) {
  return (
    <div className="hs-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hs-modal">
        <div className="hs-modal-header">
          <h3 className="hs-modal-title">{title}</h3>
          <button className="hs-modal-close" onClick={onClose} aria-label="Cerrar">
            <IconX />
          </button>
        </div>
        <div className="hs-modal-body">{children}</div>
        <div className="hs-modal-footer">
          <button className="hs-btn hs-btn--ghost" onClick={onClose}>Cancelar</button>
          <button
            className={`hs-btn ${danger ? 'hs-btn--danger' : 'hs-btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Form ───────────────────────────────────────────────────── */
function HotspotForm({ data, onChange, buildings = [], models = [] }) {
  const set = (k, v) => onChange({ ...data, [k]: v })

  const selectedBuilding = buildings.find(b => String(b.id) === String(data.building_id))
  const maxFloor = selectedBuilding?.floor_count ?? 99

  // Modelo activo (lod_level=0) del edificio seleccionado — fuente de cámaras interiores
  const activeModel = models.find(m =>
    String(m.building_id) === String(data.building_id) && m.is_active
  )

  const { cameras, loading: camerasLoading, error: camerasError, reload: reloadCameras } =
    useInteriorCameras(activeModel?.file_path)

  const handleBuildingChange = (newId) => {
    const building = buildings.find(b => String(b.id) === String(newId))
    const max = building?.floor_count ?? 99
    onChange({ ...data, building_id: newId, floor: Math.min(data.floor ?? 1, max) })
  }

  return (
    <div className="hs-form">
      <div className="hs-form-section-label">Identificación</div>

      <div className="hs-field">
        <label className="hs-label">Nombre del espacio <span className="hs-required">*</span></label>
        <input className="hs-input" value={data.name || ''} onChange={e => set('name', e.target.value)} />
      </div>

      <div className="hs-field">
        <label className="hs-label">Edificio <span className="hs-required">*</span></label>
        <select className="hs-input" value={data.building_id || ''} onChange={e => handleBuildingChange(e.target.value)}>
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

      <div className="hs-grid-2">
        <div className="hs-field">
          <label className="hs-label">Tipo <span className="hs-required">*</span></label>
          <select className="hs-input" value={data.type || 'lab'} onChange={e => set('type', e.target.value)}>
            <option value="classroom">Aula</option>
            <option value="lab">Laboratorio</option>
            <option value="office">Oficina</option>
            <option value="service">Servicio</option>
            <option value="access">Acceso</option>
          </select>
        </div>
        <div className="hs-field">
          <label className="hs-label">
            Piso <span className="hs-required">*</span>
            {selectedBuilding && (
              <span className="hs-label-hint">(1 – {maxFloor})</span>
            )}
          </label>
          <input
            className="hs-input"
            type="number"
            min="1"
            max={maxFloor}
            value={data.floor ?? 1}
            onChange={e => {
              const val = Math.max(1, Math.min(maxFloor, parseInt(e.target.value) || 1))
              set('floor', val)
            }}
          />
          {selectedBuilding && (
            <span className="hs-field-hint">
              {selectedBuilding.name} tiene {maxFloor} {maxFloor === 1 ? 'planta' : 'plantas'}
            </span>
          )}
        </div>
      </div>

      <div className="hs-form-section-label" style={{ marginTop: '20px' }}>Información del espacio</div>

      <div className="hs-field">
        <label className="hs-label">Docente / Responsable</label>
        <input className="hs-input" placeholder="Ing. Nombre Apellido"
          value={data.teacher || ''} onChange={e => set('teacher', e.target.value)} />
      </div>

      <div className="hs-grid-2">
        <div className="hs-field">
          <label className="hs-label">Teléfono / Extensión</label>
          <input className="hs-input" placeholder="+593 3 294-xxxx ext. 1234"
            value={data.phone || ''} onChange={e => set('phone', e.target.value)} />
        </div>
        <div className="hs-field">
          <label className="hs-label">Capacidad (personas)</label>
          <input className="hs-input" type="number" min="1" placeholder="40"
            value={data.capacity || ''}
            onChange={e => set('capacity', e.target.value ? parseInt(e.target.value) : null)} />
        </div>
      </div>

      <div className="hs-field">
        <SchedulePicker value={data.schedule || ''} onChange={v => set('schedule', v)} />
      </div>

      <div className="hs-form-section-label" style={{ marginTop: '20px' }}>Mapeo Espacial 3D</div>

      <div className="hs-field">
        <label className="hs-label">Referencia de cámara interior</label>

        {!data.building_id ? (
          <span className="hs-field-hint">Selecciona un edificio para ver sus cámaras disponibles.</span>
        ) : !activeModel ? (
          <span className="hs-field-hint">Este edificio no tiene un modelo 3D activo.</span>
        ) : camerasLoading ? (
          <div className="hs-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af' }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #e5e7eb', borderTopColor: '#BC0613', borderRadius: '50%', animation: 'glb-spin 0.8s linear infinite' }} />
            Cargando cámaras del modelo…
          </div>
        ) : (
          <>
            <select
              className="hs-input"
              value={data.camera_reference || ''}
              onChange={e => set('camera_reference', e.target.value)}
            >
              <option value="">— Sin referencia (vista exterior) —</option>
              {cameras.map(camName => (
                <option key={camName} value={camName}>{camName}</option>
              ))}
              {data.camera_reference && !cameras.includes(data.camera_reference) && (
                <option value={data.camera_reference}>
                  {data.camera_reference} (no encontrada en el modelo actual)
                </option>
              )}
            </select>

            {cameras.length === 0 && !camerasError && (
              <span className="hs-field-hint">
                No se encontraron objetos "Cam_Interior_*" en el GLB de este edificio.
              </span>
            )}
            {camerasError && (
              <span className="hs-field-hint" style={{ color: '#dc2626' }}>{camerasError}</span>
            )}

            <button
              type="button"
              className="hs-btn hs-btn--ghost hs-btn--sm"
              style={{ marginTop: '6px', alignSelf: 'flex-start' }}
              onClick={reloadCameras}
            >
              Recargar cámaras del modelo
            </button>
          </>
        )}

        <span className="hs-field-hint">
          Al hacer clic en este hotspot en modo interior, la cámara vuela hacia la posición
          y orientación exactas de la cámara seleccionada en Blender.
        </span>
      </div>

      <div className="hs-field">
        <label className="hs-label">Descripción</label>
        <textarea className="hs-input hs-textarea" rows={3}
          placeholder="Describe el espacio, equipamiento disponible, etc."
          value={data.description || ''} onChange={e => set('description', e.target.value)} />
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */
export default function Hotspots() {
  const [hotspots,  setHotspots]  = useState([])
  const [buildings, setBuildings] = useState([])
  const [models,    setModels]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [toast,     setToast]     = useState(null)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState({})
  const [filter,    setFilter]    = useState('all')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [h, b, m] = await Promise.all([
        api('GET', '/hotspots'),
        api('GET', '/buildings'),
        api('GET', '/models'),
      ])
      setHotspots(h); setBuildings(b); setModels(Array.isArray(m) ? m : (m?.data ?? []))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openNew() {
    setForm({
      type: 'classroom', floor: 1, pos_x: 0, pos_y: 0, pos_z: 0,
      building_id: buildings.find(b => b.is_active)?.id || '',
      teacher: '', capacity: null, phone: '', schedule: '', description: '', camera_reference: '',
    })
    setModal({ type: 'new' })
  }

  async function confirmNew() {
    if (!form.name?.trim()) return showToast('El nombre es obligatorio.', 'error')
    if (!form.building_id)  return showToast('Selecciona un edificio.', 'error')
    try {
      await api('POST', '/hotspots', form)
      setModal(null); showToast('Hotspot creado y registrado en audit_logs.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function openEdit(id) {
    try {
      const h = await api('GET', '/hotspots/' + id)
      setForm(h); setModal({ type: 'edit', id })
    } catch (e) { showToast(e.message, 'error') }
  }

  async function confirmEdit() {
    if (!form.name?.trim()) return showToast('El nombre es obligatorio.', 'error')
    try {
      await api('PUT', '/hotspots/' + modal.id, form)
      setModal(null); showToast('Hotspot actualizado y guardado en audit_logs.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function toggle(id) {
    try {
      const res = await api('PATCH', '/hotspots/' + id + '/toggle')
      showToast(`Hotspot ${res.is_active ? 'activado' : 'desactivado'}. Registrado en audit_logs.`); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function confirmDelete() {
    try {
      await api('DELETE', '/hotspots/' + modal.id)
      setModal(null); showToast('Hotspot eliminado. Registrado en audit_logs.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return (
    <div className="hs-loading">
      <div className="hs-spinner" />
      <span>Cargando hotspots…</span>
    </div>
  )

  if (error) return (
    <div className="hs-error">
      <IconAlert />
      <span>{error}</span>
    </div>
  )

  const filtered = filter === 'all' ? hotspots : hotspots.filter(h => h.building_id === filter)

  return (
    <div className="hs-root">

      {/* Header */}
      <div className="hs-page-hdr">
        <div>
          <h2 className="hs-page-title">Hotspots</h2>
          <p className="hs-page-sub">
            {hotspots.length} registros · Cada acción se guarda en audit_logs
          </p>
        </div>
        <button className="hs-btn hs-btn--primary" onClick={openNew}>
          <IconPlus /> Nuevo hotspot
        </button>
      </div>

      {/* Filtro por edificio */}
      <div className="hs-tabs">
        <button
          className={`hs-tab ${filter === 'all' ? 'hs-tab--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos
          <span className="hs-tab-count">{hotspots.length}</span>
        </button>
        {buildings.map(b => {
          const count = hotspots.filter(h => h.building_id === b.id).length
          return (
            <button
              key={b.id}
              className={`hs-tab ${filter === b.id ? 'hs-tab--active' : ''}`}
              onClick={() => setFilter(b.id)}
            >
              {b.code}
              <span className="hs-tab-count">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="hs-table-wrap">
        <table className="hs-table">
          <thead>
            <tr>
              <th>Espacio</th>
              <th>Tipo</th>
              <th>Edificio</th>
              <th>Piso</th>
              <th>Docente</th>
              <th>Cap.</th>
              <th>Estado</th>
              <th>Actualizado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="hs-empty">
                    <IconEmpty />
                    <span>No hay hotspots registrados</span>
                  </div>
                </td>
              </tr>
            ) : filtered.map(h => (
              <tr key={h.id} className="hs-row">
                <td>
                  <span className="hs-cell-name">{h.name}</span>
                  {h.description && (
                    <span className="hs-cell-desc" title={h.description}>
                      {h.description.length > 42 ? h.description.slice(0, 42) + '…' : h.description}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`hs-type-badge hs-type-badge--${h.type}`}>
                    {TYPE_LABELS[h.type] ?? h.type}
                  </span>
                </td>
                <td>
                  <span className="hs-code-tag">{h.building_code}</span>
                  <span className="hs-cell-desc">{h.building_name}</span>
                </td>
                <td className="hs-cell-mono">{h.floor}</td>
                <td className="hs-cell-secondary">{h.teacher || <span className="hs-dash">—</span>}</td>
                <td className="hs-cell-mono">{h.capacity ?? <span className="hs-dash">—</span>}</td>
                <td>
                  <span className={`hs-status ${h.is_active ? 'hs-status--active' : 'hs-status--inactive'}`}>
                    <span className="hs-status-dot" />
                    {h.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="hs-cell-time">{fmt(h.updated_at)}</td>
                <td>
                  <div className="hs-actions">
                    <button className="hs-action-btn" title="Editar" onClick={() => openEdit(h.id)}>
                      <IconEdit />
                    </button>
                    <button
                      className={`hs-action-btn ${h.is_active ? 'hs-action-btn--warn' : 'hs-action-btn--ok'}`}
                      title={h.is_active ? 'Desactivar' : 'Activar'}
                      onClick={() => toggle(h.id)}
                    >
                      {h.is_active ? <IconPause /> : <IconCheck />}
                    </button>
                    <button
                      className="hs-action-btn hs-action-btn--danger"
                      title="Eliminar"
                      onClick={() => setModal({ type: 'delete', id: h.id, name: h.name })}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal?.type === 'new' && (
        <Modal title="Nuevo hotspot" onConfirm={confirmNew} confirmLabel="Crear hotspot" onClose={() => setModal(null)}>
          <HotspotForm data={form} onChange={setForm} buildings={buildings} models={models} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Editar hotspot" onConfirm={confirmEdit} confirmLabel="Guardar cambios" onClose={() => setModal(null)}>
          <HotspotForm data={form} onChange={setForm} buildings={buildings} models={models} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal title="Eliminar hotspot" onConfirm={confirmDelete} confirmLabel="Eliminar" danger onClose={() => setModal(null)}>
          <div className="hs-delete-confirm">
            <div className="hs-delete-icon"><IconTrash /></div>
            <p className="hs-delete-name">{modal.name}</p>
            <p className="hs-delete-warning">
              Esta acción es irreversible. Se registrará en audit_logs con action=DELETE.
            </p>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className={`hs-toast ${toast.type === 'error' ? 'hs-toast--error' : 'hs-toast--success'}`}>
          {toast.type === 'error' ? <IconAlert /> : <IconCheck />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function IconEdit() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function IconTrash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
function IconCheck() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconPause() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg>
}
function IconX() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IconAlert() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg>
}
function IconEmpty() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h4"/></svg>
}
function IconClassroom() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
}
function IconLab() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 3h6M9 3v7l-4 9a1 1 0 0 0 .9 1.5h12.2a1 1 0 0 0 .9-1.5L15 10V3"/></svg>
}
function IconOffice() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
}
function IconService() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
}
function IconAccess() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}