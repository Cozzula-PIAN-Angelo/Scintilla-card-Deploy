import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigationType } from 'react-router'
import { messaggioErrore } from '../app/errori'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { Skeleton } from '../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../components/StatiPagina'
import { corrisponde, normalizza, raggruppaPerLettera, SLUG_SCONOSCIUTO } from '../features/artisti/artisti'
import { useGetArtistiQuery } from '../features/artisti/artistiApi'
import { AvatarArtista } from '../features/artisti/AvatarArtista'
import { memoriaArtisti } from '../features/artisti/memoriaArtisti'
import { useDebounce } from '../hooks/useDebounce'
import { useTitolo } from '../hooks/useTitolo'
import type { Artista } from '../types/api'
import { cn } from '../utils/cn'

const CLASSI_GRIGLIA = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

// indice degli illustratori delle carte, per lettera: cliccandone uno si aprono tutte le sue carte
export function ArtistiPage() {
  useTitolo('Artisti')
  const tipoNavigazione = useNavigationType()
  const { data, isLoading, isError, error, refetch } = useGetArtistiQuery()
  const [ricerca, setRicerca] = useState('')
  const filtro = useDebounce(normalizza(ricerca.trim()), 150)

  const artisti = useMemo(() => (data ?? []).filter((a) => a.slug !== SLUG_SCONOSCIUTO), [data])
  const sconosciuto = data?.find((a) => a.slug === SLUG_SCONOSCIUTO)
  const gruppi = useMemo(() => raggruppaPerLettera(artisti), [artisti])
  const risultati = useMemo(() => (filtro ? artisti.filter((a) => corrisponde(a, filtro)) : []), [artisti, filtro])
  const mostraSconosciuto = sconosciuto && (!filtro || corrisponde(sconosciuto, filtro))

  // tornati da un artista (indietro del browser o del sito): si riparte dallo stesso punto, appena l'elenco
  // c'è. Salto istantaneo: il tema ha scroll-behavior smooth, che animerebbe migliaia di pixel
  useEffect(() => {
    if (!data) return
    if (tipoNavigazione === 'POP' && memoriaArtisti.posizione !== null) {
      window.scrollTo({ top: memoriaArtisti.posizione, behavior: 'instant' })
    }
    memoriaArtisti.posizione = null
  }, [tipoNavigazione, data])

  const vaiALettera = (lettera: string) =>
    document.getElementById(`lettera-${lettera}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })

  return (
    <PaginaAnimata className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-testo">Artisti</h1>
        <p className="mt-1 text-testo/70">Le mani dietro le carte: cerca il tuo illustratore preferito e sfoglia tutto quello che ha disegnato.</p>
      </div>

      {/* top-15: attaccata alla navbar ridotta dallo scorrimento (pulsanti da 44px + py-2 = 60px) */}
      <div className="sticky top-15 z-20 -mx-4 mb-10 bg-sfondo/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <label className="relative block max-w-md">
          <span className="sr-only">Cerca un artista</span>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-accento" />
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca per nome…"
            className="w-full rounded-full bg-superficie py-3 pl-12 pr-5 text-testo shadow-md shadow-ombra/10 ring-1 ring-linea/10 outline-none placeholder:text-testo/50 focus:ring-2 focus:ring-blu-500"
          />
        </label>
        {!filtro && gruppi.length > 0 && (
          <nav aria-label="Lettere" className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {gruppi.map((g) => (
              <button
                key={g.lettera}
                type="button"
                onClick={() => vaiALettera(g.lettera)}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie text-sm font-semibold text-testo-2 shadow-sm ring-1 ring-linea/10 transition-colors hover:bg-blu-500 hover:text-white"
              >
                {g.lettera}
              </button>
            ))}
          </nav>
        )}
      </div>

      {isError ? (
        <StatoErrore messaggio={messaggioErrore(error, "Non è stato possibile caricare l'elenco degli artisti.")} onRiprova={refetch} />
      ) : isLoading ? (
        <ul className={CLASSI_GRIGLIA} aria-busy>
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-52 rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : filtro ? (
        risultati.length === 0 && !mostraSconosciuto ? (
          <StatoVuoto
            icona={<Search aria-hidden className="size-16" />}
            titolo="Nessun artista trovato"
            testo={`Nessun artista corrisponde a "${ricerca}".`}
          />
        ) : (
          <ul className={CLASSI_GRIGLIA}>
            {risultati.map((a) => (
              <TileArtista key={a.slug} artista={a} />
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-12">
          {gruppi.map((g) => (
            <section key={g.lettera} id={`lettera-${g.lettera}`} aria-labelledby={`titolo-lettera-${g.lettera}`} className="scroll-mt-44">
              <h2 id={`titolo-lettera-${g.lettera}`} className="mb-5 text-2xl font-bold text-testo">
                {g.lettera}
              </h2>
              <ul className={CLASSI_GRIGLIA}>
                {g.artisti.map((a) => (
                  <TileArtista key={a.slug} artista={a} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!isError && mostraSconosciuto && (
        <div className="mt-14 border-t border-linea/10 pt-10">
          <ul className={CLASSI_GRIGLIA}>
            <TileArtista artista={sconosciuto} />
          </ul>
        </div>
      )}
    </PaginaAnimata>
  )
}

function TileArtista({ artista }: { artista: Artista }) {
  const evidenziato = artista.slug === memoriaArtisti.ultimo
  return (
    <li>
      <Link
        to={`/artisti/${artista.slug}`}
        // arrivati dall'elenco: "← Artisti" nella pagina dell'artista torna qui con l'indietro del browser
        state={{ daElenco: true }}
        onClick={() => {
          memoriaArtisti.posizione = window.scrollY
          memoriaArtisti.ultimo = artista.slug
        }}
        className={cn(
          'group flex h-full flex-col items-center gap-2 rounded-2xl bg-superficie px-3 pb-4 pt-5 text-center shadow-md shadow-ombra/10 ring-1 ring-linea/5 transition',
          'hover:-translate-y-1 hover:shadow-xl hover:shadow-ombra/25',
          evidenziato && 'ring-4 ring-giallo-400',
        )}
      >
        <AvatarArtista artista={artista} dimensione="piccolo" />
        <span className="line-clamp-2 w-full text-base font-semibold text-testo">{artista.nome}</span>
        <span className="text-xs font-semibold text-testo/50">{artista.carte === 1 ? '1 carta' : `${artista.carte} carte`}</span>
      </Link>
    </li>
  )
}
