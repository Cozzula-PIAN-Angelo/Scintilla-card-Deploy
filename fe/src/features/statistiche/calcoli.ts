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

// 'data' lascia l'ordine del backend (dal più recente). 'completamento': i più vicini alla fine prima,
// a pari percentuale il più recente; i completati in fondo
export function ordinaSet(set: AvanzamentoSet[], criterio: OrdineSet): AvanzamentoSet[] {
  if (criterio === 'data') return set
  return [...set].sort(
    (a, b) =>
      Number(completato(a)) - Number(completato(b)) ||
      rapporto(b) - rapporto(a) ||
      (b.dataUscita ?? '').localeCompare(a.dataUscita ?? ''),
  )
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
export function gruppiSet(set: AvanzamentoSet[], criterio: OrdineSet): Array<{ serie: string | null; set: AvanzamentoSet[] }> {
  return criterio === 'completamento' ? [{ serie: null, set: ordinaSet(set, criterio) }] : raggruppaPerSerie(set)
}
