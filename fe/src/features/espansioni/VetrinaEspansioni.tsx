import { motion } from 'framer-motion'
import { Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useNavigationType } from 'react-router'
import { messaggioErrore } from '../../app/errori'
import { Skeleton } from '../../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../../components/StatiPagina'
import { useDebounce } from '../../hooks/useDebounce'
import { griglia } from '../../theme/motion'
import { TileEspansione } from './TileEspansione'
import { useGetEspansioniQuery } from './espansioniApi'
import { memoriaElenco } from './memoriaElenco'
import { raggruppaPerSerie } from './raggruppaPerSerie'

// 5 per riga al massimo: i loghi sono larghi, è la larghezza del riquadro a deciderne la grandezza
const CLASSI_GRIGLIA = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

// espansioni raggruppate per serie (la più recente in alto); ogni set si apre nella sua pagina
export function VetrinaEspansioni() {
  const { data, isLoading, isError, error, refetch } = useGetEspansioniQuery()
  const navigate = useNavigate()
  const tipoNavigazione = useNavigationType()
  const [ricerca, setRicerca] = useState('')
  const filtro = useDebounce(ricerca.trim().toLowerCase(), 200)

  const serie = useMemo(() => raggruppaPerSerie(data ?? [], filtro), [data, filtro])

  // tornati dalla pagina di un set (indietro del browser o del sito): si riparte dallo stesso punto.
  // Salto istantaneo: il tema ha scroll-behavior smooth, che animerebbe migliaia di pixel
  const pronto = data !== undefined
  useEffect(() => {
    if (!pronto) return
    if (tipoNavigazione === 'POP' && memoriaElenco.posizione !== null) {
      window.scrollTo({ top: memoriaElenco.posizione, behavior: 'instant' })
    }
    memoriaElenco.posizione = null
  }, [pronto, tipoNavigazione])

  const apri = (id: string) => {
    memoriaElenco.posizione = window.scrollY
    memoriaElenco.ultimaAperta = id
    // passi di cronologia dalla vetrina: "Tutte le espansioni" torna qui anche dopo aver
    // cambiato set dalla lista laterale
    navigate(`/espansioni/${encodeURIComponent(id)}`, { state: { passiDallaVetrina: 1 } })
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="Caricamento delle espansioni" className={CLASSI_GRIGLIA}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-3xl" />
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
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-accento" />
        <input
          type="search"
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca un'espansione o una serie…"
          className="w-full rounded-full bg-superficie py-3 pl-12 pr-5 text-testo shadow-md shadow-ombra/10 ring-1 ring-linea/10 outline-none placeholder:text-testo/50 focus:ring-2 focus:ring-blu-500"
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
          {serie.map(({ nome, espansioni }) => (
            <section key={nome} aria-labelledby={`serie-${nome}`}>
              <h3 id={`serie-${nome}`} className="mb-5 text-2xl font-bold text-testo">
                {nome}
                <span className="ml-3 text-base font-medium text-testo/60">{espansioni.length}</span>
              </h3>
              <motion.ul variants={griglia} initial="nascosto" whileInView="visibile" viewport={{ once: true, margin: '100px' }} className={CLASSI_GRIGLIA}>
                {espansioni.map((espansione) => (
                  <TileEspansione
                    key={espansione.id}
                    espansione={espansione}
                    evidenziata={espansione.id === memoriaElenco.ultimaAperta}
                    onClick={() => apri(espansione.id)}
                  />
                ))}
              </motion.ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
