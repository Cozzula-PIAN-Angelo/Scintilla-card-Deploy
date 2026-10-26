import type { ReactNode } from 'react'
import { DALL_ELENCO } from '../../hooks/useRitornoElenco'
import { memoriaPokedex } from './memoriaPokedex'
import { corrisponde, type Pokemon } from './pokedex'
import type { PokemonPosseduti } from './usePokemonPosseduti'

export type FiltroStato = 'tutti' | 'presi' | 'mancanti'

// cosa riceve ogni vista dell'indice: ricerca, filtro della collezione e chi è già in collezione (null = ospite)
export interface PropsVista {
  ricerca: string
  filtro: string
  stato: FiltroStato
  posseduti: PokemonPosseduti | null
  // barra attaccata sotto la navbar; generazioni: i salti propri della vista
  barra: (generazioni?: ReactNode) => ReactNode
}

export function filtraPokemon(lista: readonly Pokemon[], { filtro, stato, posseduti }: Pick<PropsVista, 'filtro' | 'stato' | 'posseduti'>) {
  return lista.filter(
    (p) => corrisponde(p, filtro) && (stato === 'tutti' || !posseduti || (stato === 'presi') === posseduti.insieme.has(p.numero)),
  )
}

// link a un Pokémon dall'indice: si ricordano punto e ultimo aperto, e "← Pokédex" torna qui anche dopo aver
// sfogliato altri Pokémon con le frecce
export function propsLinkPokemon(numero: number) {
  return {
    to: `/pokedex/${numero}`,
    state: DALL_ELENCO,
    onClick: () => {
      memoriaPokedex.posizione = window.scrollY
      memoriaPokedex.ultimo = numero
    },
  }
}

// stessa larghezza per fascia, barra e viste: i bordi si allineano
export const CONTENITORE_POKEDEX = 'mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8'
