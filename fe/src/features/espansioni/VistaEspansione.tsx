import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { messaggioErrore } from '../../app/errori'
import { Paginazione } from '../../components/Paginazione'
import { GrigliaSkeleton } from '../../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../../components/StatiPagina'
import type { Espansione, Oggetto } from '../../types/api'
import { GrigliaOggetti } from '../oggetti/GrigliaOggetti'
import { useGetCarteEspansioneQuery } from './espansioniApi'

// un set arriva a 250+ carte: si mostrano a pagine (8 righe da 3 accanto alla lista laterale)
const PER_PAGINA = 24

interface Props {
  espansione: Espansione
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onApri: (oggetto: Oggetto) => void
}

// intestazione e carte di un solo set
export function VistaEspansione({ espansione, isPreferito, onTogglePreferito, onApri }: Props) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCarteEspansioneQuery(espansione.id)
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const intestazione = useRef<HTMLElement>(null)
  const anno = espansione.dataUscita?.slice(0, 4)
  const totale = data?.length ?? espansione.totaleCarte

  // la pagina sta nell'URL (?page=, numerata da 0 come nel resto del sito): un link porta dritto lì
  const totalePagine = data ? Math.ceil(data.length / PER_PAGINA) : 0
  const richiesta = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const pagina = totalePagine > 0 ? Math.min(richiesta, totalePagine - 1) : 0
  const inizio = pagina * PER_PAGINA
  const carteDellaPagina = data?.slice(inizio, inizio + PER_PAGINA) ?? []

  // replace: cambiare pagina non aggiunge passi alla cronologia, così "Tutte le espansioni"
  // (che torna indietro di un numero preciso di passi) riporta sempre alla vetrina.
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

  // si riparte dall'inizio del set, non dal fondo della griglia appena lasciata
  const paginaPrecedente = useRef(pagina)
  useEffect(() => {
    if (paginaPrecedente.current !== pagina) intestazione.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    paginaPrecedente.current = pagina
  }, [pagina])

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <header ref={intestazione} className="mb-10 flex scroll-mt-28 flex-col items-start gap-5 sm:flex-row sm:items-center">
        {espansione.logoUrl && (
          // dimensioni esplicite + object-contain: i loghi quadrati o verticali (POP, promo) con
          // max-h-full restavano alti quanto la loro larghezza e uscivano dal riquadro
          <div className="relative h-28 w-full max-w-56 shrink-0 rounded-3xl bg-white shadow-lg shadow-blu-900/10">
            <img src={espansione.logoUrl} alt="" className="absolute inset-0 h-full w-full object-contain p-4" />
          </div>
        )}
        <div className="min-w-0">
          {espansione.serie && <p className="text-sm font-semibold uppercase tracking-wide text-blu-500">{espansione.serie}</p>}
          <h3 className="text-4xl font-bold text-blu-900">{espansione.nome}</h3>
          <p className="mt-1 flex items-center gap-2 text-blu-900/70">
            {espansione.simboloUrl && <img src={espansione.simboloUrl} alt="" className="size-5 object-contain" />}
            {[anno, totale != null && (totale === 1 ? '1 carta' : `${totale} carte`)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      {isLoading ? (
        <>
          {!espansione.importata && (
            <p role="status" className="mb-4 text-sm font-medium text-blu-900/70">
              Prima apertura: stiamo preparando le carte, può volerci qualche secondo…
            </p>
          )}
          <GrigliaSkeleton />
        </>
      ) : isError ? (
        <StatoErrore
          messaggio={messaggioErrore(error, 'Non è stato possibile caricare le carte di questa espansione.')}
          onRiprova={refetch}
        />
      ) : !data || data.length === 0 ? (
        <StatoVuoto
          icona={<Layers aria-hidden className="size-16" />}
          titolo="Nessuna carta"
          testo="Questa espansione non ha ancora carte in vetrina."
        />
      ) : (
        <>
          {totalePagine > 1 && (
            <p className="mb-4 text-sm font-medium text-blu-900/70">
              Carte {inizio + 1}–{inizio + carteDellaPagina.length} di {data.length}
            </p>
          )}
          <GrigliaOggetti
            chiave={`${espansione.id}-${pagina}`}
            elementi={carteDellaPagina.map((oggetto) => ({ oggetto }))}
            isPreferito={isPreferito}
            onTogglePreferito={onTogglePreferito}
            onApri={onApri}
            inAggiornamento={isFetching}
            stretta
          />
          <Paginazione pagina={pagina} totalePagine={totalePagine} onCambia={vaiAPagina} />
        </>
      )}
    </motion.div>
  )
}
