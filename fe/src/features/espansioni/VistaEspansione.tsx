import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'
import { GrigliaCartePaginata } from '../../components/GrigliaCartePaginata'
import type { Espansione, Oggetto } from '../../types/api'
import { useGetCarteEspansioneQuery } from './espansioniApi'

interface Props {
  espansione: Espansione
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onApri: (oggetto: Oggetto) => void
}

// intestazione e carte di un solo set
export function VistaEspansione({ espansione, isPreferito, onTogglePreferito, onApri }: Props) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCarteEspansioneQuery(espansione.id)
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
          // dimensioni esplicite + object-contain: i loghi quadrati o verticali (POP, promo) con
          // max-h-full restavano alti quanto la loro larghezza e uscivano dal riquadro
          <div className="relative h-28 w-full max-w-56 shrink-0 rounded-3xl bg-superficie shadow-lg shadow-ombra/10">
            <img src={espansione.logoUrl} alt="" className="absolute inset-0 h-full w-full object-contain p-4" />
          </div>
        )}
        <div className="min-w-0">
          {espansione.serie && <p className="text-sm font-semibold uppercase tracking-wide text-accento">{espansione.serie}</p>}
          <h3 className="text-4xl font-bold text-testo">{espansione.nome}</h3>
          <p className="mt-1 flex items-center gap-2 text-testo/70">
            {espansione.simboloUrl && <img src={espansione.simboloUrl} alt="" className="size-5 object-contain" />}
            {[anno, totale != null && (totale === 1 ? '1 carta' : `${totale} carte`)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      <GrigliaCartePaginata
        chiave={espansione.id}
        carte={data}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        refetch={refetch}
        avvisoCaricamento={espansione.importata ? undefined : 'Prima apertura: stiamo preparando le carte, può volerci qualche secondo…'}
        erroreGenerico="Non è stato possibile caricare le carte di questa espansione."
        vuoto={{
          icona: <Layers aria-hidden className="size-16" />,
          titolo: 'Nessuna carta',
          testo: 'Questa espansione non ha ancora carte in vetrina.',
        }}
        isPreferito={isPreferito}
        onTogglePreferito={onTogglePreferito}
        onApri={onApri}
        stretta
      />
    </motion.div>
  )
}
