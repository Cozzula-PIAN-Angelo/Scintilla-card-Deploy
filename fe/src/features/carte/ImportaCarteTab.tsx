import { motion } from 'framer-motion'
import { PackageSearch, RotateCw, Search, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { messaggioErrore, statoErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Loader } from '../../components/Loader'
import { Paginazione } from '../../components/Paginazione'
import { StatoErrore, StatoVuoto } from '../../components/StatiPagina'
import { useDebounce } from '../../hooks/useDebounce'
import { griglia } from '../../theme/motion'
import { cn } from '../../utils/cn'
import { useCercaCarteQuery } from './carteApi'
import { CartaRisultato } from './CartaRisultato'

const PER_PAGINA = 12
const MINIMO_CARATTERI = 2

// stessa regola del backend: contano solo lettere e cifre
function ricercaValida(testo: string): boolean {
  return testo.replace(/[^\p{L}\p{N}]/gu, '').length >= MINIMO_CARATTERI
}

export function ImportaCarteTab() {
  const [testo, setTesto] = useState('')
  const [pagina, setPagina] = useState(0)
  const nome = useDebounce(testo.trim(), 400)
  const valida = ricercaValida(nome)

  const { data, isFetching, isError, error, refetch } = useCercaCarteQuery(
    { nome, page: pagina, size: PER_PAGINA },
    { skip: !valida },
  )

  const cambiaTesto = (valore: string) => {
    setTesto(valore)
    setPagina(0)
  }

  return (
    <div>
      <div className="mx-auto max-w-2xl">
        <label htmlFor="ricerca-carte" className="mb-2 block font-titolo text-xl font-semibold text-testo">
          Cerca una carta da importare
        </label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-testo-2" />
          <input
            id="ricerca-carte"
            type="search"
            value={testo}
            onChange={(e) => cambiaTesto(e.target.value)}
            placeholder="Nome della carta, es. charizard"
            autoComplete="off"
            aria-describedby="ricerca-carte-aiuto"
            className="w-full rounded-full border-2 border-blu-500/80 bg-superficie py-4 pl-14 pr-14 text-lg text-testo shadow-lg shadow-ombra/10 outline-none transition placeholder:text-testo/65 focus:border-blu-500 focus:ring-4 focus:ring-blu-500/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {testo && (
            <button
              type="button"
              onClick={() => cambiaTesto('')}
              aria-label="Svuota la ricerca"
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-testo-2 hover:bg-tenue"
            >
              <X aria-hidden className="size-5" />
            </button>
          )}
        </div>
        <p id="ricerca-carte-aiuto" className="mt-2 pl-5 text-sm text-testo/70">
          Almeno {MINIMO_CARATTERI} caratteri. Una sola parola cerca per inizio del nome.
        </p>
      </div>

      <div className="mt-10">
        {!valida ? (
          <StatoVuoto
            icona={<PackageSearch aria-hidden className="size-16" />}
            titolo="Trova nuove carte"
            testo="Scrivi il nome di una carta per sfogliare il database esterno e importarla nel catalogo."
          />
        ) : isError ? (
          statoErrore(error) === 502 ? (
            <div role="alert" className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl bg-giallo-400 p-8 text-center text-blu-900 shadow-lg">
              <TriangleAlert aria-hidden className="size-10" />
              <p className="font-titolo text-xl font-semibold">Il servizio delle carte non risponde</p>
              <p>
                Il database esterno delle carte è momentaneamente non disponibile (non dipende da te). Riprova tra
                qualche istante.
              </p>
              <Button variante="primario" onClick={refetch} caricamento={isFetching}>
                {!isFetching && <RotateCw aria-hidden className="size-4" />}
                Riprova
              </Button>
            </div>
          ) : (
            <StatoErrore messaggio={messaggioErrore(error)} onRiprova={refetch} />
          )
        ) : !data ? (
          <Loader etichetta="Cerco le carte…" />
        ) : data.content.length === 0 ? (
          <StatoVuoto
            icona={<Search aria-hidden className="size-16" />}
            titolo="Nessuna carta trovata"
            testo={`Nessun risultato per «${nome}». Prova con un altro nome.`}
          />
        ) : (
          <>
            <p className="mb-6 text-center font-semibold text-testo">
              {data.totalElements === 1 ? '1 carta trovata' : `${data.totalElements} carte trovate`}
            </p>
            <motion.ul
              key={`${nome}-${pagina}`}
              variants={griglia}
              initial="nascosto"
              animate="visibile"
              aria-busy={isFetching || undefined}
              className={cn(
                'grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                isFetching && 'opacity-60',
              )}
            >
              {data.content.map((carta) => (
                <CartaRisultato key={carta.idEsterno} carta={carta} />
              ))}
            </motion.ul>
            <Paginazione pagina={pagina} totalePagine={data.totalPages} onCambia={setPagina} />
          </>
        )}
      </div>
    </div>
  )
}
