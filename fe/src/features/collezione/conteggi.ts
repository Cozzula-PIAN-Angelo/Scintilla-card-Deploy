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

// carte con almeno una copia / carte
export function conteggio(carte: Oggetto[], mappa: MappaCopie): { possedute: number; totale: number } {
  let possedute = 0
  for (const carta of carte) {
    const mie = mappa.get(carta.id)
    if (mie && mie.size > 0) possedute += 1
  }
  return { possedute, totale: carte.length }
}

export function filtra(carte: Oggetto[], mappa: MappaCopie, filtro: Filtro): Oggetto[] {
  if (filtro === 'tutte') return carte
  return carte.filter((c) => (copieTotali(mappa, c.id) > 0) === (filtro === 'possedute'))
}

// messaggio della griglia quando il filtro non lascia carte (undefined = nessun filtro attivo)
export function vuotoFiltro(filtro: Filtro): { titolo: string; testo: string } | undefined {
  if (filtro === 'mancanti') return { titolo: 'Nessuna carta mancante', testo: 'Hai tutte le carte di questa pagina.' }
  if (filtro === 'possedute') return { titolo: 'Nessuna carta posseduta', testo: 'Usa il + su una carta per aggiungerla alla collezione.' }
  return undefined
}

// variante che dà l'effetto alla carta: la più pregiata posseduta, se no la più pregiata suggerita, se no null
export function varianteEffetto(oggetto: Oggetto, perVariante?: Map<Variante, number>): Variante | null {
  const possedute = [...(perVariante?.keys() ?? [])].filter((v) => (perVariante?.get(v) ?? 0) > 0)
  return piuPregiata(possedute) ?? piuPregiata(oggetto.varianti ?? [])
}

// tipo di riflesso olografico da disegnare nell'immagine per una variante (null = nessuno)
export function riflessoPer(variante: Variante | null): 'holo' | 'reverse' | null {
  if (variante === 'HOLO' || variante === 'PRIMA_EDIZIONE_HOLO') return 'holo'
  if (variante === 'REVERSE_HOLO') return 'reverse'
  return null
}
