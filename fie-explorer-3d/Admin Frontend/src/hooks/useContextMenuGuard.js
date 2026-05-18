/**
 * useContextMenuGuard.js
 * Hook React para el control global del menú contextual (clic derecho) en el
 * Admin Frontend de fie-explorer-3d.
 */

import { useEffect } from 'react'

// Activa el bloqueo global del menú contextual (clic derecho)
export function useContextMenuGuard() {
  useEffect(() => {
    function blockContextMenu(e) {
      e.preventDefault()
    }

    document.addEventListener('contextmenu', blockContextMenu)

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu)
    }
  }, []) 
}
