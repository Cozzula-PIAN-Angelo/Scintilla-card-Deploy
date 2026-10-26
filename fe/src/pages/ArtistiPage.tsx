import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigationType } from 'react-router'
import { messaggioErrore } from '../app/errori'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { Skeleton } from '../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../components/StatiPagina'
import { carteDi, corrisponde, normalizza, raggruppaPerLettera, SLUG_SCONOSCIUTO } from '../features/artisti/artisti'
import { useGetArtistiQuery, useGetVetrinaArtistiQuery } from '../features/artisti/artistiApi'
import { LinkArtista } from '../features/artisti/LinkArtista'
import { memoriaArtisti } from '../features/artisti/memoriaArtisti'
import { MuroIllustrazioni } from '../features/artisti/MuroIllustrazioni'
import { CLASSI_INDICE, VoceIllustratore } from '../features/artisti/VoceIllustratore'
import { BallRarita } from '../features/vetrina/BallRarita'
import { useDebounce } from '../hooks/useDebounce'
import { useTitolo } from '../hooks/useTitolo'
import type { Artista } from '../types/api'
import { cn } from '../utils/cn'

// stessa larghezza per muro, ricerca e indice: i bordi si allineano
const CONTENITORE = 'mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8'

// indice degli illustratori delle carte: in cima il muro con i disegni di dieci di loro (cambiano ogni settimana),
// sotto la ricerca e tutti per lettera; cliccandone uno si aprono tutte le sue carte
export function ArtistiPage() {
  useTitolo('Illustratori')
  const tipoNavigazione = useNavigationType()
  const { data, isLoading, isError, error, refetch } = useGetArtistiQuery()
  const { data: vetrina, isLoading: vetrinaInArrivo } = useGetVetrinaArtistiQuery()
  const [ricerca, setRicerca] = useState('')
  const filtro = useDebounce(normalizza(ricerca.trim()), 150)

  const artisti = useMemo(() => (data ?? []).filter((a) => a.slug !== SLUG_SCONOSCIUTO), [data])
  const sconosciuto = data?.find((a) => a.slug === SLUG_SCONOSCIUTO)
  const prolifici = useMemo(() => [...artisti].sort((a, b) => b.carte - a.carte).slice(0, 3), [artisti])
  const gruppi = useMemo(() => raggruppaPerLettera(artisti), [artisti])
  const risultati = useMemo(() => (filtro ? artisti.filter((a) => corrisponde(a, filtro)) : []), [artisti, filtro])
  const mostraSconosciuto = sconosciuto && (!filtro || corrisponde(sconosciuto, filtro))

  // tornati da un illustratore (indietro del browser o del sito): si riparte dallo stesso punto, appena l'elenco
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

  const voce = (a: Artista) => <VoceIllustratore key={a.slug} artista={a} carte={carteDi(a, vetrina?.carteIndice)} />

  return (
    <PaginaAnimata className="pb-16">
      <section aria-labelledby="titolo-illustratori" className="sfondo-hero animate-gradiente relative overflow-hidden text-white">
        <div className={cn(CONTENITORE, 'relative py-10 lg:py-14')}>
          <MuroIllustrazioni
            artisti={vetrina?.sulMuro ?? []}
            inAttesa={vetrinaInArrivo}
            titolo={
              <>
                {/* più piccolo da telefono stretto e fra lg e xl: titolo e ball devono stare nel riquadro */}
                <h1
                  id="titolo-illustratori"
                  className="flex items-center gap-[0.2em] font-titolo text-5xl font-bold leading-none sm:text-6xl lg:text-5xl xl:text-6xl 2xl:text-7xl"
                >
                  Illustratori
                  <BallRarita tono="rosso" className="size-[0.8em] shrink-0 -rotate-12 drop-shadow-[0_4px_6px_rgb(0_0_0/0.4)]" />
                </h1>
                <p className="mt-3 max-w-sm text-white/80 xl:max-w-none 2xl:text-lg">
                  Le mani dietro le carte.
                  {/* il numero solo dove il muro li mostra tutti e dieci: da telefono le tessere sono cinque */}
                  <span className="lg:hidden"> Ogni settimana, sul muro, alcuni di loro.</span>
                  <span className="hidden lg:inline xl:hidden"> Sul muro, questa settimana, dieci di loro.</span>
                  {prolifici.length > 0 && <span className="hidden xl:inline"> Chi ne ha disegnate di più:</span>}
                </p>
                {/* da desktop largo il riquadro del titolo ha posto: i tre con più carte (due fino a 2xl) */}
                {prolifici.length > 0 && (
                  <ul className="mt-3 hidden gap-1.5 xl:flex">
                    {prolifici.map((a, i) => (
                      <li key={a.slug} className={cn(i === 2 && 'hidden 2xl:block')}>
                        <LinkArtista
                          slug={a.slug}
                          className="inline-flex items-baseline gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap text-white ring-1 ring-white/15 transition-colors hover:bg-giallo-400 hover:text-blu-900"
                        >
                          {a.nome}
                          <span className="text-xs font-medium opacity-70">{a.carte.toLocaleString('it-IT')}</span>
                        </LinkArtista>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            }
          />
        </div>
      </section>

      {/* top-15: attaccata alla navbar ridotta dallo scorrimento (pulsanti da 44px + py-2 = 60px) */}
      <div className="sticky top-15 z-30 mt-4 bg-sfondo/90 backdrop-blur-md">
        <div className={cn(CONTENITORE, 'py-3')}>
          <label className="relative block max-w-md">
            <span className="sr-only">Cerca un illustratore</span>
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
      </div>

      <div className={cn(CONTENITORE, 'mt-10')}>
        {isError ? (
          <StatoErrore messaggio={messaggioErrore(error, "Non è stato possibile caricare l'elenco degli illustratori.")} onRiprova={refetch} />
        ) : isLoading ? (
          <ul className={CLASSI_INDICE} aria-busy>
            {Array.from({ length: 10 }, (_, i) => (
              <li key={i}>
                <Skeleton className="mt-24 h-16 rounded-2xl" />
              </li>
            ))}
          </ul>
        ) : filtro ? (
          risultati.length === 0 && !mostraSconosciuto ? (
            <StatoVuoto
              icona={<Search aria-hidden className="size-16" />}
              titolo="Nessun illustratore trovato"
              testo={`Nessun illustratore corrisponde a "${ricerca}".`}
            />
          ) : (
            <ul className={CLASSI_INDICE}>{risultati.map(voce)}</ul>
          )
        ) : (
          <div className="space-y-12">
            {gruppi.map((g) => (
              <section key={g.lettera} id={`lettera-${g.lettera}`} aria-labelledby={`titolo-lettera-${g.lettera}`} className="scroll-mt-44">
                <h2 id={`titolo-lettera-${g.lettera}`} className="mb-5 font-titolo text-4xl font-bold text-testo">
                  {g.lettera}
                </h2>
                <ul className={CLASSI_INDICE}>{g.artisti.map(voce)}</ul>
              </section>
            ))}
          </div>
        )}

        {!isError && mostraSconosciuto && (
          <div className="mt-14 border-t border-linea/10 pt-10">
            <ul className={CLASSI_INDICE}>{voce(sconosciuto)}</ul>
          </div>
        )}
      </div>
    </PaginaAnimata>
  )
}
