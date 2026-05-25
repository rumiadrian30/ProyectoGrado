import { useState, useEffect } from 'react'
import { api, fmt } from '../api'
import PasswordInput, { isPasswordValid } from '../components/PasswordInput'

function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose, disabled = false }) {
  return (
    <div className="overlay" onClick={e => e.target.className === 'overlay' && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={disabled || !onConfirm}
            style={disabled || !onConfirm ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers({ currentUser }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [toast,   setToast]   = useState(null)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState({})
  const [pwd,     setPwd]     = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [pwdErrors, setPwdErrors] = useState([])
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try { setUsers(await api('GET', '/admin-users')) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  async function confirmCreate() {
    setPwdErrors([])
    if (!form.full_name?.trim() || !form.email?.trim() || !pwd) {
      return showToast('Nombre, correo y contraseña son obligatorios.', 'error')
    }
    if (!isPasswordValid(pwd)) {
      return showToast('La contraseña no cumple todos los requisitos.', 'error')
    }
    try {
      await api('POST', '/admin-users', { ...form, password: pwd })
      setModal(null); setPwd('')
      showToast('Usuario creado correctamente.')
      load()
    } catch (e) {
      if (e.data?.passwordErrors) { setPwdErrors(e.data.passwordErrors) }
      showToast(e.message, 'error')
    }
  }

  async function confirmToggle() {
    try {
      await api('PATCH', `/admin-users/${modal.id}/toggle`)
      setModal(null)
      showToast(`Usuario ${modal.isActive ? 'desactivado' : 'activado'}.`)
      load()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function confirmReset() {
    setPwdErrors([])
    if (!isPasswordValid(newPwd)) {
      return showToast('La contraseña no cumple todos los requisitos.', 'error')
    }
    try {
      await api('PATCH', `/admin-users/${modal.id}/reset-password`, { new_password: newPwd })
      setModal(null); setNewPwd('')
      showToast('Contraseña actualizada correctamente.')
    } catch (e) {
      if (e.data?.passwordErrors) { setPwdErrors(e.data.passwordErrors) }
      showToast(e.message, 'error')
    }
  }

  async function confirmDelete() {
    try {
      await api('DELETE', `/admin-users/${modal.id}`)
      setModal(null)
      showToast(`Usuario "${modal.name}" eliminado permanentemente.`, 'success')
      load()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="loader">Cargando…</div>
  if (error)   return <div className="alert alert-error">{error}</div>

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Usuarios administradores</div>
          <div className="page-sub">{users.length} usuario{users.length !== 1 ? 's' : ''} registrados</div>
        </div>
        <button className="btn btn-primary btn-sm"
          onClick={() => { setForm({ role:'admin' }); setPwd(''); setPwdErrors([]); setModal({ type:'new' }) }}>
          + Nuevo usuario
        </button>
      </div>

      <div className="card card-flush">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Correo</th><th>Rol</th>
                <th>Estado</th><th>Último acceso</th><th>Creado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--espoch)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'#fff', fontSize:'10px', fontWeight:700, flexShrink:0 }}>
                        {(u.full_name||'A').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight:500, fontSize:'13px' }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:'12px', color:'var(--muted)' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'superadmin' ? 'b-purple' : 'b-blue'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.is_active
                      ? <span style={{ color:'var(--success)', fontSize:'12px' }}>● Activo</span>
                      : <span style={{ color:'var(--danger)',  fontSize:'12px' }}>● Inactivo</span>
                    }
                  </td>
                  <td style={{ fontSize:'11px', color:'var(--faint)' }}>
                    {u.last_login ? fmt(u.last_login) : 'Nunca'}
                  </td>
                  <td style={{ fontSize:'11px', color:'var(--faint)' }}>{fmt(u.created_at)}</td>
                  <td>
                    <div style={{ display:'flex', gap:'4px' }}>
                      <button className="btn btn-sm" title="Resetear contraseña"
                        onClick={() => { setNewPwd(''); setPwdErrors([]); setModal({ type:'reset', id: u.id, name: u.full_name }) }}>
                        🔑
                      </button>
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : ''}`}
                        title={u.is_active ? 'Desactivar' : 'Activar'}
                        disabled={u.id === currentUser?.id}
                        onClick={() => setModal({ type:'toggle', id: u.id, name: u.full_name, isActive: u.is_active })}>
                        {u.is_active ? '⊘' : '✓'}
                      </button>
                      {/* Eliminar — solo superadmin, no a sí mismo */}
                      {currentUser?.role === 'superadmin' && u.id !== currentUser?.id && (
                        <button
                          className="btn btn-sm"
                          title="Eliminar usuario permanentemente"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => { setDeleteConfirmText(''); setModal({ type:'delete', id: u.id, name: u.full_name, email: u.email, role: u.role }) }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo usuario */}
      {modal?.type === 'new' && (
        <Modal title="Crear usuario administrador"
          onConfirm={confirmCreate} confirmLabel="Crear usuario"
          onClose={() => setModal(null)}>

          {pwdErrors.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom:'10px' }}>
              {pwdErrors.map((e,i) => <div key={i}>• {e}</div>)}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nombre completo *</label>
            <input className="form-input" value={form.full_name || ''}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Correo institucional *</label>
            <input className="form-input" type="email" placeholder="usuario@espoch.edu.ec"
              value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          <PasswordInput value={pwd} onChange={setPwd} label="Contraseña *" />

          <div className="form-group">
            <label className="form-label">Rol *</label>
            <select className="form-select" value={form.role || 'admin'}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="admin">admin — Gestión de contenidos</option>
              <option value="superadmin">superadmin — Acceso completo</option>
            </select>
          </div>
        </Modal>
      )}

      {/* Modal toggle */}
      {modal?.type === 'toggle' && (
        <Modal title={modal.isActive ? 'Desactivar usuario' : 'Activar usuario'}
          onConfirm={confirmToggle}
          confirmLabel={modal.isActive ? 'Desactivar' : 'Activar'}
          danger={modal.isActive}
          onClose={() => setModal(null)}>
          <p style={{ textAlign:'center', fontSize:'13px' }}>
            ¿{modal.isActive ? 'Desactivar' : 'Activar'} la cuenta de <strong>{modal.name}</strong>?
          </p>
        </Modal>
      )}

      {/* Modal reset password */}
      {modal?.type === 'reset' && (
        <Modal title={`Resetear contraseña — ${modal.name}`}
          onConfirm={confirmReset} confirmLabel="Actualizar contraseña"
          onClose={() => setModal(null)}>

          {pwdErrors.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom:'10px' }}>
              {pwdErrors.map((e,i) => <div key={i}>• {e}</div>)}
            </div>
          )}

          <PasswordInput value={newPwd} onChange={setNewPwd} label="Nueva contraseña *" />
        </Modal>
      )}

      {/* Modal eliminación permanente */}
      {modal?.type === 'delete' && (() => {
        const CONFIRM_WORD = 'ELIMINAR'
        const canDelete = deleteConfirmText === CONFIRM_WORD
        return (
          <Modal title="Eliminar usuario permanentemente"
            onConfirm={canDelete ? confirmDelete : undefined}
            confirmLabel="Eliminar permanentemente"
            danger
            onClose={() => setModal(null)}>

            <div className="alert alert-error" style={{ marginBottom: '12px', fontSize: '13px' }}>
              Esta acción es <strong>irreversible</strong>. El usuario y sus credenciales
              serán eliminados definitivamente de la base de datos.
            </div>

            <div style={{ background: 'var(--bg-soft, #f8fafc)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '13px' }}>
              <div><span style={{ color: 'var(--muted)' }}>Nombre:</span> <strong>{modal.name}</strong></div>
              <div><span style={{ color: 'var(--muted)' }}>Correo:</span> {modal.email}</div>
              <div><span style={{ color: 'var(--muted)' }}>Rol:</span> <span className={`badge ${modal.role === 'superadmin' ? 'b-purple' : 'b-blue'}`}>{modal.role}</span></div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>
                Para confirmar, escribe <strong style={{ letterSpacing: '0.05em' }}>{CONFIRM_WORD}</strong> en el campo:
              </label>
              <input
                className="form-input"
                placeholder={CONFIRM_WORD}
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: '13px',
                  borderColor: canDelete ? 'var(--danger)' : undefined }}
                autoFocus
              />
            </div>

            {/* Sobrescribir el botón confirm con disabled visual cuando no coincide */}
            {!canDelete && (
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                El botón se habilitará cuando escribas la palabra exacta.
              </p>
            )}
          </Modal>
        )
      })()}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </>
  )
}