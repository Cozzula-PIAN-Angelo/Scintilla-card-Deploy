import { describe, expect, it } from 'vitest'
import type { PrezziCarta } from '../../types/api'
import { fasciaDellaVariante, testoFascia } from './fasciaPrezzo'

const prezzi: PrezziCarta = {
  normale: { minimo: 0.02, massimo: 0.15, trend: 0.05, media30: 0.06 },
  reverse: { minimo: 0.08, massimo: 0.28, trend: 0.25, media30: 0.26 },
  aggiornatoIl: '2026-10-22T13:13:24.189Z',
}

describe('fasciaDellaVariante', () => {
  it('la Reverse usa i valori holo', () => {
    expect(fasciaDellaVariante(prezzi, 'REVERSE_HOLO')).toBe(prezzi.reverse)
  })
  it('le altre varianti, o nessuna, la normale', () => {
    expect(fasciaDellaVariante(prezzi, 'NORMALE')).toBe(prezzi.normale)
    expect(fasciaDellaVariante(prezzi, 'PRIMA_EDIZIONE')).toBe(prezzi.normale)
    expect(fasciaDellaVariante(prezzi, undefined)).toBe(prezzi.normale)
  })
  it('Reverse senza valori holo: niente, non i prezzi della normale', () => {
    expect(fasciaDellaVariante({ ...prezzi, reverse: null }, 'REVERSE_HOLO')).toBeNull()
  })
})

// gli spazi tra cifra e € sono quelli di Intl (non separabili): si confronta senza
const semplice = (testo: string) => testo.replace(/\s/g, ' ')

describe('testoFascia', () => {
  it('da… a… e i dettagli', () => {
    const testo = testoFascia(prezzi.normale!)
    expect(semplice(testo.fascia)).toBe('da 0,02 € a 0,15 €')
    expect(semplice(testo.dettagli)).toBe('Trend 0,05 € · media 30 gg 0,06 €')
  })
  it('minimo uguale al massimo: un prezzo solo', () => {
    expect(semplice(testoFascia({ minimo: 1.5, massimo: 1.5, trend: null, media30: null }).fascia)).toBe('1,50 €')
  })
  it('senza trend né media: niente dettagli', () => {
    expect(testoFascia({ minimo: 1, massimo: 2, trend: null, media30: null }).dettagli).toBe('')
  })
})
