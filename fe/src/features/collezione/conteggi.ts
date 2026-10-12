import type { Copia, Oggetto, Variante } from '../../types/api'
import { piuPregiata } from './varianti'

// carta -> variante -> quantità (solo righe con almeno una copia)
export type MappaCopie = Map<string, Map<Variante, number>>
export type Filtro = 'tutte' | 'possedute' | 'mancanti'

export function creaMappa(copie: Copia[]): MappaCopie {
  const mappa: MappaCopie = new Map()
  for (const { oggettoId, variante, quantita } of copie) {
    if (quantita <= 0) continue
    const perVariante = mappa.get(oggettoId) ?? new Map<Variante, number>()
    perVariante.set(variante, quantita)
    mappa.set(oggettoId, perVariante)
  }
  return mappa
}

// copie di tutte le varianti
export function copieTotali(mappa: MappaCopie, id: string): number {
  let totale = 0
  for (const quantita of mappa.get(id)?.values() ?? []) totale += quantita
  return totale
}

// Normale: carte con almeno una copia / carte. Master set: voci = varianti suggerite più quelle possedute
// non suggerite; una carta con varianti sconosciute o vuote e nessuna copia vale una voce
export function conteggio(carte: Oggetto[], mappa: MappaCopie, master: boolean): { possedute: number; totale: number } {
  let possedute = 0
  let totale = 0
  for (const carta of carte) {
    const mie = mappa.get(carta.id)
    if (!master) {
      totale += 1
      if (mie && mie.size > 0) possedute += 1
      continue
    }
    const voci = new Set<Variante>(carta.varianti ?? [])
    for (const v of mie?.keys() ?? []) voci.add(v)
    if (voci.size === 0) {
      totale += 1
      continue
    }
    totale += voci.size
    for (const v of voci) if (mie?.has(v)) possedute += 1
  }
  return { possedute, totale }
}

export function filtra(carte: Oggetto[], mappa: MappaCopie, filtro: Filtro): Oggetto[] {
  if (filtro === 'tutte') return carte
  return carte.filter((c) => (copieTotali(mappa, c.id) > 0) === (filtro === 'possedute'))
}

// variante che dà l'effetto alla carta: la più pregiata posseduta, se no la più pregiata suggerita, se no null
export function varianteEffetto(oggetto: Oggetto, perVariante?: Map<Variante, number>): Variante | null {
  const possedute = [...(perVariante?.keys() ?? [])].filter((v) => (perVariante?.get(v) ?? 0) > 0)
  return piuPregiata(possedute) ?? piuPregiata(oggetto.varianti ?? [])
}
