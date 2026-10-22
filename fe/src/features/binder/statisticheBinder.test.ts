import { describe, expect, it } from 'vitest'
import type { Oggetto, SlotBinder, Variante } from '../../types/api'
import { statisticheBinder, testoFascia } from './statisticheBinder'

const tasca = (posizione: number, id: string, prezzo: number): SlotBinder => ({ pagina: 0, posizione, oggetto: { id, prezzo } as Oggetto, variante: null })

it('tasche piene, possedute e valore delle possedute', () => {
  const slot = [tasca(0, 'a', 2.5), tasca(1, 'b', 10), tasca(2, 'a', 2.5), tasca(3, 'c', 1)]
  const s = statisticheBinder(slot, 18, (id) => id !== 'b')
  expect(s).toEqual({ piene: 4, totale: 18, possedute: 3, valore: 6, valoreMinimo: 6, valoreMassimo: 6 })
})

it('binder vuoto', () => {
  expect(statisticheBinder([], 18, () => true)).toEqual({ piene: 0, totale: 18, possedute: 0, valore: 0, valoreMinimo: 0, valoreMassimo: 0 })
})

// carta con minimo e massimo di Cardmarket salvati (normale e reverse)
const conFascia = (
  posizione: number,
  id: string,
  fascia: { min?: number; max?: number; minR?: number; maxR?: number },
  variante: Variante | null = null,
): SlotBinder => ({
  pagina: 0,
  posizione,
  variante,
  oggetto: {
    id,
    prezzo: 1,
    prezzoMinimo: fascia.min ?? null,
    prezzoMassimo: fascia.max ?? null,
    prezzoMinimoReverse: fascia.minR ?? null,
    prezzoMassimoReverse: fascia.maxR ?? null,
  } as Oggetto,
})

describe('valore come fascia', () => {
  it('somma minimi e massimi delle sole possedute, la stessa carta due volte', () => {
    const slot = [conFascia(0, 'a', { min: 2, max: 5 }), conFascia(1, 'a', { min: 2, max: 5 }), conFascia(2, 'b', { min: 100, max: 200 })]
    const s = statisticheBinder(slot, 9, (id) => id === 'a')
    expect([s.valoreMinimo, s.valoreMassimo]).toEqual([4, 10])
  })

  it('tasca Reverse: i valori reverse', () => {
    const s = statisticheBinder([conFascia(0, 'a', { min: 2, max: 5, minR: 8, maxR: 20 }, 'REVERSE_HOLO')], 9, () => true)
    expect([s.valoreMinimo, s.valoreMassimo]).toEqual([8, 20])
  })

  it('tasca senza variante e Reverse posseduta (solo quella): i valori reverse', () => {
    const possiede = (_id: string, variante: Variante | null) => variante !== 'NORMALE'
    const s = statisticheBinder([conFascia(0, 'a', { min: 2, max: 5, minR: 8, maxR: 20 })], 9, possiede)
    expect([s.valoreMinimo, s.valoreMassimo]).toEqual([8, 20])
  })

  it('tasca senza variante e Reverse non posseduta: i valori normali', () => {
    const possiede = (_id: string, variante: Variante | null) => variante !== 'REVERSE_HOLO'
    const s = statisticheBinder([conFascia(0, 'a', { min: 2, max: 5, minR: 8, maxR: 20 })], 9, possiede)
    expect([s.valoreMinimo, s.valoreMassimo]).toEqual([2, 5])
  })

  it('reverse mancanti: i normali, non zero', () => {
    const s = statisticheBinder([conFascia(0, 'a', { min: 2, max: 5 }, 'REVERSE_HOLO')], 9, () => true)
    expect([s.valoreMinimo, s.valoreMassimo]).toEqual([2, 5])
  })

  it('tutto mancante: il prezzo per tutti e due', () => {
    const s = statisticheBinder([conFascia(0, 'a', {})], 9, () => true)
    expect([s.valoreMinimo, s.valoreMassimo]).toEqual([1, 1])
  })
})

// gli spazi di Intl tra cifra e € e nelle migliaia sono non separabili: si confronta senza
const semplice = (testo: string) => testo.replace(/\s/g, ' ')

describe('testoFascia', () => {
  it('sotto i 100 € con i centesimi', () => {
    const t = testoFascia({ valoreMinimo: 0.07, valoreMassimo: 0.46 })
    expect(semplice(t.lungo)).toBe('da 0,07 € a 0,46 €')
    expect(semplice(t.breve)).toBe('0,07–0,46 €')
  })
  it('da 100 € in su in euro interi', () => {
    const t = testoFascia({ valoreMinimo: 155.37, valoreMassimo: 12345.6 })
    expect(semplice(t.lungo)).toBe('da 155 € a 12.346 €')
    expect(semplice(t.breve)).toBe('155–12.346 €')
  })
  it('minimo e massimo uguali: un numero solo', () => {
    const t = testoFascia({ valoreMinimo: 0.44, valoreMassimo: 0.44 })
    expect(semplice(t.lungo)).toBe('0,44 €')
    expect(semplice(t.breve)).toBe('0,44 €')
  })
})
