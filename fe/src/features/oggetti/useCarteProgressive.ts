import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { CarteProgressive, RichiestaCarte } from '../../types/api'
import { aPezziDopo, inAttesa, intervalloPolling, paginaDaChiedere } from './carteProgressive'

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
  // fallito: niente richieste ripetute (vedi intervalloPolling). Resta finché si cambia pagina o si ricarica
  const [fallitoPer, setFallitoPer] = useState<K | null>(null)

  const query = usaQuery(
    { chiave, pagina: paginaDaChiedere(aPezzi, paginaUrl) },
    { skip: opzioni.skip, pollingInterval: intervalloPolling(aPezzi, fallitoPer === chiave) },
  )
  const dati = query.currentData
  const dopo = aPezziDopo(dati, aPezzi)
  const fallito = dati?.fallito ?? false
  // aggiornamenti durante il render (come in ModaleCarta): al prossimo render la richiesta segue la modalità
  if (dopo !== aPezzi) setAPezziPer(dopo ? chiave : null)
  if (dati && fallito !== (fallitoPer === chiave)) setFallitoPer(fallito ? chiave : null)
  const totaleServer = dopo ? dati?.totale : undefined

  return {
    carte: dati?.carte,
    // solo a pezzi: il totale delle carte, per le pagine della griglia
    totaleServer,
    aPezzi: dopo,
    fallito,
    // scheletro della griglia (vedi inAttesa)
    isLoading: inAttesa({ carte: dati?.carte, isError: query.isError, aPezzi: dopo, totaleServer, fallito }),
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
