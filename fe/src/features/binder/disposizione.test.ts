import { describe, expect, it } from 'vitest'
import type { Oggetto, SlotBinder } from '../../types/api'
import { inserisci, sposta, togli } from './disposizione'

// stessi casi di DisposizioneTest nel backend; 9 tasche per pagina, indice = pagina * 9 + posizione
const TASCHE = 9

const carta = (id: string) => ({ id }) as Oggetto
const slot = (carte: Record<number, string>): SlotBinder[] =>
  Object.entries(carte).map(([i, id]) => ({ pagina: Math.floor(+i / TASCHE), posizione: +i % TASCHE, oggetto: carta(id) }))
const mappa = (lista: SlotBinder[] | null) =>
  lista && Object.fromEntries(lista.map((s) => [s.pagina * TASCHE + s.posizione, s.oggetto.id]))
const pos = (i: number) => ({ pagina: Math.floor(i / TASCHE), posizione: i % TASCHE })
const piene = (escluse: number[]) =>
  slot(Object.fromEntries(Array.from({ length: TASCHE }, (_, i) => [i, `C${i}`]).filter(([i]) => !escluse.includes(+i))))

describe('inserisci', () => {
  it('in tasca vuota', () => {
    expect(mappa(inserisci(slot({ 0: 'A', 2: 'B' }), TASCHE, 1, pos(1), carta('X')))).toEqual({ 0: 'A', 1: 'X', 2: 'B' })
  })
  it('in mezzo scala fino al buco', () => {
    expect(mappa(inserisci(slot({ 0: 'A', 1: 'B', 2: 'C', 4: 'D' }), TASCHE, 1, pos(1), carta('X')))).toEqual({
      0: 'A', 1: 'X', 2: 'B', 3: 'C', 4: 'D',
    })
  })
  it('senza buchi dopo: binder pieno', () => {
    expect(inserisci(piene([0]), TASCHE, 1, pos(3), carta('X'))).toBeNull()
  })
  it('ultima tasca occupata: binder pieno', () => {
    expect(inserisci(slot({ 8: 'A' }), TASCHE, 1, pos(8), carta('X'))).toBeNull()
  })
  it('tasca vuota in binder pieno', () => {
    const risultato = mappa(inserisci(piene([5]), TASCHE, 1, pos(5), carta('X')))
    expect(risultato?.[5]).toBe('X')
    expect(Object.keys(risultato ?? {})).toHaveLength(TASCHE)
  })
  it('non modifica la lista ricevuta', () => {
    const lista = slot({ 0: 'A' })
    inserisci(lista, TASCHE, 1, pos(0), carta('X'))
    expect(mappa(lista)).toEqual({ 0: 'A' })
  })
})

describe('togli', () => {
  it('richiude fino al buco', () => {
    expect(mappa(togli(slot({ 0: 'A', 1: 'B', 2: 'C', 4: 'D' }), TASCHE, 1, pos(0)))).toEqual({ 0: 'B', 1: 'C', 4: 'D' })
  })
  it('senza buchi dopo', () => {
    expect(mappa(togli(slot({ 6: 'A', 7: 'B', 8: 'C' }), TASCHE, 1, pos(6)))).toEqual({ 6: 'B', 7: 'C' })
  })
  it('ultima tasca', () => {
    expect(mappa(togli(slot({ 7: 'A', 8: 'B' }), TASCHE, 1, pos(8)))).toEqual({ 7: 'A' })
  })
})

describe('sposta', () => {
  it('su tasca vuota non scala', () => {
    expect(mappa(sposta(slot({ 0: 'A', 1: 'B' }), TASCHE, 1, pos(0), pos(5)))).toEqual({ 1: 'B', 5: 'A' })
  })
  it('in avanti: prima della carta d’arrivo', () => {
    expect(mappa(sposta(slot({ 0: 'A', 1: 'B', 2: 'C', 3: 'D' }), TASCHE, 1, pos(0), pos(2)))).toEqual({
      0: 'B', 1: 'A', 2: 'C', 3: 'D',
    })
  })
  it('indietro', () => {
    expect(mappa(sposta(slot({ 0: 'A', 1: 'B', 2: 'C' }), TASCHE, 1, pos(2), pos(0)))).toEqual({ 0: 'C', 1: 'A', 2: 'B' })
  })
  it('in avanti oltre il gruppo, senza buchi dopo: arretrano le carte prima', () => {
    const lista = [...piene([1]).filter((s) => s.posizione !== 0), ...slot({ 0: 'A' })]
    expect(mappa(sposta(lista, TASCHE, 1, pos(0), pos(5)))).toEqual({
      1: 'C2', 2: 'C3', 3: 'C4', 4: 'A', 5: 'C5', 6: 'C6', 7: 'C7', 8: 'C8',
    })
  })
  it('tra pagine', () => {
    expect(mappa(sposta(slot({ 3: 'A', 4: 'B', 12: 'C', 13: 'D' }), TASCHE, 2, pos(3), pos(12)))).toEqual({
      3: 'B', 12: 'A', 13: 'C', 14: 'D',
    })
  })
})

it('copie della stessa carta restano', () => {
  expect(mappa(togli(slot({ 0: 'A', 1: 'A' }), TASCHE, 1, pos(0)))).toEqual({ 0: 'A' })
  expect(mappa(inserisci(slot({ 0: 'A' }), TASCHE, 1, pos(0), carta('A')))).toEqual({ 0: 'A', 1: 'A' })
})
