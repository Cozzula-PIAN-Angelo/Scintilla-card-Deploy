import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { CarteProgressive, RichiestaCarte } from '../../types/api'
import { aPezziDopo, paginaDaChiedere } from './carteProgressive'

// ogni quanto si richiede la pagina mentre il resto delle carte si scarica in background
const POLLING_MS = 3000

interface RisultatoQuery {
  currentData?: CarteProgressive
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error?: unknown
  refetch: () => unknown
}

type UsaQuery<K> = (arg: RichiestaCarte<K>, opzioni: { skip?: boolean; pollingInterval?: number }) => RisultatoQuery

// Carte di un set, di un Pokémon o di un artista. Completo: la lista intera, come sempre. Alla prima apertura il
// backend risponde "a pezzi": solo la pagina dell'URL (?page=), presa al volo da pokemontcg.io, mentre il resto si
// scarica in background; la pagina si richiede ogni 3 secondi finché la lista non è completa
export function useCarteProgressive<K extends string | number>(usaQuery: UsaQuery<K>, chiave: K, opzioni: { skip?: boolean } = {}) {
  const [params] = useSearchParams()
  const paginaUrl = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  // chiave per cui l'ultima risposta era a pezzi: cambiando set o Pokémon si riparte dalla lista intera
  const [aPezziPer, setAPezziPer] = useState<K | null>(null)
  const aPezzi = aPezziPer === chiave

  const query = usaQuery(
    { chiave, pagina: paginaDaChiedere(aPezzi, paginaUrl) },
    { skip: opzioni.skip, pollingInterval: aPezzi ? POLLING_MS : 0 },
  )
  const dati = query.currentData
  const dopo = aPezziDopo(dati, aPezzi)
  // aggiornamento durante il render (come in ModaleCarta): al prossimo render la richiesta segue la modalità
  if (dopo !== aPezzi) setAPezziPer(dopo ? chiave : null)

  return {
    carte: dati?.carte,
    // solo a pezzi: il totale delle carte, per le pagine della griglia
    totaleServer: dopo ? dati?.totale : undefined,
    aPezzi: dopo,
    fallito: dati?.fallito ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
