import { useMemo } from 'react'
import { useAppSelector } from '../../app/hooks'
import { selectUtente } from '../auth/authSlice'
import { avanzamentoPokedex } from '../statistiche/calcoli'
import { useGetStatisticheQuery } from '../statistiche/statisticheApi'

// Pokémon di cui l'utente ha almeno una carta, dalle statistiche. null per gli ospiti e finché non arrivano:
// senza dati non si segna niente come mancante
export function usePokemonPosseduti() {
  const utente = useAppSelector(selectUtente)
  const { data } = useGetStatisticheQuery(undefined, { skip: !utente })
  return useMemo(() => {
    if (!utente || !data) return null
    const avanzamento = avanzamentoPokedex(data.pokemon)
    return { ...avanzamento, insieme: new Set(data.pokemon) }
  }, [utente, data])
}

export type PokemonPosseduti = NonNullable<ReturnType<typeof usePokemonPosseduti>>
