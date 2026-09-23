import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { useState } from 'react'
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
}

// intestazione e carte di un solo set
export function VistaEspansione({ espansione, isPreferito, onTogglePreferito, onApri }: Props) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCarteEspansioneQuery(espansione.id)
  const [visibili, setVisibili] = useState(BLOCCO)
  const anno = espansione.dataUscita?.slice(0, 4)
  const totale = data?.length ?? espansione.totaleCarte

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <header className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {espansione.logoUrl && (
          <div className="grid h-28 w-full max-w-56 shrink-0 place-items-center rounded-3xl bg-white p-4 shadow-lg shadow-blu-900/10">
            <img src={espansione.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
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
          <GrigliaOggetti
            chiave={espansione.id}
            elementi={data.slice(0, visibili).map((oggetto) => ({ oggetto }))}
            isPreferito={isPreferito}
            onTogglePreferito={onTogglePreferito}
            onApri={onApri}
            inAggiornamento={isFetching}
            stretta
          />
          {visibili < data.length && (
            <div className="mt-10 flex justify-center">
              <Button variante="primario" onClick={() => setVisibili((n) => n + BLOCCO)}>
                Mostra altre carte ({data.length - visibili})
              </Button>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
