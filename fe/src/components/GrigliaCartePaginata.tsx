import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { messaggioErrore } from '../app/errori'
import { GrigliaOggetti } from '../features/oggetti/GrigliaOggetti'
import type { Oggetto } from '../types/api'
import { Paginazione } from './Paginazione'
import { GrigliaSkeleton } from './Skeleton'
import { StatoErrore, StatoVuoto } from './StatiPagina'

// un set o un Pokémon arrivano a 250+ carte: si mostrano a pagine
const PER_PAGINA = 24

interface Props {
  // cambia a ogni set/Pokémon: la griglia si rimonta e le carte rientrano a cascata
  chiave: string
  carte: Oggetto[] | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  refetch: () => void
  // mostrato durante il caricamento, es. per avvisare che la prima apertura è lenta
  avvisoCaricamento?: string
  erroreGenerico: string
  vuoto: { icona: ReactNode; titolo: string; testo: string }
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onApri: (oggetto: Oggetto) => void
  stretta?: boolean
}

// griglia di carte con paginazione; la pagina sta nell'URL (?page=, numerata da 0 come nel resto
// del sito), così un link porta dritto lì
export function GrigliaCartePaginata({
  chiave,
  carte,
  isLoading,
  isFetching,
  isError,
  error,
  refetch,
  avvisoCaricamento,
  erroreGenerico,
  vuoto,
  isPreferito,
  onTogglePreferito,
  onApri,
  stretta,
}: Props) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const inizioGriglia = useRef<HTMLDivElement>(null)

  const totalePagine = carte ? Math.ceil(carte.length / PER_PAGINA) : 0
  const richiesta = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const pagina = totalePagine > 0 ? Math.min(richiesta, totalePagine - 1) : 0
  const inizio = pagina * PER_PAGINA
  const carteDellaPagina = carte?.slice(inizio, inizio + PER_PAGINA) ?? []

  // replace: cambiare pagina non aggiunge passi alla cronologia, così i pulsanti "indietro" delle
  // pagine (che tornano indietro di un numero preciso di passi) riportano sempre all'elenco.
  // Lo state va ripassato, altrimenti con replace si perde il conteggio di quei passi
  const vaiAPagina = (nuova: number) =>
    setParams(
      (precedenti) => {
        const nuovi = new URLSearchParams(precedenti)
        if (nuova > 0) nuovi.set('page', String(nuova))
        else nuovi.delete('page')
        return nuovi
      },
      { replace: true, state: location.state },
    )

  // cambiando pagina si riparte dall'inizio della griglia, non dal fondo di quella appena lasciata
  const paginaPrecedente = useRef(pagina)
  useEffect(() => {
    if (paginaPrecedente.current !== pagina) inizioGriglia.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    paginaPrecedente.current = pagina
  }, [pagina])

  if (isLoading) {
    return (
      <>
        {avvisoCaricamento && (
          <p role="status" className="mb-4 text-sm font-medium text-testo/70">
            {avvisoCaricamento}
          </p>
        )}
        <GrigliaSkeleton />
      </>
    )
  }
  if (isError) {
    return <StatoErrore messaggio={messaggioErrore(error, erroreGenerico)} onRiprova={refetch} />
  }
  if (!carte || carte.length === 0) {
    return <StatoVuoto icona={vuoto.icona} titolo={vuoto.titolo} testo={vuoto.testo} />
  }

  return (
    <div ref={inizioGriglia} className="scroll-mt-28">
      {totalePagine > 1 && (
        <p className="mb-4 text-sm font-medium text-testo/70">
          Carte {inizio + 1}–{inizio + carteDellaPagina.length} di {carte.length}
        </p>
      )}
      <GrigliaOggetti
        chiave={`${chiave}-${pagina}`}
        elementi={carteDellaPagina.map((oggetto) => ({ oggetto }))}
        isPreferito={isPreferito}
        onTogglePreferito={onTogglePreferito}
        onApri={onApri}
        inAggiornamento={isFetching}
        stretta={stretta}
      />
      <Paginazione pagina={pagina} totalePagine={totalePagine} onCambia={vaiAPagina} />
    </div>
  )
}
