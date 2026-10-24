import { describe, expect, it } from 'vitest'
import type { Artista, Espansione } from '../../types/api'
import { cerca, PER_GRUPPO } from './ricerca'

const set = (id: string, nome: string, dataUscita: string | null, serie: string | null = 'Base'): Espansione => ({
  id,
  nome,
  serie,
  dataUscita,
  totaleCarte: 100,
  carteUfficiali: 100,
  logoUrl: null,
  simboloUrl: null,
  importata: true,
  digitale: false,
  descrizione: null,
})

const artista = (slug: string, nome: string, carte = 10): Artista => ({ slug, nome, carte, avatar: null })

const ESPANSIONI = [
  set('base1', 'Base Set', '1999-01-09'),
  set('base4', 'Base Set 2', '2000-02-24'),
  set('sv10', 'Destined Rivals', '2025-05-30', 'Scarlet & Violet'),
  set('me02', 'Pitch Black', null, 'Mega Evolution'),
  set('sv03.5', '151', '2023-09-22', 'Scarlet & Violet'),
]
const ARTISTI = [artista('mitsuhiro-arita', 'Mitsuhiro Arita', 812), artista('mekayu', 'Mékayu', 1), artista('5ban-graphics', '5ban Graphics'), artista('marika', 'Marika'), artista('ariana', 'Ariana')]

const gruppo = (titolo: string, testo: string) => cerca(testo, ESPANSIONI, ARTISTI).find((g) => g.titolo === titolo)

describe('cerca', () => {
  it('senza testo propone i set più nuovi, quelli senza data in fondo', () => {
    const gruppi = cerca('  ', ESPANSIONI, ARTISTI)
    expect(gruppi).toHaveLength(1)
    expect(gruppi[0].titolo).toBe('Set più nuovi')
    expect(gruppi[0].risultati.map((r) => r.nome)).toEqual(['Destined Rivals', '151', 'Base Set 2'])
  })

  it('senza set caricati e senza testo non mostra gruppi', () => {
    expect(cerca('', [], [])).toEqual([])
  })

  it('trova i set per nome, maiuscole a parte, dal più nuovo', () => {
    expect(gruppo('Set', 'BASE')?.risultati.map((r) => r.nome)).toEqual(['Base Set 2', 'Base Set'])
  })

  it('chi inizia col testo viene prima di chi lo contiene', () => {
    expect(gruppo('Set', 'set')?.risultati.map((r) => r.nome)).toEqual(['Base Set 2', 'Base Set'])
    // Ariana inizia con "ari", Mitsuhiro Arita ha una parola che inizia così, Marika lo contiene soltanto
    expect(gruppo('Artisti', 'ari')?.risultati.map((r) => r.nome)).toEqual(['Ariana', 'Mitsuhiro Arita', 'Marika'])
  })

  it('i link portano alle pagine giuste', () => {
    expect(gruppo('Set', '151')?.risultati[0]).toMatchObject({ a: '/espansioni/sv03.5', dettaglio: 'Scarlet & Violet · 2023' })
    expect(gruppo('Pokémon', 'pikachu')?.risultati[0]).toMatchObject({ a: '/pokedex/25', dettaglio: '#025' })
    expect(gruppo('Artisti', 'arita')?.risultati[0]).toMatchObject({ a: '/artisti/mitsuhiro-arita', dettaglio: '812 carte' })
  })

  it('un set senza data non mostra l\'anno', () => {
    expect(gruppo('Set', 'pitch')?.risultati[0].dettaglio).toBe('Mega Evolution')
  })

  it('Pokémon per numero: esatto prima, poi quelli che iniziano così; con lo zero solo quello', () => {
    expect(gruppo('Pokémon', '25')?.risultati.map((r) => r.nome)[0]).toBe('Pikachu')
    expect(gruppo('Pokémon', '25')?.risultati).toHaveLength(PER_GRUPPO)
    expect(gruppo('Pokémon', '025')?.risultati.map((r) => r.nome)).toEqual(['Pikachu'])
    expect(gruppo('Pokémon', '#25')?.risultati.map((r) => r.nome)).toEqual(['Pikachu'])
  })

  it('Pokémon anche per nome inglese, mostrato accanto al numero', () => {
    const risultato = gruppo('Pokémon', 'great tusk')?.risultati[0]
    expect(risultato?.nome).not.toBe('Great Tusk')
    expect(risultato?.dettaglio).toBe('#984 · Great Tusk')
  })

  it('accenti e maiuscole non contano', () => {
    expect(gruppo('Artisti', 'MEKAYU')?.risultati[0]).toMatchObject({ nome: 'Mékayu', dettaglio: '1 carta' })
  })

  it('al massimo PER_GRUPPO righe per gruppo e niente gruppi vuoti', () => {
    const gruppi = cerca('a', ESPANSIONI, ARTISTI)
    for (const g of gruppi) expect(g.risultati.length).toBeLessThanOrEqual(PER_GRUPPO)
    expect(cerca('zzzz', ESPANSIONI, ARTISTI)).toEqual([])
  })
})
