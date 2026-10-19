import { describe, expect, it } from 'vitest'
import type { CarteProgressive } from '../../types/api'
import { aPezziDopo, pagineTotali, paginaDaChiedere } from './carteProgressive'

const risposta = (completo: boolean): CarteProgressive => ({ completo, totale: 0, carte: [], fallito: false })

describe('paginaDaChiedere', () => {
  it('a pezzi chiede la pagina dell\'URL', () => {
    expect(paginaDaChiedere(true, 5)).toBe(5)
  })

  it('completo o non ancora noto: la lista intera', () => {
    expect(paginaDaChiedere(false, 5)).toBeUndefined()
  })

  it('la prima pagina non si chiede: è quella di default', () => {
    expect(paginaDaChiedere(true, 0)).toBeUndefined()
  })
})

describe('aPezziDopo', () => {
  it('senza risposta resta com\'era', () => {
    expect(aPezziDopo(undefined, true)).toBe(true)
    expect(aPezziDopo(undefined, false)).toBe(false)
  })

  it('segue la risposta', () => {
    expect(aPezziDopo(risposta(false), false)).toBe(true)
    expect(aPezziDopo(risposta(true), true)).toBe(false)
  })
})

describe('pagineTotali', () => {
  it('lista intera: dalle carte ricevute', () => {
    expect(pagineTotali(30)).toBe(2)
  })

  it('a pezzi: dal totale del server', () => {
    expect(pagineTotali(24, 252)).toBe(11)
    expect(pagineTotali(0, 0)).toBe(0)
  })
})
