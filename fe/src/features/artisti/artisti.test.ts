import { describe, expect, it } from 'vitest'
import type { Artista } from '../../types/api'
import { contaCarte, immaginiDi } from './artisti'

const arita: Artista = { slug: 'mitsuhiro-arita', nome: 'Mitsuhiro Arita', carte: 741, avatar: 'https://assets.tcgdex.net/en/base/base1/4/low.webp' }
const charizard = 'https://assets.tcgdex.net/en/base/base1/4/low.webp'

describe('immaginiDi', () => {
  it("le carte dell'archivio, se ci sono", () => {
    expect(immaginiDi(arita, { 'mitsuhiro-arita': [charizard] })).toEqual([charizard])
  })

  it("senza carte in archivio la carta dell'avatar", () => {
    expect(immaginiDi(arita, {})).toEqual([arita.avatar])
    expect(immaginiDi(arita, undefined)).toEqual([arita.avatar])
  })

  it('niente avatar e niente archivio: nessuna carta', () => {
    expect(immaginiDi({ ...arita, avatar: null }, { 'mitsuhiro-arita': [] })).toEqual([])
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
