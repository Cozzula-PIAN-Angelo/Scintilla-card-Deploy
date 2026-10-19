import { expect, it } from 'vitest'
import type { Oggetto, SlotBinder } from '../../types/api'
import { statisticheBinder } from './statisticheBinder'

const tasca = (posizione: number, id: string, prezzo: number): SlotBinder => ({ pagina: 0, posizione, oggetto: { id, prezzo } as Oggetto, variante: null })

it('tasche piene, possedute e valore delle possedute', () => {
  const slot = [tasca(0, 'a', 2.5), tasca(1, 'b', 10), tasca(2, 'a', 2.5), tasca(3, 'c', 1)]
  const s = statisticheBinder(slot, 18, (id) => id !== 'b')
  expect(s).toEqual({ piene: 4, totale: 18, possedute: 3, valore: 6 })
})

it('binder vuoto', () => {
  expect(statisticheBinder([], 18, () => true)).toEqual({ piene: 0, totale: 18, possedute: 0, valore: 0 })
})
