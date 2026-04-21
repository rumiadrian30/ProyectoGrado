import { useState, useEffect } from 'react'
import { api, fmt } from '../api'

const TYPE_LABELS = { main: 'Principal', secondary: 'Secundario', lab: 'Laboratorio' }
const TYPE_BADGE  = { main: 'b-blue', secondary: 'b-gray', lab: 'b-teal' }

function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', onClose }) {
  return (
    <div className="overlay" onClick={e => e.target.className === 'overlay' && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default function Buildings() {
  const [buildings, setBuildings] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [toast,     setToast]     = useState(null)
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    try { setBuildings(await api('GET', '/buildings')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  function openEdit(b) {
    setForm({ name: b.name, description: b.description, floor_count: b.floor_count, is_active: b.is_active })
    setModal({ type: 'edit', id: b.id })
  }

  async function confirmEdit() {
    try {
      await api('PUT', `/buildings/${modal.id}`, form)
      setModal(null)
      showToast('Edificio actualizado correctamente.')
      load()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="loader">Cargando…</div>
  if (error)   return <div className="alert alert-error">Error: {error}</div>

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Edificios</div>
          <div className="page-sub">{buildings.length} edificios registrados</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'12px' }}>
        {buildings.map(b => (
          <div key={b.id} className="card" style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
              <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                <span className={`badge ${TYPE_BADGE[b.type] || 'b-gray'}`}>
                  {TYPE_LABELS[b.type] || b.type}
                </span>
                <code className="tag">{b.code}</code>
              </div>
              <span style={{ width:8, height:8, borderRadius:'50%', background: b.is_active ? 'var(--success)' : 'var(--danger)', display:'inline-block', marginTop:4 }}/>
            </div>

            <h3 style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>{b.name}</h3>
            <p style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.5, marginBottom:'10px',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {b.description || '—'}
            </p>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              paddingTop:'10px', borderTop:'1px solid var(--border)' }}>
              <div style={{ display:'flex', gap:'12px', fontSize:'11px', color:'var(--faint)' }}>
                <span>{b.floor_count} planta{b.floor_count !== 1 ? 's' : ''}</span>
                <span>{b.hotspot_count} hotspot{b.hotspot_count !== 1 ? 's' : ''}</span>
                <span>{b.model_count} modelo{b.model_count !== 1 ? 's' : ''}</span>
              </div>
              <button className="btn btn-sm" onClick={() => openEdit(b)}>✏ Editar</button>
            </div>
          </div>
        ))}
      </div>

      {modal?.type === 'edit' && (
        <Modal title="Editar edificio" onConfirm={confirmEdit} onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Número de plantas</label>
              <input className="form-input" type="number" min="1" value={form.floor_count || 1}
                onChange={e => setForm(f => ({ ...f, floor_count: parseInt(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={form.is_active ? 'true' : 'false'}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {toast && <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>}
    </>
  )
}
