import { AnimatePresence, motion } from 'framer-motion'
import { Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { messaggioErrore } from '../../app/errori'
import { Skeleton } from '../../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../../components/StatiPagina'
import { useDebounce } from '../../hooks/useDebounce'
import type { Espansione, Oggetto } from '../../types/api'
import { griglia } from '../../theme/motion'
import { PannelloEspansione } from './PannelloEspansione'
import { TileEspansione } from './TileEspansione'
import { useGetEspansioniQuery } from './espansioniApi'

interface Props {
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onApri: (oggetto: Oggetto) => void
}

const CLASSI_GRIGLIA = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'

// espansioni raggruppate per serie (la più recente in alto); il set aperto vive nell'URL (?set=sv1)
export function VetrinaEspansioni({ isPreferito, onTogglePreferito, onApri }: Props) {
  const { data, isLoading, isError, error, refetch } = useGetEspansioniQuery()
  const [params, setParams] = useSearchParams()
  const [ricerca, setRicerca] = useState('')
  const filtro = useDebounce(ricerca.trim().toLowerCase(), 200)
  const aperta = params.get('set')

  const serie = useMemo(() => raggruppaPerSerie(data ?? [], filtro), [data, filtro])

  const apriChiudi = (id: string) =>
    setParams(
      (precedenti) => {
        const nuovi = new URLSearchParams(precedenti)
        if (nuovi.get('set') === id) nuovi.delete('set')
        else nuovi.set('set', id)
        return nuovi
      },
      { preventScrollReset: true },
    )

  if (isLoading) {
    return (
      <div role="status" aria-label="Caricamento delle espansioni" className={CLASSI_GRIGLIA}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
    )
  }
  if (isError) {
    return <StatoErrore messaggio={messaggioErrore(error, 'Non è stato possibile caricare le espansioni.')} onRiprova={refetch} />
  }
  if (!data || data.length === 0) {
    return (
      <StatoVuoto
        icona={<Sparkles aria-hidden className="size-16" />}
        titolo="Nessuna espansione"
        testo="Le espansioni arriveranno presto: torna a trovarci!"
      />
    )
  }

  return (
    <div>
      <label className="relative mb-10 block max-w-md">
        <span className="sr-only">Cerca un'espansione</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-blu-500" />
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca un'espansione o una serie…"
          className="w-full rounded-full bg-white py-3 pl-12 pr-5 text-blu-900 shadow-md shadow-blu-900/10 ring-1 ring-blu-900/10 outline-none placeholder:text-blu-900/50 focus:ring-2 focus:ring-blu-500"
        />
      </label>

      {serie.length === 0 ? (
        <StatoVuoto
          icona={<Search aria-hidden className="size-16" />}
          titolo="Nessun risultato"
          testo={`Nessuna espansione corrisponde a "${ricerca}".`}
        />
      ) : (
        <div className="space-y-14">
          {serie.map(({ nome, espansioni }) => {
            const apertaQui = espansioni.find((e) => e.id === aperta)
            return (
              <section key={nome} aria-labelledby={`serie-${nome}`}>
                <h3 id={`serie-${nome}`} className="mb-5 text-2xl font-bold text-blu-900">
                  {nome}
                  <span className="ml-3 text-base font-medium text-blu-900/60">{espansioni.length}</span>
                </h3>
                <motion.ul variants={griglia} initial="nascosto" whileInView="visibile" viewport={{ once: true, margin: '100px' }} className={CLASSI_GRIGLIA}>
                  {espansioni.map((espansione) => (
                    <TileEspansione
                      key={espansione.id}
                      espansione={espansione}
                      aperta={espansione.id === aperta}
                      onClick={() => apriChiudi(espansione.id)}
                    />
                  ))}
                </motion.ul>
                <AnimatePresence>
                  {apertaQui && (
                    <PannelloEspansione
                      key={apertaQui.id}
                      espansione={apertaQui}
                      isPreferito={isPreferito}
                      onTogglePreferito={onTogglePreferito}
                      onApri={onApri}
                      onChiudi={() => apriChiudi(apertaQui.id)}
                    />
                  )}
                </AnimatePresence>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

// mantiene l'ordine del backend (dalla più recente): la serie compare dove compare il suo set più nuovo
function raggruppaPerSerie(espansioni: Espansione[], filtro: string) {
  const gruppi = new Map<string, Espansione[]>()
  for (const espansione of espansioni) {
    const serie = espansione.serie || 'Altre'
    if (filtro && !espansione.nome.toLowerCase().includes(filtro) && !serie.toLowerCase().includes(filtro)) continue
    const gruppo = gruppi.get(serie)
    if (gruppo) gruppo.push(espansione)
    else gruppi.set(serie, [espansione])
  }
  return [...gruppi].map(([nome, espansioni]) => ({ nome, espansioni }))
}
