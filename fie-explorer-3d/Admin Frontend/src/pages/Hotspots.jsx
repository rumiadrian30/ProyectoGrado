import { useState, useEffect } from 'react'
import { api, fmt, typeBadgeClass } from '../api'

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

function HotspotForm({ data, onChange, buildings = [] }) {
  const set = (k, v) => onChange({ ...data, [k]: v })
  return (
    <>
      <div className="form-group">
        <label className="form-label">Nombre del espacio *</label>
        <input className="form-input" value={data.name || ''} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Edificio *</label>
        <select className="form-select" value={data.building_id || ''} onChange={e => set('building_id', e.target.value)}>
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
          <select className="form-select" value={data.type || 'lab'} onChange={e => set('type', e.target.value)}>
            <option value="lab">Laboratorio</option>
            <option value="office">Oficina</option>
            <option value="service">Servicio</option>
            <option value="access">Acceso</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Piso *</label>
          <input className="form-input" type="number" min="0"
            value={data.floor ?? 1} onChange={e => set('floor', parseInt(e.target.value))} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-group"><label className="form-label">pos_x</label>
          <input className="form-input" type="number" step="0.1" value={data.pos_x ?? 0} onChange={e => set('pos_x', parseFloat(e.target.value))} /></div>
        <div className="form-group"><label className="form-label">pos_y</label>
          <input className="form-input" type="number" step="0.1" value={data.pos_y ?? 0} onChange={e => set('pos_y', parseFloat(e.target.value))} /></div>
        <div className="form-group"><label className="form-label">pos_z</label>
          <input className="form-input" type="number" step="0.1" value={data.pos_z ?? 0} onChange={e => set('pos_z', parseFloat(e.target.value))} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea className="form-textarea" rows={3} value={data.description || ''} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Horario</label>
        <input className="form-input" placeholder="Ej. Lun-Vie 07:00-21:00"
          value={data.schedule || ''} onChange={e => set('schedule', e.target.value)} />
      </div>
    </>
  )
}

export default function Hotspots() {
  const [hotspots,  setHotspots]  = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [toast,     setToast]     = useState(null)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState({})
  const [filter,    setFilter]    = useState('all')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [h, b] = await Promise.all([api('GET', '/hotspots'), api('GET', '/buildings')])
      setHotspots(h); setBuildings(b)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  function openNew() {
    setForm({ type: 'lab', floor: 1, pos_x: 0, pos_y: 0, pos_z: 0,
              building_id: buildings.find(b => b.is_active)?.id || '' })
    setModal({ type: 'new' })
  }

  async function confirmNew() {
    if (!form.name?.trim())  return showToast('El nombre es obligatorio.', 'error')
    if (!form.building_id)   return showToast('Selecciona un edificio.', 'error')
    try {
      await api('POST', '/hotspots', form)
      setModal(null); showToast('Hotspot creado. Registrado en audit_logs ✓'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function openEdit(id) {
    try { const h = await api('GET', '/hotspots/' + id); setForm(h); setModal({ type: 'edit', id }) }
    catch (e) { showToast(e.message, 'error') }
  }

  async function confirmEdit() {
    if (!form.name?.trim()) return showToast('El nombre es obligatorio.', 'error')
    try {
      await api('PUT', '/hotspots/' + modal.id, form)
      setModal(null); showToast('Hotspot actualizado. Guardado en audit_logs ✓'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function toggle(id) {
    try {
      const res = await api('PATCH', '/hotspots/' + id + '/toggle')
      showToast(`Hotspot ${res.is_active ? 'activado' : 'desactivado'}. Registrado en audit_logs ✓`); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function confirmDelete() {
    try {
      await api('DELETE', '/hotspots/' + modal.id)
      setModal(null); showToast('Hotspot eliminado. Registrado en audit_logs ✓'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="loader">Cargando…</div>
  if (error)   return <div className="alert alert-error">Error: {error}</div>

  const filtered = filter === 'all' ? hotspots : hotspots.filter(h => h.building_id === filter)

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Gestión de hotspots</div>
          <div className="page-sub">{hotspots.length} registros · Cada acción se guarda en audit_logs</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo hotspot</button>
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
                <th>Nombre</th><th>Tipo</th><th>Edificio</th><th>Piso</th>
                <th>Coords (x,y,z)</th><th>Estado</th><th>Actualizado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8}><div className="empty-state">No hay hotspots registrados</div></td></tr>
                : filtered.map(h => (
                  <tr key={h.id}>
                    <td><strong>{h.name}</strong></td>
                    <td><span className={`badge ${typeBadgeClass(h.type)}`}>{h.type}</span></td>
                    <td>
                      <span className="tag">{h.building_code}</span>
                      <div style={{ fontSize: '11px', color: 'var(--faint)', marginTop: 2 }}>{h.building_name}</div>
                    </td>
                    <td>{h.floor}</td>
                    <td><code className="tag">{h.pos_x}, {h.pos_y}, {h.pos_z}</code></td>
                    <td>
                      {h.is_active
                        ? <span style={{ color: 'var(--success)', fontSize: '12px' }}>● Activo</span>
                        : <span style={{ color: 'var(--danger)',  fontSize: '12px' }}>● Inactivo</span>}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--faint)' }}>{fmt(h.updated_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-sm btn-icon" title="Editar" onClick={() => openEdit(h.id)}>✏</button>
                        <button className="btn btn-sm btn-icon" title={h.is_active ? 'Desactivar' : 'Activar'}
                          onClick={() => toggle(h.id)}>{h.is_active ? '⊘' : '✓'}</button>
                        <button className="btn btn-sm btn-danger btn-icon" title="Eliminar"
                          onClick={() => setModal({ type: 'delete', id: h.id, name: h.name })}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {modal?.type === 'new' && (
        <Modal title="Crear nuevo hotspot" onConfirm={confirmNew} confirmLabel="Crear hotspot" onClose={() => setModal(null)}>
          <HotspotForm data={form} onChange={setForm} buildings={buildings} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Editar hotspot" onConfirm={confirmEdit} confirmLabel="Guardar cambios" onClose={() => setModal(null)}>
          <HotspotForm data={form} onChange={setForm} buildings={buildings} />
        </Modal>
      )}
      {modal?.type === 'delete' && (
        <Modal title="Confirmar eliminación" onConfirm={confirmDelete} confirmLabel="Eliminar" danger onClose={() => setModal(null)}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', marginBottom: '10px' }}>¿Eliminar <strong>{modal.name}</strong>?</p>
            <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Acción irreversible. Se guardará en audit_logs con action=DELETE.</p>
          </div>
        </Modal>
      )}
      {toast && <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>}
    </>
  )
}
