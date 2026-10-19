import { describe, expect, it } from 'vitest'
import type { Copia, Oggetto, Variante } from '../../types/api'
import { conteggioMaster, creaMappa, filtra } from './conteggi'

const carta = (id: string, varianti: Variante[]) => ({ id, varianti, rarita: 'Common' }) as Oggetto
const copia = (oggettoId: string, variante: Variante): Copia => ({ oggettoId, variante, quantita: 1 })

// A ha la reverse, B e C no; C ha una reverse fuori regola
const A = carta('A', ['NORMALE', 'REVERSE_HOLO'])
const B = carta('B', ['NORMALE'])
const C = carta('C', ['NORMALE'])
const CARTE = [A, B, C]

describe('conteggioMaster', () => {
  it('conta le voci possedute, non le reverse fuori regola', () => {
    const mappa = creaMappa([copia('A', 'REVERSE_HOLO'), copia('C', 'REVERSE_HOLO')])
    expect(conteggioMaster(CARTE, mappa, false)).toEqual({ possedute: 1, totale: 4 })
  })
})

describe('filtra con il master', () => {
  const ids = (carte: Oggetto[]) => carte.map((c) => c.id)

  it('mancanti: almeno una voce mancante', () => {
    const mappa = creaMappa([copia('A', 'REVERSE_HOLO'), copia('C', 'REVERSE_HOLO')])
    expect(ids(filtra(CARTE, mappa, 'mancanti', { senzaDati: false }))).toEqual(['A', 'B', 'C'])
    expect(ids(filtra(CARTE, mappa, 'possedute', { senzaDati: false }))).toEqual([])
  })

  it('possedute: tutte le voci', () => {
    const mappa = creaMappa([copia('A', 'REVERSE_HOLO'), copia('A', 'NORMALE')])
    expect(ids(filtra(CARTE, mappa, 'possedute', { senzaDati: false }))).toEqual(['A'])
    expect(ids(filtra(CARTE, mappa, 'mancanti', { senzaDati: false }))).toEqual(['B', 'C'])
  })

  it('senza master resta una copia qualsiasi', () => {
    const mappa = creaMappa([copia('C', 'REVERSE_HOLO')])
    expect(ids(filtra(CARTE, mappa, 'possedute'))).toEqual(['C'])
  })
})
