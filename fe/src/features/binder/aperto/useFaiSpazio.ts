import { useCallback, useState } from 'react'

const CHIAVE = 'scintilla.binder.faiSpazio'

function leggi() {
  try {
    return localStorage.getItem(CHIAVE) === 'true'
  } catch {
    return false
  }
}

// interruttore "Fai spazio" del binder aperto, ricordato nel browser; spento di default
export function useFaiSpazio(): [boolean, (acceso: boolean) => void] {
  const [acceso, setAcceso] = useState(leggi)
  const imposta = useCallback((valore: boolean) => {
    setAcceso(valore)
    try {
      localStorage.setItem(CHIAVE, String(valore))
    } catch {
      // senza localStorage vale solo finché la pagina resta aperta
    }
  }, [])
  return [acceso, imposta]
}
