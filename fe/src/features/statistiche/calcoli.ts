import type { AvanzamentoSet } from '../../types/api'
import { GENERAZIONI, POKEDEX, type Generazione, type Pokemon } from '../pokedex/pokedex'

export interface AvanzamentoGenerazione {
  generazione: Generazione
  posseduti: number
  totale: number
  mancanti: Pokemon[]
}

// Pokémon posseduti (almeno una carta) sul Pokédex intero e per generazione; i numeri fuori dal Pokédex non contano
export function avanzamentoPokedex(numeri: number[]) {
  const posseduti = new Set(numeri.filter((n) => n >= 1 && n <= POKEDEX.length))
  const generazioni: AvanzamentoGenerazione[] = GENERAZIONI.map((generazione) => {
    const pokemon = POKEDEX.slice(generazione.da - 1, generazione.a)
    const mancanti = pokemon.filter((p) => !posseduti.has(p.numero))
    return { generazione, posseduti: pokemon.length - mancanti.length, totale: pokemon.length, mancanti }
  })
  return { posseduti: posseduti.size, totale: POKEDEX.length, generazioni }
}

export type OrdineSet = 'completamento' | 'data'

// percentuale intera di valore su totale, 0 con totale 0: unica per barre, set, Pokédex e BarraCollezione
export function percentuale(valore: number, totale: number) {
  return totale > 0 ? Math.round((valore / totale) * 100) : 0
}

const rapporto = (s: AvanzamentoSet) => (s.totale > 0 ? s.possedute / s.totale : 0)
const completato = (s: AvanzamentoSet) => s.possedute >= s.totale

// stesso set con i numeri del master set al posto delle carte; null se il master non si conosce (set non importato)
export function numeriMaster(s: AvanzamentoSet): AvanzamentoSet | null {
  return s.posseduteMaster === null || s.totaleMaster === null ? null : { ...s, possedute: s.posseduteMaster, totale: s.totaleMaster }
}

// 'data' lascia l'ordine del backend (dal più recente). 'completamento': i più vicini alla fine prima,
// a pari percentuale il più recente; i completati in fondo. Col master contano le voci del master set e i set
// senza master vanno in fondo a tutti, nell'ordine del backend
export function ordinaSet(set: AvanzamentoSet[], criterio: OrdineSet, master = false): AvanzamentoSet[] {
  if (criterio === 'data') return set
  const numeri = (s: AvanzamentoSet) => (master ? numeriMaster(s) : s)
  const conNumeri = set.filter((s) => numeri(s) !== null)
  const senza = set.filter((s) => numeri(s) === null)
  const ordinati = [...conNumeri].sort((x, y) => {
    const a = numeri(x)!
    const b = numeri(y)!
    return (
      Number(completato(a)) - Number(completato(b)) ||
      rapporto(b) - rapporto(a) ||
      (b.dataUscita ?? '').localeCompare(a.dataUscita ?? '')
    )
  })
  return [...ordinati, ...senza]
}

// gruppi per serie, nell'ordine in cui compare il primo set di ciascuna; senza serie in «Altro»
export function raggruppaPerSerie(set: AvanzamentoSet[]): Array<{ serie: string; set: AvanzamentoSet[] }> {
  const gruppi = new Map<string, AvanzamentoSet[]>()
  for (const s of set) {
    const serie = s.serie ?? 'Altro'
    gruppi.set(serie, [...(gruppi.get(serie) ?? []), s])
  }
  return [...gruppi.entries()].map(([serie, lista]) => ({ serie, set: lista }))
}

// come si mostrano i set: per completamento un elenco unico (raggrupparli per serie mescolerebbe l'ordine),
// per data raggruppati per serie
export function gruppiSet(
  set: AvanzamentoSet[],
  criterio: OrdineSet,
  master = false,
): Array<{ serie: string | null; set: AvanzamentoSet[] }> {
  return criterio === 'completamento' ? [{ serie: null, set: ordinaSet(set, criterio, master) }] : raggruppaPerSerie(set)
}
