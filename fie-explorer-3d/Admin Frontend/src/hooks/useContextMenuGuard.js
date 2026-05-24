/**
 * useContextMenuGuard.js
 */

import { useEffect } from 'react'

export function useContextMenuGuard() {
  useEffect(() => {
    let timeout

    function blockContextMenu(e) {
      e.preventDefault()

      // p evidencia en capturas
      const existing = document.getElementById('rc-block-msg')
      if (existing) return

      const msg = document.createElement('div')
      msg.id = 'rc-block-msg'
      msg.innerText = 'Clic derecho deshabilitado por seguridad'

      Object.assign(msg.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: '#111',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: '6px',
        zIndex: 9999,
        fontSize: '14px',
        opacity: '0.9'
      })

      document.body.appendChild(msg)

      timeout = setTimeout(() => {
        msg.remove()
      }, 1500)
    }

    document.addEventListener('contextmenu', blockContextMenu)

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu)
      clearTimeout(timeout)
    }
  }, [])
}