import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Layers } from 'lucide-react'
import { GrigliaCartePaginata } from '../../components/GrigliaCartePaginata'
import { BarraCollezione } from '../collezione/BarraCollezione'
import { conteggio, filtra, vuotoFiltro } from '../collezione/conteggi'
import { useCollezione } from '../collezione/useCollezione'
import { useFiltroCollezione } from '../collezione/useFiltroCollezione'
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
  const { filtro, setFiltro } = useFiltroCollezione()
  const filtroPagina = useMemo(() => ({ espansione: espansione.id }), [espansione.id])
  const collezione = useCollezione(filtroPagina)
  const carte = useMemo(() => (data && collezione.pronta ? filtra(data, collezione.mappa, filtro) : data), [data, collezione.pronta, collezione.mappa, filtro])
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

      {collezione.pronta && data && (
        <BarraCollezione
          {...conteggio(data, collezione.mappa)}
          filtro={filtro}
          onFiltro={setFiltro}
          aColori={collezione.aColori}
          onAlternaColori={collezione.alternaColori}
        />
      )}

      <GrigliaCartePaginata
        chiave={espansione.id}
        carte={carte}
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
        collezione={collezione.pronta ? collezione : undefined}
        vuotoFiltro={collezione.pronta && data && data.length > 0 ? vuotoFiltro(filtro) : undefined}
      />
    </motion.div>
  )
}
