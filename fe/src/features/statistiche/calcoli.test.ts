import { describe, expect, it } from 'vitest'
import type { AvanzamentoSet } from '../../types/api'
import { avanzamentoPokedex, ordinaSet, raggruppaPerSerie } from './calcoli'

const set = (id: string, possedute: number, totale: number, dataUscita: string | null, serie: string | null = 'S'): AvanzamentoSet => ({
  id,
  nome: id,
  serie,
  simboloUrl: null,
  dataUscita,
  possedute,
  totale,
})

describe('avanzamentoPokedex', () => {
  it('collezione vuota', () => {
    const a = avanzamentoPokedex([])
    expect(a.posseduti).toBe(0)
    expect(a.totale).toBe(1025)
    expect(a.generazioni).toHaveLength(9)
    expect(a.generazioni[0].mancanti).toHaveLength(151)
  })
  it('conta per generazione e toglie i posseduti dai mancanti', () => {
    const a = avanzamentoPokedex([1, 4, 152])
    expect(a.posseduti).toBe(3)
    expect(a.generazioni[0]).toMatchObject({ posseduti: 2, totale: 151 })
    expect(a.generazioni[1]).toMatchObject({ posseduti: 1, totale: 100 })
    expect(a.generazioni[0].mancanti.map((p) => p.numero)).not.toContain(1)
    expect(a.generazioni[0].mancanti).toHaveLength(149)
  })
  it('ignora numeri fuori dal Pokédex', () => {
    expect(avanzamentoPokedex([0, 1026, 25]).posseduti).toBe(1)
  })
})

describe('ordinaSet', () => {
  const lista = [set('a', 1, 10, '2020-01-01'), set('b', 5, 10, '2019-01-01'), set('c', 3, 3, '2021-01-01'), set('d', 1, 2, '2018-01-01'), set('e', 5, 10, '2022-01-01')]
  it('completamento: percentuale decrescente, pari percentuale il più recente, completati in fondo', () => {
    expect(ordinaSet(lista, 'completamento').map((s) => s.id)).toEqual(['e', 'b', 'd', 'a', 'c'])
  })
  it('data: ordine ricevuto', () => {
    expect(ordinaSet(lista, 'data').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('raggruppaPerSerie', () => {
  it('serie nell’ordine del primo set, senza serie in «Altro»', () => {
    const gruppi = raggruppaPerSerie([set('a', 1, 2, null, 'SV'), set('b', 1, 2, null, null), set('c', 1, 2, null, 'Base'), set('d', 1, 2, null, 'SV')])
    expect(gruppi.map((g) => [g.serie, g.set.map((s) => s.id)])).toEqual([
      ['SV', ['a', 'd']],
      ['Altro', ['b']],
      ['Base', ['c']],
    ])
  })
})
