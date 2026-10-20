import { describe, expect, it } from 'vitest'
import { aggiungi, sposta, togli } from './liste'

describe('aggiungi', () => {
  it('in fondo', () => {
    expect(aggiungi([1, 2], 3, 6)).toEqual([1, 2, 3])
  })

  it('niente doppioni', () => {
    expect(aggiungi([1, 2], 2, 6)).toEqual([1, 2])
  })

  it('niente oltre il massimo', () => {
    expect(aggiungi([1, 2, 3, 4, 5, 6], 7, 6)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('doppioni riconosciuti con il confronto dato', () => {
    const lista = [{ id: 'a' }]
    expect(aggiungi(lista, { id: 'a' }, 6, (x, y) => x.id === y.id)).toBe(lista)
  })
})

describe('togli', () => {
  it('la voce in quella posizione', () => {
    expect(togli([1, 2, 3], 1)).toEqual([1, 3])
  })
})

describe('sposta', () => {
  it('in cima: diventa la prima (il compagno, nella squadra)', () => {
    expect(sposta([1, 2, 3], 2, 0)).toEqual([3, 1, 2])
  })

  it('fuori dalla lista: niente', () => {
    expect(sposta([1, 2, 3], 0, 5)).toEqual([1, 2, 3])
    expect(sposta([1, 2, 3], -1, 0)).toEqual([1, 2, 3])
  })
})
