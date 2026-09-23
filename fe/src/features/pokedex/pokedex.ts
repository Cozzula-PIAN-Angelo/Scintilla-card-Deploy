import dati from './pokedex.json'

// Pokédex nazionale (1025 specie). pokedex.json è generato da PokeAPI: [numero, nome italiano] oppure
// [numero, nome italiano, nome inglese] quando i due sono diversi (i Paradosso, Tipo Zero...)
export interface Pokemon {
  numero: number
  nome: string
  // nome inglese, quello scritto sulle carte; solo se diverso dall'italiano
  nomeInglese?: string
}

export const POKEDEX: Pokemon[] = (dati as Array<[number, string] | [number, string, string]>).map(([numero, nome, nomeInglese]) => ({
  numero,
  nome,
  nomeInglese,
}))

export const GENERAZIONI = [
  { numero: 1, sigla: 'I', regione: 'Kanto', da: 1, a: 151 },
  { numero: 2, sigla: 'II', regione: 'Johto', da: 152, a: 251 },
  { numero: 3, sigla: 'III', regione: 'Hoenn', da: 252, a: 386 },
  { numero: 4, sigla: 'IV', regione: 'Sinnoh', da: 387, a: 493 },
  { numero: 5, sigla: 'V', regione: 'Unima', da: 494, a: 649 },
  { numero: 6, sigla: 'VI', regione: 'Kalos', da: 650, a: 721 },
  { numero: 7, sigla: 'VII', regione: 'Alola', da: 722, a: 809 },
  { numero: 8, sigla: 'VIII', regione: 'Galar', da: 810, a: 905 },
  { numero: 9, sigla: 'IX', regione: 'Paldea', da: 906, a: 1025 },
] as const

export type Generazione = (typeof GENERAZIONI)[number]

export function trovaPokemon(numero: number): Pokemon | undefined {
  return POKEDEX[numero - 1]
}

export function generazioneDi(numero: number): Generazione | undefined {
  return GENERAZIONI.find((g) => numero >= g.da && numero <= g.a)
}

// sprite in pixel art 96x96 del repository di PokeAPI
export function spriteUrl(numero: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${numero}.png`
}

export function numeroFormattato(numero: number): string {
  return `#${String(numero).padStart(3, '0')}`
}

// cerca per nome (italiano o inglese, anche parziale) o per numero: "25" trova 25 e 250-259 (si sta
// ancora scrivendo), "#025" o "025" solo il numero in formato a tre cifre
export function corrisponde(pokemon: Pokemon, filtro: string): boolean {
  if (!filtro) return true
  const cifre = filtro.replace(/^#/, '')
  if (/^\d+$/.test(cifre)) {
    const formato = filtro.startsWith('#') || cifre.startsWith('0')
    return formato ? numeroFormattato(pokemon.numero).startsWith(`#${cifre}`) : String(pokemon.numero).startsWith(cifre)
  }
  return pokemon.nome.toLowerCase().includes(filtro) || (pokemon.nomeInglese?.toLowerCase().includes(filtro) ?? false)
}
