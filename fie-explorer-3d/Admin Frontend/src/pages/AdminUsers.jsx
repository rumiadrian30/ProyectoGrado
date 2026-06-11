import { useState, useEffect } from 'react'
import { api, fmt } from '../api'
import PasswordInput, { isPasswordValid } from '../components/PasswordInput'

function Modal({ title, children, onConfirm, confirmLabel = 'Guardar', danger = false, onClose, disabled = false }) {
  return (
    <div className="au-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="au-modal">
        <div className="au-modal-header">
          <h3 className="au-modal-title">{title}</h3>
          <button className="au-modal-close" onClick={onClose} aria-label="Cerrar"><IconX /></button>
        </div>
        <div className="au-modal-body">{children}</div>
        <div className="au-modal-footer">
          <button className="au-btn au-btn--ghost" onClick={onClose}>Cancelar</button>
          <button
            className={`au-btn ${danger ? 'au-btn--danger' : 'au-btn--primary'}`}
            onClick={onConfirm}
            disabled={disabled || !onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function Avatar({ name }) {
  const initials = (name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return <div className="au-avatar">{initials}</div>
}

function NotifyOption({ checked, onChange, actionText }) {
  return (
    <label className="au-notify-option">
      <input
        type="checkbox"
        className="au-notify-checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />

      <span className="au-notify-control" aria-hidden="true">
        <IconCheck />
      </span>

      <span className="au-notify-content">
        <span className="au-notify-title">
          Enviar notificación por correo
        </span>

        <span className="au-notify-description">
          Informar al usuario que su cuenta {actionText}.
        </span>
      </span>
    </label>
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
  const [pwdErrors, setPwdErrors]           = useState([])
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [notifyUser, setNotifyUser] = useState(true)

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
    if (!form.full_name?.trim() || !form.email?.trim() || !pwd)
      return showToast('Nombre, correo y contraseña son obligatorios.', 'error')
    if (!isPasswordValid(pwd))
      return showToast('La contraseña no cumple todos los requisitos.', 'error')
    try {
      await api('POST', '/admin-users', { ...form, password: pwd })
      setModal(null); setPwd('')
      showToast('Usuario creado correctamente.'); load()
    } catch (e) {
      if (e.data?.passwordErrors) setPwdErrors(e.data.passwordErrors)
      showToast(e.message, 'error')
    }
  }

  async function confirmToggle() {
    try {
      const result = await api(
        'PATCH',
        `/admin-users/${modal.id}/toggle`,
        { notify: notifyUser }
      )
      setModal(null)
      showToast(
        result.notificationRequested
          ? `Usuario ${modal.isActive ? 'desactivado' : 'activado'} y notificación solicitada.`
          : `Usuario ${modal.isActive ? 'desactivado' : 'activado'} sin enviar notificación.`
      )
      load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function confirmReset() {
    setPwdErrors([])
    if (!isPasswordValid(newPwd))
      return showToast('La contraseña no cumple todos los requisitos.', 'error')

    try {
      const result = await api(
        'PATCH',
        `/admin-users/${modal.id}/reset-password`,
        {
          new_password: newPwd,
          notify: notifyUser,
        }
      )

      setModal(null)
      setNewPwd('')

      showToast(
        result.notificationRequested
          ? 'Contraseña actualizada y notificación solicitada.'
          : 'Contraseña actualizada sin enviar notificación.'
      )
    } catch (e) {
      if (e.data?.passwordErrors) setPwdErrors(e.data.passwordErrors)
      showToast(e.message, 'error')
    }
  }

  async function confirmDelete() {
    try {
      const result = await api(
        'DELETE',
        `/admin-users/${modal.id}?notify=${notifyUser}`
      )

      setModal(null)

      showToast(
        result.notificationRequested
          ? `Usuario "${modal.name}" eliminado y notificación solicitada.`
          : `Usuario "${modal.name}" eliminado sin enviar notificación.`
      )

      load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  if (loading) return (
    <div className="au-loading"><div className="au-spinner" /><span>Cargando usuarios…</span></div>
  )
  if (error) return (
    <div className="au-error-alert"><IconAlert /><span>{error}</span></div>
  )

  const activeCount   = users.filter(u => u.is_active).length
  const inactiveCount = users.length - activeCount

  return (
    <div className="au-root">

      {/* Header */}
      <div className="au-page-hdr">
        <div>
          <h2 className="au-page-title">Usuarios administradores</h2>
          <p className="au-page-sub">
            {users.length} usuario{users.length !== 1 ? 's' : ''} ·{' '}
            {activeCount} activo{activeCount !== 1 ? 's' : ''} ·{' '}
            {inactiveCount} inactivo{inactiveCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="au-btn au-btn--primary"
          onClick={() => { setForm({ role: 'admin' }); setPwd(''); setPwdErrors([]); setModal({ type: 'new' }) }}>
          <IconPlus /> Nuevo usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="au-table-wrap">
        <table className="au-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const isSelf = u.id === currentUser?.id
              return (
                <tr key={u.id} className={`au-row ${!u.is_active ? 'au-row--inactive' : ''}`}>

                  <td>
                    <div className="au-user-cell">
                      <Avatar name={u.full_name} />
                      <div>
                        <span className="au-user-name">{u.full_name}</span>
                        {isSelf && <span className="au-self-badge">Tú</span>}
                      </div>
                    </div>
                  </td>

                  <td className="au-cell-email">{u.email}</td>

                  <td>
                    <span className={`au-role-badge ${u.role === 'superadmin' ? 'au-role-badge--super' : 'au-role-badge--admin'}`}>
                      {u.role}
                    </span>
                  </td>

                  <td>
                    <span className={`au-status ${u.is_active ? 'au-status--active' : 'au-status--inactive'}`}>
                      <span className="au-status-dot" />
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td className="au-cell-time">
                    {u.last_login ? fmt(u.last_login) : <span className="au-never">Nunca</span>}
                  </td>

                  <td className="au-cell-time">{fmt(u.created_at)}</td>

                  <td>
                    <div className="au-actions">
                      <button className="au-action-btn" title="Resetear contraseña"
                        onClick={() => {
                          setNewPwd('')
                          setPwdErrors([])
                          setNotifyUser(true)
                          setModal({ type: 'reset', id: u.id, name: u.full_name })
                        }}>
                        <IconKey />
                      </button>
                      <button
                        className={`au-action-btn ${u.is_active ? 'au-action-btn--warn' : 'au-action-btn--ok'}`}
                        title={u.is_active ? 'Desactivar' : 'Activar'}
                        disabled={isSelf}
                        onClick={() => {
                          setNotifyUser(true)
                          setModal({ type: 'toggle', id: u.id, name: u.full_name, isActive: u.is_active })
                        }}>
                        {u.is_active ? <IconPause /> : <IconPlay />}
                      </button>
                      {currentUser?.role === 'superadmin' && !isSelf && (
                        <button
                          className="au-action-btn au-action-btn--danger"
                          title="Eliminar usuario permanentemente"
                          onClick={() => {
                            setDeleteConfirmText('')
                            setNotifyUser(true)
                            setModal({ type: 'delete', id: u.id, name: u.full_name, email: u.email, role: u.role })
                          }}>
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Nuevo usuario */}
      {modal?.type === 'new' && (
        <Modal title="Crear usuario administrador"
          onConfirm={confirmCreate} confirmLabel="Crear usuario"
          onClose={() => setModal(null)}>
          <div className="au-form">
            {pwdErrors.length > 0 && (
              <div className="au-alert au-alert--error">
                {pwdErrors.map((e, i) => <div key={i}>· {e}</div>)}
              </div>
            )}
            <div className="au-field">
              <label className="au-label">Nombre completo <span className="au-required">*</span></label>
              <input className="au-input" value={form.full_name || ''}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="au-field">
              <label className="au-label">Correo institucional <span className="au-required">*</span></label>
              <input className="au-input" type="email" placeholder="usuario@espoch.edu.ec"
                value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <PasswordInput value={pwd} onChange={setPwd} label="Contraseña *" />
            <div className="au-field">
              <label className="au-label">Rol <span className="au-required">*</span></label>
              <select className="au-input" value={form.role || 'admin'}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">admin — Gestión de contenidos</option>
                <option value="superadmin">superadmin — Acceso completo</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Toggle */}
      {modal?.type === 'toggle' && (
        <Modal
          title={modal.isActive ? 'Desactivar usuario' : 'Activar usuario'}
          onConfirm={confirmToggle}
          confirmLabel={modal.isActive ? 'Desactivar' : 'Activar'}
          danger={modal.isActive}
          onClose={() => setModal(null)}>
          <div className="au-confirm-body">
            <div className={`au-confirm-icon ${modal.isActive ? 'au-confirm-icon--warn' : 'au-confirm-icon--ok'}`}>
              {modal.isActive ? <IconPause /> : <IconPlay />}
            </div>
            <p className="au-confirm-text">
              ¿{modal.isActive ? 'Desactivar' : 'Activar'} la cuenta de <strong>{modal.name}</strong>?
            </p>
            {modal.isActive && (
              <p className="au-confirm-hint">El usuario no podrá iniciar sesión mientras esté desactivado.</p>
            )}
          </div>

          <NotifyOption
            checked={notifyUser}
            onChange={setNotifyUser}
            actionText={modal.isActive ? 'fue desactivada' : 'fue reactivada'}
          />
        </Modal>
      )}

      {/* Modal: Reset contraseña */}
      {modal?.type === 'reset' && (
        <Modal title={`Resetear contraseña`}
          onConfirm={confirmReset} confirmLabel="Actualizar contraseña"
          onClose={() => setModal(null)}>
          <div className="au-form">
            <div className="au-reset-target">
              <Avatar name={modal.name} />
              <span className="au-reset-name">{modal.name}</span>
            </div>
            {pwdErrors.length > 0 && (
              <div className="au-alert au-alert--error">
                {pwdErrors.map((e, i) => <div key={i}>· {e}</div>)}
              </div>
            )}
            <PasswordInput value={newPwd} onChange={setNewPwd} label="Nueva contraseña *" />

            <NotifyOption
              checked={notifyUser}
              onChange={setNotifyUser}
              actionText="tuvo un cambio de contraseña"
            />
          </div>
        </Modal>
      )}

      {/* Modal: Eliminar */}
      {modal?.type === 'delete' && (() => {
        const CONFIRM_WORD = 'ELIMINAR'
        const canDelete    = deleteConfirmText === CONFIRM_WORD
        return (
          <Modal title="Eliminar usuario permanentemente"
            onConfirm={canDelete ? confirmDelete : undefined}
            confirmLabel="Eliminar permanentemente"
            danger
            onClose={() => setModal(null)}>
            <div className="au-form">
              <div className="au-alert au-alert--error">
                Esta acción es <strong>irreversible</strong>. El usuario y sus credenciales
                serán eliminados definitivamente de la base de datos.
              </div>

              <div className="au-delete-user-card">
                <Avatar name={modal.name} />
                <div className="au-delete-user-info">
                  <span className="au-user-name">{modal.name}</span>
                  <span className="au-cell-email">{modal.email}</span>
                  <span className={`au-role-badge ${modal.role === 'superadmin' ? 'au-role-badge--super' : 'au-role-badge--admin'}`}>
                    {modal.role}
                  </span>
                </div>
              </div>

              <NotifyOption
                checked={notifyUser}
                onChange={setNotifyUser}
                actionText="fue eliminada permanentemente"
              />

              <div className="au-field">
                <label className="au-label">
                  Para confirmar, escribe <code className="au-confirm-code">{CONFIRM_WORD}</code>
                </label>
                <input
                  className={`au-input au-input--mono ${canDelete ? 'au-input--confirmed' : ''}`}
                  placeholder={CONFIRM_WORD}
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                  autoFocus
                />
                {!canDelete && (
                  <span className="au-field-hint">El botón se habilitará cuando escribas la palabra exacta.</span>
                )}
              </div>
            </div>
          </Modal>
        )
      })()}

      {toast && (
        <div className={`au-toast ${toast.type === 'error' ? 'au-toast--error' : 'au-toast--success'}`}>
          {toast.type === 'error' ? <IconAlert /> : <IconCheck />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

/* ── Icons ──────────────────────────────────────────────────── */
function IconPlus()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function IconX()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function IconKey()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> }
function IconTrash() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function IconCheck() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> }
function IconPause() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/></svg> }
function IconPlay()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8"/></svg> }
function IconAlert() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg> }