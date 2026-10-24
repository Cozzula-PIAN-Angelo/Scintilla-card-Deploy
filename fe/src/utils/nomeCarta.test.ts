import { describe, expect, it } from 'vitest'
import { dividiNomeCarta } from './nomeCarta'

describe('dividiNomeCarta', () => {
  it('separa nome, set e numero', () => {
    expect(dividiNomeCarta('Bulbasaur (Mega Evolution 1/132)')).toEqual({
      nome: 'Bulbasaur',
      set: 'Mega Evolution',
      numero: '1/132',
    })
  })

  it('accetta numeri con lettere', () => {
    expect(dividiNomeCarta('Golduck (Aquapolis 50a/147)')).toEqual({ nome: 'Golduck', set: 'Aquapolis', numero: '50a/147' })
    expect(dividiNomeCarta('Pikachu (SVP Black Star Promos SVP001)')).toEqual({
      nome: 'Pikachu',
      set: 'SVP Black Star Promos',
      numero: 'SVP001',
    })
  })

  it('tiene le parentesi dentro il nome', () => {
    expect(dividiNomeCarta('Mew (Shining) (Shining Legends 77/73)')).toEqual({
      nome: 'Mew (Shining)',
      set: 'Shining Legends',
      numero: '77/73',
    })
  })

  it('senza numero lascia tutto il set', () => {
    expect(dividiNomeCarta('Energia (Trainer kit)')).toEqual({ nome: 'Energia', set: 'Trainer kit', numero: null })
  })

  it('senza parentesi è solo un nome', () => {
    expect(dividiNomeCarta('Darkrai & Cresselia LEGEND')).toEqual({ nome: 'Darkrai & Cresselia LEGEND', set: null, numero: null })
  })
})
