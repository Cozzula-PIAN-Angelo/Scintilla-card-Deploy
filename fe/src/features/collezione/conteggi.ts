import type { Copia, Oggetto, Variante } from '../../types/api'

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

// rarità "di base": su queste l'effetto lo decide la copia posseduta. Ogni altra rarità (Rare Holo, Double Rare,
// Illustration Rare, Ultra Rare, ...) è "più rara" e ha sempre l'arcobaleno. Rarità null o '' (anche le carte
// create a mano) contano come di base
const RARITA_DI_BASE = new Set(['Common', 'Uncommon', 'Rare'])

// le varianti lucide danno lo specchio sulle carte di base; Normale e 1ª edizione no
const VARIANTI_LUCIDE = new Set<Variante>(['REVERSE_HOLO', 'HOLO', 'PRIMA_EDIZIONE_HOLO'])

// effetto olografico della carta. Carte più rare: arcobaleno per tutti. Carte di base: specchio se la variante
// scelta (riga cliccata nel dettaglio) è lucida; senza scelta, se tra le copie possedute ce n'è una lucida;
// altrimenti (solo Normale, nessuna copia, ospite) nessun effetto
export function effettoCarta(
  oggetto: Pick<Oggetto, 'rarita'>,
  perVariante?: Map<Variante, number>,
  variante?: Variante,
): 'arcobaleno' | 'specchio' | null {
  const rarita = oggetto.rarita ?? ''
  if (rarita !== '' && !RARITA_DI_BASE.has(rarita)) return 'arcobaleno'
  if (variante) return VARIANTI_LUCIDE.has(variante) ? 'specchio' : null
  for (const [v, quantita] of perVariante ?? []) {
    if (quantita > 0 && VARIANTI_LUCIDE.has(v)) return 'specchio'
  }
  return null
}
