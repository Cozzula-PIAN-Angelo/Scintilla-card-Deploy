import { describe, expect, it } from 'vitest'
import { senzaDatiDelSet, variantiMaster } from './varianti'

// stessi casi di VariantiMasterTest nel backend
describe('variantiMaster', () => {
  it('lette con la reverse', () => {
    expect(variantiMaster({ varianti: ['NORMALE', 'REVERSE_HOLO'], rarita: 'Common' }, false)).toEqual(['NORMALE', 'REVERSE_HOLO'])
  })

  it('senza 1ª edizione', () => {
    expect(variantiMaster({ varianti: ['NORMALE', 'PRIMA_EDIZIONE'], rarita: 'Rare Holo' }, false)).toEqual(['NORMALE'])
  })

  it('solo 1ª edizione vale la Normale', () => {
    expect(variantiMaster({ varianti: ['PRIMA_EDIZIONE'], rarita: 'Rare' }, false)).toEqual(['NORMALE'])
  })

  it.each(['Common', 'Uncommon', 'Rare', 'Rare Holo'])('vuote in un set senza dati, %s ha la reverse', (rarita) => {
    expect(variantiMaster({ varianti: [], rarita }, true)).toEqual(['NORMALE', 'REVERSE_HOLO'])
  })

  it.each(['Double Rare', 'Illustration Rare', 'Ultra Rare', 'Promo', ''])('vuote in un set senza dati, "%s" no', (rarita) => {
    expect(variantiMaster({ varianti: [], rarita }, true)).toEqual(['NORMALE'])
  })

  it('rarità null', () => {
    expect(variantiMaster({ varianti: [], rarita: null }, true)).toEqual(['NORMALE'])
  })

  it('vuote in un set con dati', () => {
    expect(variantiMaster({ varianti: [], rarita: 'Common' }, false)).toEqual(['NORMALE'])
  })

  it('mai lette', () => {
    expect(variantiMaster({ varianti: null, rarita: 'Common' }, true)).toEqual(['NORMALE', 'REVERSE_HOLO'])
  })
})

// stessi casi di VariantiMasterTest.setSenzaDati nel backend
describe('senzaDatiDelSet', () => {
  it('nessuna carta con varianti lette', () => {
    expect(senzaDatiDelSet('me3', [{ varianti: [] }, { varianti: null }])).toBe(true)
  })

  it('basta una carta letta', () => {
    expect(senzaDatiDelSet('sv8', [{ varianti: [] }, { varianti: ['NORMALE', 'REVERSE_HOLO'] }])).toBe(false)
  })

  it('set esclusi', () => {
    expect(senzaDatiDelSet('me55c', [{ varianti: [] }])).toBe(false)
  })

  it('set senza carte', () => {
    expect(senzaDatiDelSet('me4', [])).toBe(false)
  })
})
