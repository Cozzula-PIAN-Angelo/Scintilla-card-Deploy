import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { GrigliaSkeleton } from '../../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../../components/StatiPagina'
import type { Espansione, Oggetto } from '../../types/api'
import { GrigliaOggetti } from '../oggetti/GrigliaOggetti'
import { useGetCarteEspansioneQuery } from './espansioniApi'

// un set arriva a 250+ carte: si mostrano a blocchi, così la cascata d'ingresso resta breve
const BLOCCO = 24

interface Props {
  espansione: Espansione
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onApri: (oggetto: Oggetto) => void
  onChiudi: () => void
}

// carte di un'espansione, rivelate sotto la griglia della sua serie
export function PannelloEspansione({ espansione, isPreferito, onTogglePreferito, onApri, onChiudi }: Props) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCarteEspansioneQuery(espansione.id)
  const pannello = useRef<HTMLDivElement>(null)
  const [visibili, setVisibili] = useState(BLOCCO)

  // all'apertura il pannello entra nella visuale
  useEffect(() => {
    const timer = window.setTimeout(() => pannello.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => window.clearTimeout(timer)
  }, [espansione.id])

  return (
    <motion.div
      ref={pannello}
      id={`pannello-${espansione.id}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="scroll-mt-24 overflow-hidden"
    >
      <div className="mt-6 rounded-[2rem] bg-blu-50 p-4 ring-1 ring-blu-900/5 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {espansione.logoUrl && <img src={espansione.logoUrl} alt="" className="h-12 max-w-32 object-contain" />}
            <div className="min-w-0">
              <h4 className="truncate text-2xl font-bold text-blu-900">{espansione.nome}</h4>
              {data && <p className="text-sm text-blu-900/70">{data.length === 1 ? '1 carta' : `${data.length} carte`}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onChiudi}
            aria-label={`Chiudi ${espansione.nome}`}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-blu-700 shadow-md transition-colors hover:bg-blu-500 hover:text-white"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        {isLoading ? (
          <>
            {!espansione.importata && (
              <p role="status" className="mb-4 text-sm font-medium text-blu-900/70">
                Prima apertura: stiamo preparando le carte, può volerci qualche secondo…
              </p>
            )}
            <GrigliaSkeleton quante={4} />
          </>
        ) : isError ? (
          <StatoErrore
            messaggio={messaggioErrore(error, 'Non è stato possibile caricare le carte di questa espansione.')}
            onRiprova={refetch}
          />
        ) : !data || data.length === 0 ? (
          <StatoVuoto
            icona={<X aria-hidden className="size-16" />}
            titolo="Nessuna carta"
            testo="Questa espansione non ha ancora carte in vetrina."
          />
        ) : (
          <>
            <GrigliaOggetti
              chiave={espansione.id}
              elementi={data.slice(0, visibili).map((oggetto) => ({ oggetto }))}
              isPreferito={isPreferito}
              onTogglePreferito={onTogglePreferito}
              onApri={onApri}
              inAggiornamento={isFetching}
            />
            {visibili < data.length && (
              <div className="mt-8 flex justify-center">
                <Button variante="primario" onClick={() => setVisibili((n) => n + BLOCCO)}>
                  Mostra altre carte ({data.length - visibili})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
