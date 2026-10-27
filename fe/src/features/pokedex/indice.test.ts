import { describe, expect, it } from 'vitest'
import { avanzamentoPokedex } from '../statistiche/calcoli'
import { filtraPokemon, testiVuoto } from './indice'
import { POKEDEX } from './pokedex'

const kanto = POKEDEX.slice(0, 151)
const posseduti = { ...avanzamentoPokedex([1, 4, 25]), insieme: new Set([1, 4, 25]) }
const numeri = (lista: { numero: number }[]) => lista.map((p) => p.numero)

describe('filtraPokemon', () => {
  it('senza ricerca e con Tutti lascia tutti', () => {
    expect(filtraPokemon(kanto, { filtro: '', stato: 'tutti', posseduti })).toHaveLength(151)
  })

  it("con Ce l'ho tiene solo quelli in collezione", () => {
    expect(numeri(filtraPokemon(kanto, { filtro: '', stato: 'presi', posseduti }))).toEqual([1, 4, 25])
  })

  it('con Mi mancano toglie quelli in collezione', () => {
    const mancanti = numeri(filtraPokemon(kanto, { filtro: '', stato: 'mancanti', posseduti }))
    expect(mancanti).toHaveLength(148)
    expect(mancanti).not.toContain(25)
  })

  it('da ospite il filtro della collezione non toglie nessuno', () => {
    expect(filtraPokemon(kanto, { filtro: '', stato: 'presi', posseduti: null })).toHaveLength(151)
  })

  it('ricerca e filtro insieme', () => {
    expect(numeri(filtraPokemon(POKEDEX, { filtro: 'pika', stato: 'presi', posseduti }))).toEqual([25])
    expect(filtraPokemon(POKEDEX, { filtro: 'pika', stato: 'mancanti', posseduti }).map((p) => p.nome)).not.toContain('Pikachu')
  })
})

describe('testiVuoto', () => {
  it('con la ricerca parla della ricerca', () => {
    expect(testiVuoto({ ricerca: ' pika ', filtro: 'pika', stato: 'presi' }).testo).toBe('Nessun Pokémon corrisponde a "pika".')
  })

  it("senza ricerca, con Ce l'ho, dice che la collezione è vuota", () => {
    expect(testiVuoto({ ricerca: '', filtro: '', stato: 'presi' }).titolo).toBe('Nessun Pokémon in collezione')
  })

  it('senza ricerca, con Mi mancano, festeggia il Pokédex completo', () => {
    expect(testiVuoto({ ricerca: '', filtro: '', stato: 'mancanti' }).titolo).toBe('Pokédex completo!')
  })
})
