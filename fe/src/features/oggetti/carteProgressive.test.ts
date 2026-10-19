import { describe, expect, it } from 'vitest'
import type { CarteProgressive } from '../../types/api'
import { aPezziDopo, inAttesa, intervalloPolling, pagineTotali, paginaDaChiedere } from './carteProgressive'

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

describe('intervalloPolling', () => {
  it('a pezzi ogni 3 secondi', () => {
    expect(intervalloPolling(true, false)).toBe(3000)
  })

  it('completo o fallito: niente richieste ripetute', () => {
    expect(intervalloPolling(false, false)).toBe(0)
    expect(intervalloPolling(true, true)).toBe(0)
  })
})

describe('inAttesa', () => {
  const base = { carte: [] as never[], isError: false, aPezzi: true, totaleServer: 0, fallito: false }

  it('senza carte ancora arrivate', () => {
    expect(inAttesa({ ...base, carte: undefined })).toBe(true)
    expect(inAttesa({ ...base, carte: undefined, isError: true })).toBe(false)
  })

  it('a pezzi senza totale (artista sconosciuto): si aspetta lo scaricamento', () => {
    expect(inAttesa(base)).toBe(true)
    expect(inAttesa({ ...base, fallito: true })).toBe(false)
  })

  it('a pezzi con un totale ma la pagina vuota (oltre la fine): non si aspetta per sempre', () => {
    expect(inAttesa({ ...base, totaleServer: 120 })).toBe(false)
  })
})
