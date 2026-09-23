import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [corrisponde, setCorrisponde] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const aggiorna = () => setCorrisponde(media.matches)
    aggiorna()
    media.addEventListener('change', aggiorna)
    return () => media.removeEventListener('change', aggiorna)
  }, [query])

  return corrisponde
}
