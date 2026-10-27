import { useCallback, useState } from 'react'

export type VistaPokedex = 'scheda' | 'griglia'

const CHIAVE = 'scintilla.pokedex.vista'

function leggi(): VistaPokedex {
  try {
    return localStorage.getItem(CHIAVE) === 'griglia' ? 'griglia' : 'scheda'
  } catch {
    return 'scheda'
  }
}

// vista dell'indice ricordata nel browser: la scheda dei giochi di default, la griglia per vederli tutti insieme
export function useVistaPokedex(): [VistaPokedex, (vista: VistaPokedex) => void] {
  const [vista, setVista] = useState(leggi)
  const imposta = useCallback((valore: VistaPokedex) => {
    setVista(valore)
    try {
      localStorage.setItem(CHIAVE, valore)
    } catch {
      // senza localStorage vale solo finché la pagina resta aperta
    }
  }, [])
  return [vista, imposta]
}
