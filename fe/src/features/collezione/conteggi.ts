import type { Copia, Oggetto, Variante } from '../../types/api'
import { variantiMaster } from './varianti'

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

// senza variante (null) una copia qualsiasi; con la variante (tasca del master set) una copia di quella
export function possiede(mappa: MappaCopie, id: string, variante?: Variante | null): boolean {
  return variante ? (mappa.get(id)?.get(variante) ?? 0) > 0 : copieTotali(mappa, id) > 0
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

// voci del master set (carta, variante) con almeno una copia di quella variante / voci. Le copie di una variante
// che la carta non ha nel master (es. una reverse su una Double Rare) non contano
export function conteggioMaster(carte: Oggetto[], mappa: MappaCopie, senzaDati: boolean): { possedute: number; totale: number } {
  let possedute = 0
  let totale = 0
  for (const carta of carte) {
    const voci = variantiMaster(carta, senzaDati)
    totale += voci.length
    possedute += voci.filter((v) => (mappa.get(carta.id)?.get(v) ?? 0) > 0).length
  }
  return { possedute, totale }
}

// col master una carta è posseduta solo con tutte le sue voci, mancante se ne manca almeno una
export function filtra(carte: Oggetto[], mappa: MappaCopie, filtro: Filtro, master?: { senzaDati: boolean }): Oggetto[] {
  if (filtro === 'tutte') return carte
  const completa = master
    ? (c: Oggetto) => variantiMaster(c, master.senzaDati).every((v) => (mappa.get(c.id)?.get(v) ?? 0) > 0)
    : (c: Oggetto) => copieTotali(mappa, c.id) > 0
  return carte.filter((c) => completa(c) === (filtro === 'possedute'))
}

// messaggio della griglia quando il filtro non lascia carte (undefined = nessun filtro attivo)
export function vuotoFiltro(filtro: Filtro): { titolo: string; testo: string } | undefined {
  if (filtro === 'mancanti') return { titolo: 'Nessuna carta mancante', testo: 'Hai tutte le carte di questa pagina.' }
  if (filtro === 'possedute') return { titolo: 'Nessuna carta posseduta', testo: 'Usa il + su una carta per aggiungerla alla collezione.' }
  return undefined
}

// variante che una tasca del binder (e il dettaglio aperto da lì) mostra per il riflesso: quella della tasca
// (master set); senza, la Reverse se se ne possiede una copia, come nelle griglie
export function varianteMostrata(variante: Variante | null, possiedeReverse: boolean): Variante | undefined {
  return variante ?? (possiedeReverse ? 'REVERSE_HOLO' : undefined)
}

// rarità "di base": su queste l'effetto lo decide la copia posseduta. Ogni altra rarità (Rare Holo, Double Rare,
// Illustration Rare, Ultra Rare, ...) è "più rara" e ha sempre l'arcobaleno. Rarità null o '' (anche le carte
// create a mano) contano come di base
const RARITA_DI_BASE = new Set(['Common', 'Uncommon', 'Rare'])

// effetto olografico della carta. Carte più rare: arcobaleno per tutti. Carte di base: specchio se la variante
// scelta (riga cliccata nel dettaglio) è la Reverse holo; senza scelta, se tra le copie possedute c'è una Reverse;
// altrimenti (Normale, 1ª edizione, nessuna copia, ospite) nessun effetto
export function effettoCarta(
  oggetto: Pick<Oggetto, 'rarita'>,
  perVariante?: Map<Variante, number>,
  variante?: Variante,
): 'arcobaleno' | 'specchio' | null {
  const rarita = oggetto.rarita ?? ''
  if (rarita !== '' && !RARITA_DI_BASE.has(rarita)) return 'arcobaleno'
  if (variante) return variante === 'REVERSE_HOLO' ? 'specchio' : null
  return (perVariante?.get('REVERSE_HOLO') ?? 0) > 0 ? 'specchio' : null
}
