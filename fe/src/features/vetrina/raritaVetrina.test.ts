import { describe, expect, it } from 'vitest'
import { carteSegrete, numeroNelSet, raritaMostrate } from './raritaVetrina'

describe('raritaMostrate', () => {
  it('la più rara è arcobaleno, poi oro, argento e blu per grado', () => {
    const mostrate = raritaMostrate([
      { rarita: 'RGB Rare', quante: 3, grado: 6 },
      { rarita: 'Special illustration rare', quante: 10, grado: 6 },
      { rarita: 'Illustration rare', quante: 18, grado: 5 },
      { rarita: 'Ultra Rare', quante: 1, grado: 4 },
    ])
    expect(mostrate.map((r) => [r.sigla, r.tono])).toEqual([
      ['RGB', 'arcobaleno'],
      ['SIR', 'oro'],
      ['IR', 'argento'],
      ['UR', 'blu'],
    ])
    expect(mostrate[1].nome).toBe('rare illustrazione speciale')
    expect(mostrate[3].nome).toBe('ultra rara')
  })

  it('una rarità sconosciuta prende le iniziali e il nome di TCGdex', () => {
    const [r] = raritaMostrate([{ rarita: 'Black White Rare', quante: 2, grado: 4 }])
    expect(r.sigla).toBe('BWR')
    expect(r.nome).toBe('Black White Rare')
  })
})

describe('numeroNelSet', () => {
  it('aggiunge le carte ufficiali e toglie gli zeri davanti', () => {
    expect(numeroNelSet('152', 128)).toBe('152/128')
    expect(numeroNelSet('007', 86)).toBe('7/86')
    expect(numeroNelSet('R', 128)).toBe('R/128')
    expect(numeroNelSet('TG01', null)).toBe('TG01')
    expect(numeroNelSet(null, 128)).toBeNull()
  })
})

describe('carteSegrete', () => {
  it('le carte oltre il totale ufficiale', () => {
    expect(carteSegrete(161, 128)).toBe(33)
    expect(carteSegrete(102, 102)).toBe(0)
    expect(carteSegrete(161, null)).toBeNull()
  })
})
