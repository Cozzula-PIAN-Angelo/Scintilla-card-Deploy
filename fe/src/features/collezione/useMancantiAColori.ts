import { useCallback, useState } from 'react'

const CHIAVE = 'scintilla.mancantiAColori'

function salvato(): boolean {
  try {
    return localStorage.getItem(CHIAVE) === 'si'
  } catch {
    return false
  }
}

// carte non possedute a colori invece che in grigio, nelle pagine dei set e dei Pokémon. La scelta vale per tutte
// le pagine e resta salvata nel browser; senza storage parte spenta (mancanti in grigio)
export function useMancantiAColori() {
  const [aColori, setAColori] = useState(salvato)

  const alterna = useCallback(() => {
    setAColori((attuale) => {
      const nuovo = !attuale
      try {
        if (nuovo) localStorage.setItem(CHIAVE, 'si')
        else localStorage.removeItem(CHIAVE)
      } catch {
        // storage non disponibile: la scelta vale solo per questa pagina
      }
      return nuovo
    })
  }, [])

  return { aColori, alterna }
}
