import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { CarteProgressive, RichiestaCarte, StatoCarte } from '../../types/api'
import { argomentoCarte, inAttesa, intervalloPolling, modalitaDopo, paginaDaPrecaricare, vistaCarte, type ModalitaCarte } from './carteProgressive'

interface RisultatoQuery {
  currentData?: CarteProgressive
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error?: unknown
  refetch: () => unknown
}

type UsaQuery<K> = (arg: RichiestaCarte<K>, opzioni: { skip?: boolean }) => RisultatoQuery

type UsaStato<K> = (chiave: K, opzioni: { skip?: boolean; pollingInterval?: number }) => { currentData?: StatoCarte }

// Carte di un set, di un Pokémon o di un artista. Completo: la lista intera, come sempre. Alla prima apertura il
// backend risponde "a pezzi": solo la pagina dell'URL (?page=), presa al volo da TCGdex, mentre il resto si
// scarica in background. Finché non è completa si controlla ogni 3 secondi lo stato leggero (usaStato), non la pagina
export function useCarteProgressive<K extends string | number>(
  usaQuery: UsaQuery<K>,
  usaStato: UsaStato<K>,
  chiave: K,
  opzioni: { skip?: boolean } = {},
) {
  const [params] = useSearchParams()
  const paginaUrl = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  // modalità per chiave: cambiando set o Pokémon si riparte da "sconosciuta"
  const [memoria, setMemoria] = useState<{ chiave: K; modalita: ModalitaCarte; fallito: boolean }>({
    chiave,
    modalita: 'sconosciuta',
    fallito: false,
  })
  const corrente = memoria.chiave === chiave ? memoria : { chiave, modalita: 'sconosciuta' as const, fallito: false }

  const query = usaQuery(argomentoCarte(chiave, corrente.modalita, paginaUrl), { skip: opzioni.skip })
  // lo stato si chiede solo a pezzi; da fallito più di rado (niente skip, che toglierebbe il dato e farebbe
  // rimbalzare fallito tra vero e falso)
  const stato = usaStato(chiave, {
    skip: opzioni.skip || corrente.modalita !== 'a-pezzi',
    pollingInterval: intervalloPolling(corrente.modalita === 'a-pezzi', corrente.fallito),
  }).currentData
  const dati = query.currentData
  const modalita = modalitaDopo(corrente.modalita, dati, stato)
  const fallito = modalita === 'a-pezzi' && (stato?.fallito ?? dati?.fallito ?? false)
  // aggiornamento durante il render (come in ModaleCarta): la modalità va solo avanti, quindi al più due volte per chiave
  if (memoria.chiave !== chiave || modalita !== corrente.modalita || fallito !== corrente.fallito) {
    setMemoria({ chiave, modalita, fallito })
  }
  // l'ultima pagina a pezzi vista: resta in griglia finché la lista intera non arriva (vedi vistaCarte)
  const ultima = useRef<{ chiave: K; dati: CarteProgressive } | null>(null)
  if (dati && !dati.completo) ultima.current = { chiave, dati }
  const { carte, totaleServer, aPezzi } = vistaCarte(modalita, dati, ultima.current?.chiave === chiave ? ultima.current.dati : undefined)
  // la pagina successiva, chiesta in anticipo (una richiesta sola, senza polling); skip quando non serve
  const daPrecaricare = paginaDaPrecaricare(modalita, paginaUrl, totaleServer, fallito)
  usaQuery(argomentoCarte(chiave, 'a-pezzi', daPrecaricare ?? 0), { skip: opzioni.skip || daPrecaricare === undefined })

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
