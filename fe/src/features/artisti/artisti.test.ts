import { describe, expect, it } from 'vitest'
import type { Artista, CartaAnteprima } from '../../types/api'
import { carteDi, contaCarte } from './artisti'

const arita: Artista = { slug: 'mitsuhiro-arita', nome: 'Mitsuhiro Arita', carte: 741, avatar: 'https://assets.tcgdex.net/en/base/base1/4/low.webp' }
const charizard: CartaAnteprima = {
  id: 'c1',
  nome: 'Charizard',
  numero: '4',
  rarita: 'Rare Holo',
  immagineUrl: 'https://assets.tcgdex.net/en/base/base1/4/high.webp',
  immagineUrlPiccola: 'https://assets.tcgdex.net/en/base/base1/4/low.webp',
}

describe('carteDi', () => {
  it("le carte dell'archivio, se ci sono", () => {
    expect(carteDi(arita, { 'mitsuhiro-arita': [charizard] })).toEqual([charizard])
  })

  it("senza carte in archivio la carta dell'avatar", () => {
    expect(carteDi(arita, {})).toEqual([
      { id: 'mitsuhiro-arita', nome: 'Mitsuhiro Arita', numero: null, rarita: null, immagineUrl: arita.avatar, immagineUrlPiccola: arita.avatar },
    ])
    expect(carteDi(arita, undefined)).toHaveLength(1)
  })

  it('niente avatar e niente archivio: nessuna carta', () => {
    expect(carteDi({ ...arita, avatar: null }, { 'mitsuhiro-arita': [] })).toEqual([])
  })
})

describe('contaCarte', () => {
  // in italiano il punto delle migliaia compare dalle cinque cifre
  it('singolare, plurale e migliaia col punto', () => {
    expect(contaCarte(1)).toBe('1 carta')
    expect(contaCarte(1789)).toBe('1789 carte')
    expect(contaCarte(12345)).toBe('12.345 carte')
  })
})
