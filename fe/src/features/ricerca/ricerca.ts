import type { Artista, Espansione } from '../../types/api'
import { normalizza } from '../artisti/artisti'
import { numeroFormattato, POKEDEX, spriteUrl, type Pokemon } from '../pokedex/pokedex'

// una riga della ricerca unica della navbar: dove porta, cosa scrivere e quale immagine mostrare
export interface Risultato {
  tipo: 'set' | 'pokemon' | 'artista'
  a: string
  nome: string
  dettaglio: string
  immagine: string | null
}

export interface GruppoRisultati {
  titolo: string
  risultati: Risultato[]
}

// righe per gruppo: con tre gruppi la lista sta in uno schermo di telefono
export const PER_GRUPPO = 4
// a campo vuoto: i set più nuovi, per partire da qualcosa
const SET_SUGGERITI = 3

// quanto bene il nome corrisponde: prima chi inizia col testo, poi chi ha una parola che inizia col testo, poi il resto.
// -1 = non corrisponde
function punteggio(nome: string, filtro: string): number {
  const pulito = normalizza(nome)
  const posizione = pulito.indexOf(filtro)
  if (posizione < 0) return -1
  if (posizione === 0) return 0
  return /[\s\-'.(]/.test(pulito[posizione - 1]) ? 1 : 2
}

// i migliori per punteggio; a pari punteggio resta l'ordine dell'elenco
function migliori<T>(elenco: T[], valuta: (elemento: T) => number): T[] {
  return elenco
    .map((elemento, indice) => ({ elemento, indice, voto: valuta(elemento) }))
    .filter(({ voto }) => voto >= 0)
    .sort((a, b) => a.voto - b.voto || a.indice - b.indice)
    .slice(0, PER_GRUPPO)
    .map(({ elemento }) => elemento)
}

// dal più nuovo; i set senza data in fondo
function perData(a: Espansione, b: Espansione): number {
  return (b.dataUscita ?? '').localeCompare(a.dataUscita ?? '')
}

function daSet(espansione: Espansione): Risultato {
  const anno = espansione.dataUscita?.slice(0, 4)
  return {
    tipo: 'set',
    a: `/espansioni/${encodeURIComponent(espansione.id)}`,
    nome: espansione.nome,
    dettaglio: [espansione.serie || 'Altre', anno].filter(Boolean).join(' · '),
    immagine: espansione.simboloUrl,
  }
}

function daPokemon(pokemon: Pokemon): Risultato {
  return {
    tipo: 'pokemon',
    a: `/pokedex/${pokemon.numero}`,
    nome: pokemon.nome,
    dettaglio: [numeroFormattato(pokemon.numero), pokemon.nomeInglese].filter(Boolean).join(' · '),
    immagine: spriteUrl(pokemon.numero),
  }
}

function daArtista(artista: Artista): Risultato {
  return {
    tipo: 'artista',
    a: `/artisti/${encodeURIComponent(artista.slug)}`,
    nome: artista.nome,
    dettaglio: `${artista.carte.toLocaleString('it-IT')} ${artista.carte === 1 ? 'carta' : 'carte'}`,
    immagine: artista.avatar,
  }
}

// Pokémon per numero ("25", "#025") o per nome, italiano o inglese
function valutaPokemon(pokemon: Pokemon, filtro: string): number {
  const cifre = filtro.replace(/^#/, '')
  if (/^\d+$/.test(cifre)) {
    const numero = String(pokemon.numero)
    // "25" trova prima il 25, poi 250-259 (si sta ancora scrivendo); "025" solo il 25
    if (cifre.startsWith('0') || filtro.startsWith('#')) return numeroFormattato(pokemon.numero) === `#${cifre.padStart(3, '0')}` ? 0 : -1
    return numero === cifre ? 0 : numero.startsWith(cifre) ? 1 : -1
  }
  const voti = [punteggio(pokemon.nome, filtro), pokemon.nomeInglese ? punteggio(pokemon.nomeInglese, filtro) : -1].filter((v) => v >= 0)
  return voti.length ? Math.min(...voti) : -1
}

// Ricerca unica della navbar: set, Pokémon e artisti in tre gruppi, al massimo PER_GRUPPO righe ciascuno.
// Senza testo i set più nuovi. Maiuscole e accenti non contano
export function cerca(testo: string, espansioni: Espansione[], artisti: Artista[]): GruppoRisultati[] {
  const filtro = normalizza(testo.trim())
  const setRecenti = [...espansioni].sort(perData)
  if (!filtro) return setRecenti.length ? [{ titolo: 'Set più nuovi', risultati: setRecenti.slice(0, SET_SUGGERITI).map(daSet) }] : []

  const gruppi: GruppoRisultati[] = [
    { titolo: 'Set', risultati: migliori(setRecenti, (e) => punteggio(e.nome, filtro)).map(daSet) },
    { titolo: 'Pokémon', risultati: migliori(POKEDEX, (p) => valutaPokemon(p, filtro)).map(daPokemon) },
    { titolo: 'Artisti', risultati: migliori(artisti, (a) => punteggio(a.nome, filtro)).map(daArtista) },
  ]
  return gruppi.filter((gruppo) => gruppo.risultati.length > 0)
}
