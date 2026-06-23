// Admin Frontend/src/pages/Images.jsx
import { useState, useEffect, useRef } from 'react'
import { api, API } from '../api'

const ALLOWED_EXT  = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const MAX_SIZE_MB  = 5
const MAX_SIZE_B   = MAX_SIZE_MB * 1024 * 1024

function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose, disabled = false }) {
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
          <button className={`im-btn ${danger ? 'im-btn--danger' : 'im-btn--primary'}`} onClick={onConfirm} disabled={disabled}>
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

  // Estado del upload de imagen
  const [uploading,    setUploading]    = useState(false)
  const [uploadPct,    setUploadPct]    = useState(0)
  const [fileError,    setFileError]    = useState(null)
  const [filePreview,  setFilePreview]  = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [lightbox,     setLightbox]     = useState(null)
  const fileInputRef = useRef(null)

  // Navegación por teclado en lightbox
  useEffect(() => {
    if (!lightbox) return
    const handler = e => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox(lb => lb.index < images.length - 1
        ? { url: images[lb.index + 1].url, alt: images[lb.index + 1].alt_text || '', index: lb.index + 1 }
        : lb)
      if (e.key === 'ArrowLeft') setLightbox(lb => lb.index > 0
        ? { url: images[lb.index - 1].url, alt: images[lb.index - 1].alt_text || '', index: lb.index - 1 }
        : lb)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, images])

  function openLightbox(img, index) {
    setLightbox({ url: img.url, alt: img.alt_text || '', index })
  }

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

  function openAddModal() {
    setForm({ sort_order: images.length })
    setFileError(null)
    setFilePreview(null)
    setUploadPct(0)
    setModal({ type: 'add' })
  }

  // Validación del archivo antes de subir
  function validateFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) {
      return `Formato no permitido: ${ext}. Solo se aceptan ${ALLOWED_EXT.join(', ')}.`
    }
    if (file.size > MAX_SIZE_B) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      return `El archivo pesa ${sizeMB} MB. El máximo permitido es ${MAX_SIZE_MB} MB.`
    }
    return null
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Limpiar estado previo SIN cerrar el modal ni limpiar alt_text/sort_order
    setFileError(null)
    setFilePreview(null)
    setForm(f => ({ ...f, url: '' }))

    const err = validateFile(file)
    if (err) {
      setFileError(err)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Preview local inmediato
    setFilePreview(URL.createObjectURL(file))

    // Subir al servidor
    setUploading(true)
    setUploadPct(0)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API}/images/upload`)
        xhr.withCredentials = true
        xhr.setRequestHeader('X-Client-App', 'admin')
        const storedToken = sessionStorage.getItem('admin_token')
        if (storedToken) {
          try {
            // encryptedStorage puede devolver valor cifrado; intentar leer directamente
            xhr.setRequestHeader('Authorization', 'Bearer ' + JSON.parse(atob(storedToken.split('.')[1] || '') || '{}'))
          } catch { /* si falla, la cookie httpOnly cubre la auth */ }
        }
        xhr.upload.onprogress = ev => {
          if (ev.lengthComputable) setUploadPct(Math.round(ev.loaded / ev.total * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error)) }
            catch { reject(new Error(`Error ${xhr.status}`)) }
          }
        }
        xhr.onerror = () => reject(new Error('Error de red al subir la imagen.'))
        xhr.send(formData)
      })
      setForm(f => ({ ...f, url: result.url }))
    } catch (err) {
      setFileError(err.message)
      setFilePreview(null)
    } finally {
      setUploading(false)
      setUploadPct(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function clearFile() {
    setForm(f => ({ ...f, url: '' }))
    setFilePreview(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function confirmAdd() {
    if (!form.url?.trim()) {
      setFileError('Selecciona una imagen antes de continuar.')
      return
    }
    setSaving(true)
    try {
      await api('POST', '/images', { hotspot_id: selected.id, ...form })
      setModal(null)
      showToast('Imagen agregada correctamente.')
      loadImages(selected)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
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
          <button className="im-btn im-btn--primary" onClick={openAddModal}>
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
                  <p>Sin imágenes. Usa &quot;+ Agregar imagen&quot; para comenzar.</p>
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
                            className="im-order-btn im-view-btn"
                            onClick={() => openLightbox(img, i)}
                            title="Ver imagen"
                            aria-label="Ver imagen">
                            <IconEye />
                          </button>
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
        <Modal
          title="Agregar imagen"
          onConfirm={confirmAdd}
          confirmLabel={saving ? 'Guardando…' : 'Agregar'}
          disabled={!form.url || uploading || saving}
          onClose={() => { setModal(null); clearFile() }}>

          <div className="im-form">
            {/* Picker de archivo */}
            <div className="im-field">
              <label className="im-label">
                Imagen <span className="im-required">*</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXT.join(',')}
                className="im-file-hidden"
                onChange={handleFileChange}
              />

              {/* Estado: sin archivo ni error */}
              {!form.url && !uploading && !fileError && (
                <button
                  type="button"
                  className="im-btn im-btn--primary im-btn--full"
                  onClick={() => fileInputRef.current?.click()}>
                  <IconUpload /> Seleccionar imagen
                </button>
              )}

              {/* Estado: subiendo */}
              {uploading && (
                <div className="im-upload-progress">
                  <span className="im-upload-label">Subiendo… {uploadPct}%</span>
                  <div className="im-progress-track">
                    <div className="im-progress-bar" style={{ width: `${uploadPct}%` }} />
                  </div>
                </div>
              )}

              {/* Estado: archivo subido con éxito */}
              {form.url && !uploading && (
                <div className="im-file-ok">
                  {filePreview && (
                    <img
                      src={filePreview}
                      alt="Vista previa"
                      className="im-file-preview-thumb"
                    />
                  )}
                  <div className="im-file-ok-info">
                    <span className="im-file-ok-title"><IconCheck /> Imagen subida</span>
                    <span className="im-file-ok-path">{form.url}</span>
                  </div>
                  <button
                    type="button"
                    className="im-btn im-btn--ghost im-btn--sm"
                    onClick={() => { clearFile(); fileInputRef.current?.click() }}>
                    Cambiar
                  </button>
                </div>
              )}

              {/* Error inline — NO limpia el resto del formulario */}
              {fileError && (
                <div className="im-file-error">
                  <IconAlert />
                  <span>{fileError}</span>
                  <button
                    type="button"
                    className="im-btn im-btn--ghost im-btn--sm"
                    onClick={() => { setFileError(null); fileInputRef.current?.click() }}>
                    Reintentar
                  </button>
                </div>
              )}

              <span className="im-field-hint">
                Máx. {MAX_SIZE_MB} MB · Formatos: {ALLOWED_EXT.join(', ')}
              </span>
            </div>

            <div className="im-field">
              <label className="im-label">Texto alternativo</label>
              <input
                className="im-input"
                placeholder="Descripción de la imagen"
                value={form.alt_text || ''}
                onChange={e => setForm(f => ({ ...f, alt_text: e.target.value }))}
              />
            </div>

            <div className="im-field">
              <label className="im-label">
                Orden <span className="im-label-hint">(0 = principal)</span>
              </label>
              <input
                className="im-input"
                type="number"
                min="0"
                value={form.sort_order ?? 0}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))}
              />
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

      {/* Lightbox */}
      {lightbox && (
        <div className="im-lightbox" onClick={() => setLightbox(null)}>
          <button className="im-lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar">
            <IconX />
          </button>

          {lightbox.index > 0 && (
            <button className="im-lightbox-nav im-lightbox-nav--prev"
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({
                url: images[lb.index - 1].url,
                alt: images[lb.index - 1].alt_text || '',
                index: lb.index - 1,
              })) }}
              aria-label="Anterior">
              <IconArrowLeft />
            </button>
          )}

          <div className="im-lightbox-body" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.alt} className="im-lightbox-img" />
            {lightbox.alt && <p className="im-lightbox-caption">{lightbox.alt}</p>}
            <p className="im-lightbox-counter">
              {lightbox.index + 1} / {images.length}
            </p>
          </div>

          {lightbox.index < images.length - 1 && (
            <button className="im-lightbox-nav im-lightbox-nav--next"
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({
                url: images[lb.index + 1].url,
                alt: images[lb.index + 1].alt_text || '',
                index: lb.index + 1,
              })) }}
              aria-label="Siguiente">
              <IconArrowRight />
            </button>
          )}
        </div>
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
function IconArrowLeft() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> }
function IconArrowRight(){ return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> }
function IconEye()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function IconGallery()   { return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> }
function IconImage()     { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> }
function IconUpload()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> }