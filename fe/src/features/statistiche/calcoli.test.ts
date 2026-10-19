import { describe, expect, it } from 'vitest'
import type { AvanzamentoSet } from '../../types/api'
import { avanzamentoPokedex, gruppiSet, ordinaSet, percentuale, raggruppaPerSerie } from './calcoli'

const set = (id: string, possedute: number, totale: number, dataUscita: string | null, serie: string | null = 'S'): AvanzamentoSet => ({
  id,
  nome: id,
  serie,
  simboloUrl: null,
  dataUscita,
  possedute,
  totale,
  posseduteMaster: null,
  totaleMaster: null,
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

describe('ordinaSet con il master', () => {
  it('ordina per le voci del master, i set senza master in fondo', () => {
    const x = { ...set('x', 9, 10, '2024-01-01'), posseduteMaster: 9, totaleMaster: 20 }
    const y = { ...set('y', 5, 10, '2023-01-01'), posseduteMaster: 15, totaleMaster: 16 }
    const z = set('z', 9, 10, '2025-01-01')
    expect(ordinaSet([z, x, y], 'completamento', true).map((s) => s.id)).toEqual(['y', 'x', 'z'])
  })

  // p ha tutte le carte ma non tutte le varianti: col master non va in fondo tra i completati
  it('completato per il master solo con tutte le voci', () => {
    const pieno = { ...set('p', 10, 10, '2024-01-01'), posseduteMaster: 12, totaleMaster: 20 }
    const meno = { ...set('r', 8, 10, '2024-01-01'), posseduteMaster: 10, totaleMaster: 20 }
    expect(ordinaSet([meno, pieno], 'completamento', true).map((s) => s.id)).toEqual(['p', 'r'])
  })
})

describe('gruppiSet', () => {
  it('per completamento un solo gruppo nell’ordine di completamento, senza mescolare per serie', () => {
    const lista = [set('a95', 95, 100, '2020-01-01', 'A'), set('a10', 1, 10, '2020-01-02', 'A'), set('b90', 9, 10, '2020-01-03', 'B')]
    expect(gruppiSet(lista, 'completamento')).toEqual([{ serie: null, set: [lista[0], lista[2], lista[1]] }])
  })
  it('per data raggruppa per serie', () => {
    const lista = [set('a', 1, 2, null, 'A'), set('b', 1, 2, null, 'B')]
    expect(gruppiSet(lista, 'data').map((g) => g.serie)).toEqual(['A', 'B'])
  })
})

it('percentuale arrotondata, 0 con totale 0', () => {
  expect(percentuale(1, 3)).toBe(33)
  expect(percentuale(2, 3)).toBe(67)
  expect(percentuale(0, 0)).toBe(0)
})
