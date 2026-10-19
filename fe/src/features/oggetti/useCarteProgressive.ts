import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { CarteProgressive, RichiestaCarte } from '../../types/api'
import { argomentoCarte, inAttesa, intervalloPolling, modalitaDopo, type ModalitaCarte } from './carteProgressive'

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
  // modalità per chiave: cambiando set o Pokémon si riparte da "sconosciuta"
  const [stato, setStato] = useState<{ chiave: K; modalita: ModalitaCarte; fallito: boolean }>({
    chiave,
    modalita: 'sconosciuta',
    fallito: false,
  })
  const corrente = stato.chiave === chiave ? stato : { chiave, modalita: 'sconosciuta' as const, fallito: false }

  const query = usaQuery(argomentoCarte(chiave, corrente.modalita, paginaUrl), {
    skip: opzioni.skip,
    pollingInterval: intervalloPolling(corrente.modalita === 'a-pezzi', corrente.fallito),
  })
  const dati = query.currentData
  const modalita = modalitaDopo(corrente.modalita, dati)
  const fallito = modalita === 'a-pezzi' && (dati?.fallito ?? false)
  // aggiornamento durante il render (come in ModaleCarta): la modalità va solo avanti, quindi al più due volte per chiave
  if (stato.chiave !== chiave || modalita !== corrente.modalita || fallito !== corrente.fallito) {
    setStato({ chiave, modalita, fallito })
  }
  const aPezzi = modalita === 'a-pezzi'
  // completa: si usano solo risposte complete (una vecchia a pezzi in cache non è la lista intera)
  const carte = aPezzi || dati?.completo ? dati?.carte : undefined
  const totaleServer = aPezzi ? dati?.totale : undefined

  return {
    carte,
    // solo a pezzi: il totale delle carte, per le pagine della griglia
    totaleServer,
    aPezzi,
    fallito,
    // scheletro della griglia (vedi inAttesa)
    isLoading: inAttesa({ carte, isError: query.isError, aPezzi, totaleServer, fallito }),
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
