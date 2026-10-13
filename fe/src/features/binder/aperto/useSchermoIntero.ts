import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// a schermo intero il binder copre tutta la finestra
export function useSchermoIntero() {
  const [espanso, setEspanso] = useState(false)

  // uscendo con Esc o dai controlli del browser il binder torna al suo posto
  useEffect(() => {
    const cambio = () => {
      if (!document.fullscreenElement) setEspanso(false)
    }
    document.addEventListener('fullscreenchange', cambio)
    return () => {
      document.removeEventListener('fullscreenchange', cambio)
      if (document.fullscreenElement) void document.exitFullscreen()
    }
  }, [])

  function alternaEspanso() {
    if (espanso) {
      setEspanso(false)
      if (document.fullscreenElement) void document.exitFullscreen()
      return
    }
    setEspanso(true)
    // dove il browser non lo permette (es. iPhone) il binder copre comunque la pagina
    document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  const inPortale = (nodo: ReactNode) => (espanso ? createPortal(nodo, document.body) : nodo)

  return { espanso, alternaEspanso, inPortale }
}
