import { useState, useEffect } from 'react'
import { api } from '../api'

function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose }) {
  return (
    <div className="im-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="im-modal">
        <div className="im-modal-header">
          <h3 className="im-modal-title">{title}</h3>
          <button className="im-modal-close" onClick={onClose} aria-label="Cerrar"><IconX /></button>
        </div>
        <div className="im-modal-body">{children}</div>
        <div className="im-modal-footer">
          <button className="im-btn im-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className={`im-btn ${danger ? 'im-btn--danger' : 'im-btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Images() {
  const [hotspots,       setHotspots]       = useState([])
  const [buildings,      setBuildings]      = useState([])
  const [images,         setImages]         = useState([])
  const [selected,       setSelected]       = useState(null)
  const [buildingFilter, setBuildingFilter] = useState('all')
  const [loading,        setLoading]        = useState(true)
  const [loadingImg,     setLoadingImg]     = useState(false)
  const [toast,          setToast]          = useState(null)
  const [modal,          setModal]          = useState(null)
  const [form,           setForm]           = useState({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [h, b] = await Promise.all([api('GET', '/hotspots'), api('GET', '/buildings')])
      setHotspots(h); setBuildings(b)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadImages(hotspot) {
    setSelected(hotspot); setLoadingImg(true)
    try { setImages(await api('GET', `/images/hotspot/${hotspot.id}`)) }
    catch { setImages([]) }
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
    try { await api('PUT', `/images/${img.id}`, { sort_order: newOrder }); loadImages(selected) }
    catch (e) { showToast(e.message, 'error') }
  }

  const visibleHotspots = buildingFilter === 'all'
    ? hotspots
    : hotspots.filter(h => h.building_id === buildingFilter)

  if (loading) return (
    <div className="im-loading">
      <div className="im-spinner" />
      <span>Cargando hotspots…</span>
    </div>
  )

  return (
    <div className="im-root">

      {/* Header */}
      <div className="im-page-hdr">
        <div>
          <h2 className="im-page-title">Imágenes</h2>
          <p className="im-page-sub">Galería de fotos por punto de interés</p>
        </div>
        {selected && (
          <button className="im-btn im-btn--primary"
            onClick={() => { setForm({ sort_order: images.length }); setModal({ type: 'add' }) }}>
            <IconPlus /> Agregar imagen
          </button>
        )}
      </div>

      <div className="im-layout">

        {/* Panel izquierdo — lista de hotspots */}
        <aside className="im-sidebar">
          <div className="im-sidebar-filter">
            <select className="im-select"
              value={buildingFilter}
              onChange={e => { setBuildingFilter(e.target.value); setSelected(null); setImages([]) }}>
              <option value="all">Todos los edificios</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          <div className="im-sidebar-count">
            {visibleHotspots.length} hotspot{visibleHotspots.length !== 1 ? 's' : ''}
          </div>

          <div className="im-hotspot-list">
            {visibleHotspots.length === 0 ? (
              <div className="im-empty-small">Sin hotspots</div>
            ) : visibleHotspots.map(h => (
              <button
                key={h.id}
                className={`im-hotspot-item ${selected?.id === h.id ? 'im-hotspot-item--active' : ''}`}
                onClick={() => loadImages(h)}
              >
                <span className="im-hotspot-name">{h.name}</span>
                <span className="im-hotspot-meta">{h.building_code} · Piso {h.floor}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Panel derecho — galería */}
        <div className="im-gallery-panel">
          {!selected && (
            <div className="im-placeholder">
              <IconGallery />
              <p>Selecciona un hotspot para ver y gestionar sus imágenes.</p>
            </div>
          )}

          {selected && loadingImg && (
            <div className="im-loading">
              <div className="im-spinner" />
              <span>Cargando imágenes…</span>
            </div>
          )}

          {selected && !loadingImg && (
            <>
              <div className="im-gallery-header">
                <div className="im-gallery-title-row">
                  <span className="im-gallery-name">{selected.name}</span>
                  <span className="im-tag">{selected.building_code}</span>
                  <span className="im-gallery-count">
                    {images.length} imagen{images.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>

              {images.length === 0 ? (
                <div className="im-placeholder">
                  <IconImage />
                  <p>Sin imágenes. Usa "+ Agregar imagen" para comenzar.</p>
                </div>
              ) : (
                <div className="im-grid">
                  {images.map((img, i) => (
                    <div key={img.id} className="im-card">
                      <div className="im-thumb-wrap">
                        <img
                          src={img.url}
                          alt={img.alt_text || ''}
                          className="im-thumb"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                        {i === 0 && (
                          <span className="im-principal-badge">Principal</span>
                        )}
                        <span className="im-order-badge">#{i + 1}</span>
                      </div>

                      <div className="im-card-body">
                        <p className="im-card-url" title={img.url}>{img.url}</p>
                        {img.alt_text && (
                          <p className="im-card-alt">{img.alt_text}</p>
                        )}
                        <div className="im-card-actions">
                          <button
                            className="im-order-btn"
                            onClick={() => moveOrder(img, -1)}
                            disabled={i === 0}
                            title="Subir"
                            aria-label="Mover arriba">
                            <IconArrowUp />
                          </button>
                          <button
                            className="im-order-btn"
                            onClick={() => moveOrder(img, 1)}
                            disabled={i === images.length - 1}
                            title="Bajar"
                            aria-label="Mover abajo">
                            <IconArrowDown />
                          </button>
                          <button
                            className="im-delete-btn"
                            onClick={() => setModal({ type: 'delete', id: img.id })}
                            title="Eliminar"
                            aria-label="Eliminar imagen">
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Agregar */}
      {modal?.type === 'add' && (
        <Modal title="Agregar imagen" onConfirm={confirmAdd} confirmLabel="Agregar" onClose={() => setModal(null)}>
          <div className="im-form">
            <div className="im-field">
              <label className="im-label">URL de la imagen <span className="im-required">*</span></label>
              <input className="im-input" placeholder="https://... o /images/foto.jpg"
                value={form.url || ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="im-field">
              <label className="im-label">Texto alternativo</label>
              <input className="im-input" placeholder="Descripción de la imagen"
                value={form.alt_text || ''} onChange={e => setForm(f => ({ ...f, alt_text: e.target.value }))} />
            </div>
            <div className="im-field">
              <label className="im-label">Orden <span className="im-label-hint">(0 = principal)</span></label>
              <input className="im-input" type="number" min="0" value={form.sort_order ?? 0}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Eliminar */}
      {modal?.type === 'delete' && (
        <Modal title="Eliminar imagen" onConfirm={confirmDelete} confirmLabel="Eliminar" danger onClose={() => setModal(null)}>
          <div className="im-delete-confirm">
            <div className="im-delete-icon"><IconTrash /></div>
            <p className="im-delete-text">¿Eliminar esta imagen del hotspot?</p>
            <p className="im-delete-warning">Esta acción no se puede deshacer.</p>
          </div>
        </Modal>
      )}

      {toast && (
        <div className={`im-toast ${toast.type === 'error' ? 'im-toast--error' : 'im-toast--success'}`}>
          {toast.type === 'error' ? <IconAlert /> : <IconCheck />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
function IconPlus()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IconX()         { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconTrash()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function IconCheck()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> }
function IconAlert()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg> }
function IconArrowUp()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> }
function IconArrowDown() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> }
function IconGallery()   { return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> }
function IconImage()     { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> }