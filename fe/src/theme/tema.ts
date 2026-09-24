import { useCallback, useEffect, useState } from 'react'

export type Tema = 'chiaro' | 'scuro'

// la stessa chiave la legge lo script in index.html, che applica il tema prima del primo disegno
const CHIAVE_TEMA = 'scintilla.tema'
const QUERY_SCURO = '(prefers-color-scheme: dark)'

function temaSalvato(): Tema | null {
  try {
    const valore = localStorage.getItem(CHIAVE_TEMA)
    return valore === 'chiaro' || valore === 'scuro' ? valore : null
  } catch {
    return null
  }
}

function temaDiSistema(): Tema {
  return window.matchMedia(QUERY_SCURO).matches ? 'scuro' : 'chiaro'
}

function applica(tema: Tema) {
  document.documentElement.dataset.tema = tema
}

// senza una scelta esplicita segue il sistema operativo; dopo il primo clic vale la scelta salvata
export function useTema() {
  const [tema, setTema] = useState<Tema>(() => temaSalvato() ?? temaDiSistema())

  useEffect(() => applica(tema), [tema])

  useEffect(() => {
    const media = window.matchMedia(QUERY_SCURO)
    const aggiorna = () => {
      if (!temaSalvato()) setTema(temaDiSistema())
    }
    media.addEventListener('change', aggiorna)
    return () => media.removeEventListener('change', aggiorna)
  }, [])

  const alterna = useCallback(() => {
    setTema((attuale) => {
      const nuovo: Tema = attuale === 'scuro' ? 'chiaro' : 'scuro'
      try {
        localStorage.setItem(CHIAVE_TEMA, nuovo)
      } catch {
        // storage non disponibile: la scelta vale solo per questa sessione
      }
      return nuovo
    })
  }, [])

  return { tema, alterna }
}
