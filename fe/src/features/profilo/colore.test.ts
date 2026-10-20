import { describe, expect, it } from 'vitest'
import { inizioFascia, luminanza } from './colore'

describe('luminanza', () => {
  it('bianco e nero agli estremi', () => {
    expect(luminanza('#ffffff')).toBeCloseTo(1)
    expect(luminanza('#000000')).toBeCloseTo(0)
  })
})

describe('inizioFascia', () => {
  // il blu del sito regge già il testo bianco
  it('colore scuro: resta com\'è', () => {
    expect(inizioFascia('#1b4f8a')).toBe('#1b4f8a')
  })

  // bianco o giallo scelti col selettore libero: senza scurire il nome bianco sparirebbe
  it('colore chiaro: si scurisce', () => {
    expect(inizioFascia('#ffffff')).toContain('color-mix')
    expect(inizioFascia('#ffcb05')).toContain('color-mix')
  })
})
