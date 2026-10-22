import { useLayoutEffect, type RefObject } from 'react'

// avvisi fissi in fondo alla finestra (barra della carta toccata, carta in mano): i toast salgono sopra di loro.
// --sopra-avvisi è lo spazio che occupano dal fondo, il più alto se ce n'è più d'uno: in un cambio
// (Sposta: la barra esce mentre l'avviso entra) per un attimo sono montati tutti e due
const occupati = new Map<object, number>()
const STACCO_PX = 12

function aggiorna() {
  const massimo = Math.max(0, ...occupati.values())
  if (massimo > 0) document.documentElement.style.setProperty('--sopra-avvisi', `${massimo}px`)
  else document.documentElement.style.removeProperty('--sopra-avvisi')
}

export function useSpazioAvviso(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const chiave = {}
    // offsetHeight e bottom calcolato non risentono della transform dell'animazione d'entrata
    const misura = () => {
      occupati.set(chiave, Number.parseFloat(getComputedStyle(elemento).bottom) + elemento.offsetHeight + STACCO_PX)
      aggiorna()
    }
    misura()
    // da telefono a sm la barra passa da due righe a una; "Ce l'ho" sparisce dopo l'uso
    const osservatore = new ResizeObserver(misura)
    osservatore.observe(elemento)
    return () => {
      osservatore.disconnect()
      occupati.delete(chiave)
      aggiorna()
    }
  }, [ref])
}
