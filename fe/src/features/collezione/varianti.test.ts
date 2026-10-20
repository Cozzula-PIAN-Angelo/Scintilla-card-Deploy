import { describe, expect, it } from 'vitest'
import { variantiMaster } from './varianti'

// stessi casi di VariantiMasterTest nel backend
describe('variantiMaster', () => {
  it('lette con la reverse', () => {
    expect(variantiMaster({ varianti: ['NORMALE', 'REVERSE_HOLO'] })).toEqual(['NORMALE', 'REVERSE_HOLO'])
  })

  it('senza 1ª edizione', () => {
    expect(variantiMaster({ varianti: ['NORMALE', 'PRIMA_EDIZIONE'] })).toEqual(['NORMALE'])
  })

  it('solo 1ª edizione vale la Normale', () => {
    expect(variantiMaster({ varianti: ['PRIMA_EDIZIONE'] })).toEqual(['NORMALE'])
  })

  it('solo reverse resta solo reverse', () => {
    expect(variantiMaster({ varianti: ['REVERSE_HOLO'] })).toEqual(['REVERSE_HOLO'])
  })

  it('vuote valgono la Normale', () => {
    expect(variantiMaster({ varianti: [] })).toEqual(['NORMALE'])
  })

  it('mai lette valgono la Normale', () => {
    expect(variantiMaster({ varianti: null })).toEqual(['NORMALE'])
  })
})
