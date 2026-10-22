import { describe, expect, it } from 'vitest'
import { ORDINAMENTI_PREFERITI, leggiOrdinamento, prossimoOrdinamento, valoriOrdinamento } from './ordinamenti'

const [AGGIUNTA, PREZZO, NOME] = ORDINAMENTI_PREFERITI

describe('prossimoOrdinamento', () => {
  it('il criterio attivo si inverte', () => {
    expect(prossimoOrdinamento('createdAt,desc', AGGIUNTA)).toBe('createdAt,asc')
    expect(prossimoOrdinamento('createdAt,asc', AGGIUNTA)).toBe('createdAt,desc')
    expect(prossimoOrdinamento('nome,asc', NOME)).toBe('nome,desc')
  })

  it('un altro criterio parte dal suo verso iniziale', () => {
    expect(prossimoOrdinamento('createdAt,desc', PREZZO)).toBe('prezzo,asc')
    expect(prossimoOrdinamento('nome,desc', AGGIUNTA)).toBe('createdAt,desc')
  })
})

describe('valoriOrdinamento', () => {
  it('ogni criterio in tutti e due i versi', () => {
    expect(valoriOrdinamento(ORDINAMENTI_PREFERITI)).toEqual([
      'createdAt,asc',
      'createdAt,desc',
      'prezzo,asc',
      'prezzo,desc',
      'nome,asc',
      'nome,desc',
    ])
  })
})

describe('leggiOrdinamento', () => {
  it('senza verso è crescente', () => {
    expect(leggiOrdinamento('nome')).toEqual({ campo: 'nome', verso: 'asc' })
  })
})
