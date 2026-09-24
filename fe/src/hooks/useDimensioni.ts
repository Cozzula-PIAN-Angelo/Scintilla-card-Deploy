import { useLayoutEffect, useState } from 'react'

// Dimensioni del contenuto di un elemento, aggiornate a ogni ridimensionamento.
// Si usa con ref={misura}: una ref-funzione segue l'elemento anche se viene rimontato.
// Prima misura sincrona (useLayoutEffect): al primo disegno sono già quelle vere
export function useDimensioni<T extends HTMLElement>() {
  const [elemento, misura] = useState<T | null>(null)
  const [dimensioni, setDimensioni] = useState({ larghezza: 0, altezza: 0 })

  useLayoutEffect(() => {
    if (!elemento) return
    const aggiorna = () => setDimensioni({ larghezza: elemento.clientWidth, altezza: elemento.clientHeight })
    aggiorna()
    const osservatore = new ResizeObserver(aggiorna)
    osservatore.observe(elemento)
    return () => osservatore.disconnect()
  }, [elemento])

  return [misura, dimensioni] as const
}
