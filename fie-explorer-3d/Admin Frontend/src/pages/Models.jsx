import { useState, useEffect } from 'react'
import { api, fmt } from '../api'

const LOD_LABELS = { 0: 'Alta (LOD 0)', 1: 'Media (LOD 1)', 2: 'Baja (LOD 2)' }
const LOD_BADGE  = { 0: 'b-green', 1: 'b-amber', 2: 'b-gray' }

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

export default function Models() {
  const [models,    setModels]    = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState(null)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState({})
  const [filter,    setFilter]    = useState('all')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [m, b] = await Promise.all([api('GET', '/models'), api('GET', '/buildings')])
      setModels(m); setBuildings(b)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  function openNew() {
    setForm({ model_type: 'exterior', lod_level: 0, format: 'GLB',
              building_id: buildings[0]?.id || '' })
    setModal({ type: 'new' })
  }

  async function confirmNew() {
    if (!form.building_id || !form.file_path?.trim()) {
      return showToast('building_id y file_path son obligatorios.', 'error')
    }
    try {
      await api('POST', '/models', form)
      setModal(null); showToast('Modelo registrado correctamente.'); loadAll()
    } catch (e) { showToast(e.message, 'error') }
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
          <div className="page-sub">{models.length} modelos registrados · Archivos GLB/GLTF</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Registrar modelo</button>
      </div>

      {/* Filtro por edificio */}
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
                <th>Edificio</th><th>Tipo</th><th>Resolución</th><th>Formato</th>
                <th>Ruta del archivo</th><th>Tamaño</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8}><div className="empty-state">Sin modelos registrados</div></td></tr>
                : filtered.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight:500, fontSize:'13px' }}>{m.building_name}</div>
                      <div style={{ fontSize:'11px', color:'var(--faint)' }}>{m.building_code}</div>
                    </td>
                    <td><span className="badge b-blue" style={{ textTransform:'capitalize' }}>{m.model_type}</span></td>
                    <td><span className={`badge ${LOD_BADGE[m.lod_level]}`}>{LOD_LABELS[m.lod_level]}</span></td>
                    <td><code className="tag">{m.format}</code></td>
                    <td style={{ maxWidth:200 }}>
                      <code className="mono" style={{ fontSize:'11px', color:'var(--muted)',
                        display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {m.file_path}
                      </code>
                    </td>
                    <td style={{ fontSize:'12px', color:'var(--muted)' }}>
                      {m.file_size_mb ? `${m.file_size_mb} MB` : '—'}
                    </td>
                    <td>
                      {m.is_active
                        ? <span style={{ color:'var(--success)', fontSize:'12px' }}>● Activo</span>
                        : <span style={{ color:'var(--danger)',  fontSize:'12px' }}>● Inactivo</span>
                      }
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'4px' }}>
                        <button className="btn btn-sm btn-icon" title={m.is_active ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleActive(m)}>{m.is_active ? '⊘' : '✓'}</button>
                        <button className="btn btn-sm btn-danger btn-icon" title="Eliminar"
                          onClick={() => setModal({ type:'delete', id: m.id, name: m.file_path })}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo modelo */}
      {modal?.type === 'new' && (
        <Modal title="Registrar modelo 3D" onConfirm={confirmNew} confirmLabel="Registrar" onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Edificio *</label>
            <select className="form-select" value={form.building_id} onChange={e => set('building_id', e.target.value)}>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
            <label className="form-label">Ruta del archivo *</label>
            <input className="form-input" placeholder="/models/fie-main_exterior_lod0.glb"
              value={form.file_path || ''} onChange={e => set('file_path', e.target.value)} />
            <small style={{ color:'var(--faint)', fontSize:'11px' }}>
              Ruta relativa desde public/ del frontend. Ej: /models/fie-main_exterior_lod0.glb
            </small>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tamaño (MB)</label>
              <input className="form-input" type="number" step="0.1" placeholder="0.0"
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
          <div className="form-group">
            <label className="form-label">Versión (opcional)</label>
            <input className="form-input" placeholder="v1.0" value={form.version || ''}
              onChange={e => set('version', e.target.value)} />
          </div>
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title="Confirmar eliminación" onConfirm={confirmDelete}
          confirmLabel="Eliminar" danger onClose={() => setModal(null)}>
          <p style={{ fontSize:'13px', textAlign:'center' }}>
            ¿Eliminar el modelo <code className="tag">{modal.name}</code>?
          </p>
        </Modal>
      )}

      {toast && <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>}
    </>
  )
}
