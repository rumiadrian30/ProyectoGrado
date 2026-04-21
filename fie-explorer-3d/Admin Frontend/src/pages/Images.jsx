import { useState, useEffect } from 'react'
import { api } from '../api'

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

export default function Images() {
  const [hotspots,   setHotspots]   = useState([])
  const [images,     setImages]     = useState([])
  const [selected,   setSelected]   = useState(null)  // hotspot activo
  const [loading,    setLoading]    = useState(true)
  const [loadingImg, setLoadingImg] = useState(false)
  const [toast,      setToast]      = useState(null)
  const [modal,      setModal]      = useState(null)
  const [form,       setForm]       = useState({})

  useEffect(() => { loadHotspots() }, [])

  async function loadHotspots() {
    try { setHotspots(await api('GET', '/hotspots')) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadImages(hotspot) {
    setSelected(hotspot); setLoadingImg(true)
    try { setImages(await api('GET', `/images/hotspot/${hotspot.id}`)) }
    catch (e) { setImages([]) }
    finally { setLoadingImg(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  async function confirmAdd() {
    if (!form.url?.trim()) return showToast('La URL es obligatoria.', 'error')
    try {
      await api('POST', '/images', { hotspot_id: selected.id, ...form })
      setModal(null); showToast('Imagen agregada.'); loadImages(selected)
    } catch (e) { showToast(e.message, 'error') }
  }

  async function confirmDelete() {
    try {
      await api('DELETE', `/images/${modal.id}`)
      setModal(null); showToast('Imagen eliminada.'); loadImages(selected)
    } catch (e) { showToast(e.message, 'error') }
  }

  async function moveOrder(img, dir) {
    const newOrder = img.sort_order + dir
    if (newOrder < 0) return
    try {
      await api('PUT', `/images/${img.id}`, { sort_order: newOrder })
      loadImages(selected)
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="loader">Cargando…</div>

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Imágenes de hotspots</div>
          <div className="page-sub">Galería de fotos por punto de interés</div>
        </div>
        {selected && (
          <button className="btn btn-primary btn-sm"
            onClick={() => { setForm({ sort_order: images.length }); setModal({ type:'add' }) }}>
            + Agregar imagen
          </button>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:'16px' }}>

        {/* Lista de hotspots */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)',
            fontSize:'11px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>
            Selecciona un hotspot
          </div>
          <div style={{ overflowY:'auto', maxHeight:'60vh' }}>
            {hotspots.length === 0
              ? <div className="empty-state" style={{ padding:'20px' }}>Sin hotspots</div>
              : hotspots.map(h => (
                <div key={h.id}
                  onClick={() => loadImages(h)}
                  style={{
                    padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid rgba(0,0,0,.04)',
                    background: selected?.id === h.id ? 'var(--bg)' : 'transparent',
                    borderLeft: selected?.id === h.id ? '3px solid var(--espoch)' : '3px solid transparent',
                    transition:'all .1s',
                  }}>
                  <div style={{ fontSize:'13px', fontWeight:selected?.id === h.id ? 600 : 400 }}>{h.name}</div>
                  <div style={{ fontSize:'11px', color:'var(--faint)' }}>{h.building_code} · Piso {h.floor}</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Galería de imágenes */}
        <div>
          {!selected && (
            <div className="card" style={{ padding:'40px', textAlign:'center', color:'var(--muted)' }}>
              Selecciona un hotspot de la lista para ver y gestionar sus imágenes.
            </div>
          )}

          {selected && loadingImg && <div className="loader">Cargando imágenes…</div>}

          {selected && !loadingImg && (
            <>
              <div style={{ marginBottom:'10px' }}>
                <span style={{ fontSize:'13px', fontWeight:500 }}>{selected.name}</span>
                <span style={{ fontSize:'12px', color:'var(--faint)', marginLeft:'8px' }}>
                  {images.length} imagen{images.length !== 1 ? 'es' : ''}
                </span>
              </div>

              {images.length === 0 ? (
                <div className="card" style={{ padding:'40px', textAlign:'center', color:'var(--muted)' }}>
                  Sin imágenes. Haz clic en "+ Agregar imagen" para comenzar.
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'10px' }}>
                  {images.map((img, i) => (
                    <div key={img.id} className="card" style={{ padding:'10px', position:'relative' }}>
                      {/* Preview */}
                      <div style={{ width:'100%', paddingBottom:'60%', position:'relative',
                        background:'#f1f5f9', borderRadius:'6px', overflow:'hidden', marginBottom:'8px' }}>
                        <img src={img.url} alt={img.alt_text || ''}
                          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
                          onError={e => { e.target.style.display='none'; }} />
                        {i === 0 && (
                          <span style={{ position:'absolute', top:4, left:4,
                            background:'var(--espoch)', color:'#fff', fontSize:'9px',
                            fontWeight:700, padding:'1px 5px', borderRadius:'3px' }}>
                            PRINCIPAL
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize:'11px', color:'var(--muted)', marginBottom:'6px',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                        title={img.url}>{img.url}</p>

                      {img.alt_text && (
                        <p style={{ fontSize:'10px', color:'var(--faint)', marginBottom:'6px' }}>{img.alt_text}</p>
                      )}

                      <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                        <button className="btn btn-sm btn-icon" title="Subir orden"
                          onClick={() => moveOrder(img, -1)} disabled={i === 0}>↑</button>
                        <button className="btn btn-sm btn-icon" title="Bajar orden"
                          onClick={() => moveOrder(img, 1)} disabled={i === images.length - 1}>↓</button>
                        <button className="btn btn-sm btn-danger btn-icon"
                          onClick={() => setModal({ type:'delete', id: img.id })}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modal?.type === 'add' && (
        <Modal title="Agregar imagen" onConfirm={confirmAdd} confirmLabel="Agregar" onClose={() => setModal(null)}>
          <div className="form-group">
            <label className="form-label">URL de la imagen *</label>
            <input className="form-input" placeholder="https://... o /images/foto.jpg"
              value={form.url || ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            <small style={{ fontSize:'11px', color:'var(--faint)' }}>
              URL pública o ruta relativa al servidor de estáticos.
            </small>
          </div>
          <div className="form-group">
            <label className="form-label">Texto alternativo</label>
            <input className="form-input" placeholder="Descripción de la imagen"
              value={form.alt_text || ''} onChange={e => setForm(f => ({ ...f, alt_text: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Orden (0 = principal)</label>
            <input className="form-input" type="number" min="0" value={form.sort_order ?? 0}
              onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))} />
          </div>
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title="Eliminar imagen" onConfirm={confirmDelete} confirmLabel="Eliminar"
          danger onClose={() => setModal(null)}>
          <p style={{ textAlign:'center', fontSize:'13px' }}>¿Eliminar esta imagen del hotspot?</p>
        </Modal>
      )}

      {toast && <div className={`alert alert-${toast.type} toast`}>{toast.msg}</div>}
    </>
  )
}
