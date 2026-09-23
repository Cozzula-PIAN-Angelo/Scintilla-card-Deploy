import { useEffect, useState } from 'react'

export function useScrollato(soglia: number): boolean {
  const [scrollato, setScrollato] = useState(false)

  useEffect(() => {
    const aggiorna = () => setScrollato(window.scrollY > soglia)
    aggiorna()
    window.addEventListener('scroll', aggiorna, { passive: true })
    return () => window.removeEventListener('scroll', aggiorna)
  }, [soglia])

  return scrollato
}
