import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router'
import { LinkBottone } from '../../components/Button'
import { StatoVuoto } from '../../components/StatiPagina'
import { useDebounce } from '../../hooks/useDebounce'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../utils/cn'
import { CONTENITORE_POKEDEX, filtraPokemon, propsLinkPokemon, testiVuoto, type PropsVista } from './indice'
import { StatoCollezione, TitoloPokemon } from './IntestazioneScheda'
import { memoriaPokedex } from './memoriaPokedex'
import { generazioneDi, GENERAZIONI, numeroFormattato, POKEDEX, trovaPokemon, type Pokemon } from './pokedex'
import { useGetCartePokemonQuery } from './pokedexApi'
import { SegnoCollezione } from './SegnoCollezione'
import { Pedana } from './Pedana'
import { SpritePokemon } from './SpritePokemon'
import { VentaglioCarte } from './VentaglioCarte'


// vista "scheda", come il Pokédex dei giochi: elenco numerato a sinistra, scheda del Pokémon scelto a destra con
// le sue carte. Da telefono solo l'elenco, e un tocco apre il Pokémon
export function VistaScheda(props: PropsVista) {
  const { ricerca, filtro, stato, posseduti, barra } = props
  const largo = useMediaQuery('(min-width: 1024px)')
  const [scelto, setScelto] = useState(memoriaPokedex.ultimo ?? 1)
  const lista = useMemo(() => filtraPokemon(POKEDEX, { filtro, stato, posseduti }), [filtro, stato, posseduti])
  // per regione; i risultati di una ricerca tutti insieme
  const gruppi = useMemo(
    () =>
      filtro
        ? [{ regione: null, pokemon: lista }]
        : GENERAZIONI.map((g) => ({ regione: g.regione, pokemon: lista.filter((p) => p.numero >= g.da && p.numero <= g.a) })).filter(
            (g) => g.pokemon.length > 0,
          ),
    [filtro, lista],
  )
  // il Pokémon mostrato (e raggiungibile col Tab): lo scelto, o il primo dell'elenco se ricerca o filtro l'hanno tolto
  const mostrato = lista.some((p) => p.numero === scelto) ? scelto : lista[0]?.numero
  const elenco = useRef<HTMLUListElement>(null)
  const pannelli = useRef<HTMLDivElement>(null)
  const altoPannelli = useAltoFinoInFondo(pannelli, largo)
  const navigate = useNavigate()

  // il mostrato resta in vista nell'elenco (scorre il pannello, non la pagina)
  useLayoutEffect(() => {
    const pannello = elenco.current?.parentElement
    const voce = elenco.current?.querySelector<HTMLElement>(`[data-numero="${mostrato}"]`)
    if (!pannello || !voce || !largo) return
    const sopra = voce.offsetTop - pannello.scrollTop
    if (sopra < 40 || sopra > pannello.clientHeight - 60) pannello.scrollTop = voce.offsetTop - pannello.clientHeight / 2
  }, [mostrato, largo, filtro])

  // un passo nell'elenco; dalle frecce della tastiera anche il focus segue, da quelle della scheda no (resta sul
  // bottone, così si può continuare a premere)
  const sposta = (passo: number, conFocus = false) => {
    const i = lista.findIndex((p) => p.numero === mostrato)
    const prossimo = lista[Math.min(lista.length - 1, Math.max(0, i + passo))]
    if (!prossimo) return
    setScelto(prossimo.numero)
    if (conFocus) elenco.current?.querySelector<HTMLElement>(`[data-numero="${prossimo.numero}"]`)?.focus({ preventScroll: true })
  }
  const tasti = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      sposta(e.key === 'ArrowDown' ? 1 : -1, true)
    }
  }
  // stabili, così le voci (fino a 1025) non si ridisegnano tutte a ogni passo
  const scegli = useCallback((numero: number) => setScelto(numero), [])
  const apri = useCallback(
    (numero: number) => {
      const link = propsLinkPokemon(numero)
      link.onClick()
      navigate(link.to, { state: link.state })
    },
    [navigate],
  )
  // da desktop si sceglie il primo della generazione, da telefono si scorre fino a lui
  const vaiA = (da: number) => {
    const primo = lista.find((p) => p.numero >= da)
    if (!primo) return
    if (largo) setScelto(primo.numero)
    else document.getElementById(`voce-${primo.numero}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
  const vuoto = testiVuoto({ ricerca, filtro, stato })

  return (
    <>
      {barra(
        !filtro && (
          <nav aria-label="Generazioni" className="flex gap-2 overflow-x-auto pb-1">
            {/* solo le generazioni che il filtro della collezione lascia nell'elenco */}
            {GENERAZIONI.filter((g) => lista.some((p) => p.numero >= g.da && p.numero <= g.a)).map((g) => {
              const attiva = mostrato !== undefined && generazioneDi(mostrato)?.numero === g.numero
              return (
                <button
                  key={g.numero}
                  type="button"
                  onClick={() => vaiA(g.da)}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-linea/10 transition-colors',
                    attiva && largo ? 'bg-blu-500 text-white' : 'bg-superficie text-testo-2 hover:bg-blu-500 hover:text-white',
                  )}
                >
                  {g.sigla} · {g.regione}
                </button>
              )
            })}
          </nav>
        ),
      )}

      {/* da desktop elenco e scheda arrivano fino in fondo allo schermo */}
      <div ref={pannelli} style={{ height: altoPannelli ?? undefined }} className={cn(CONTENITORE_POKEDEX, 'mt-6 grid gap-6 lg:grid-cols-[minmax(20rem,26rem)_1fr]')}>
        {/* da desktop l'elenco è alto quanto la scheda accanto (non la allunga) e scorre al suo interno */}
        <div className="lg:relative">
          <div className="rounded-3xl bg-superficie p-2 shadow-lg shadow-ombra/10 ring-1 ring-linea/5 lg:absolute lg:inset-0 lg:overflow-y-auto">
            {lista.length === 0 ? (
              <StatoVuoto icona={<Search aria-hidden className="size-16" />} titolo={vuoto.titolo} testo={vuoto.testo} />
            ) : (
              // le frecce della tastiera solo da desktop: da telefono le voci sono link e le frecce scorrono la pagina
              <ul ref={elenco} aria-label="Pokémon" onKeyDown={largo ? tasti : undefined} className="relative">
                {gruppi.map(({ regione, pokemon }) => (
                  <li key={regione ?? 'risultati'}>
                    {/* il nome della regione resta in cima al pannello (da telefono sotto la barra) finché si scorre lei */}
                    {regione && (
                      <p className="sticky top-[calc(var(--alto-barra)+3.75rem)] z-10 rounded-xl bg-superficie/95 px-3 pb-1 pt-3 font-titolo text-sm font-semibold text-accento backdrop-blur lg:top-0">
                        {regione}
                      </p>
                    )}
                    <ul>
                      {pokemon.map((p) => (
                        <li key={p.numero} id={`voce-${p.numero}`} className="scroll-mt-[calc(var(--alto-barra)+6rem)]">
                          <VocePokemon
                            pokemon={p}
                            posseduti={posseduti}
                            scelto={largo && p.numero === mostrato}
                            focalizzabile={p.numero === mostrato}
                            largo={largo}
                            onScegli={scegli}
                            onApri={apri}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {largo && mostrato !== undefined && <Scheda numero={mostrato} posseduti={posseduti} onSposta={sposta} />}
      </div>
    </>
  )
}

interface PropsVoce {
  pokemon: Pokemon
  posseduti: PropsVista['posseduti']
  scelto: boolean
  focalizzabile: boolean
  largo: boolean
  onScegli: (numero: number) => void
  onApri: (numero: number) => void
}

const VocePokemon = memo(function VocePokemon({ pokemon, posseduti, scelto, focalizzabile, largo, onScegli, onApri }: PropsVoce) {
  // al passaggio (o col focus) la sagoma si colora, come nella griglia
  const [attivo, setAttivo] = useState(false)
  const passaggio = {
    onMouseEnter: () => setAttivo(true),
    onMouseLeave: () => setAttivo(false),
    onBlur: () => setAttivo(false),
  }
  const preso = posseduti?.insieme.has(pokemon.numero) ?? true
  const classi = cn(
    'flex w-full items-center gap-3 rounded-2xl px-3 py-1 text-left transition-colors',
    scelto ? 'bg-blu-500 text-white' : 'hover:bg-tenue',
    !largo && pokemon.numero === memoriaPokedex.ultimo && 'ring-2 ring-giallo-400',
  )
  const contenuto = (
    <>
      <span className={cn('w-11 shrink-0 text-sm font-semibold tabular-nums', scelto ? 'text-white/95' : 'text-testo/60')}>
        {numeroFormattato(pokemon.numero)}
      </span>
      <SpritePokemon numero={pokemon.numero} attivo={attivo} sagoma={!preso && !scelto} className="size-10 shrink-0" />
      <span className={cn('min-w-0 flex-1 truncate font-semibold', !scelto && (preso ? 'text-testo' : 'text-testo/65'))}>{pokemon.nome}</span>
      {posseduti && <SegnoCollezione preso={preso} className={cn('size-5', scelto && !preso && 'border-white/60')} />}
    </>
  )
  // da telefono un tocco apre il Pokémon; da desktop sceglie, Invio o il doppio clic lo aprono
  if (!largo)
    return (
      <Link {...propsLinkPokemon(pokemon.numero)} {...passaggio} onFocus={() => setAttivo(true)} className={classi}>
        {contenuto}
      </Link>
    )
  return (
    <button
      type="button"
      data-numero={pokemon.numero}
      aria-current={scelto || undefined}
      tabIndex={focalizzabile ? 0 : -1}
      {...passaggio}
      onClick={() => onScegli(pokemon.numero)}
      onFocus={() => (setAttivo(true), onScegli(pokemon.numero))}
      onDoubleClick={() => onApri(pokemon.numero)}
      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onApri(pokemon.numero))}
      className={classi}
    >
      {contenuto}
    </button>
  )
})

// scheda del Pokémon scelto: sprite animato grande, nome, se ce l'hai e le sue prime carte
function Scheda({ numero, posseduti, onSposta }: { numero: number; posseduti: PropsVista['posseduti']; onSposta: (passo: number) => void }) {
  const pokemon = trovaPokemon(numero)!
  const generazione = generazioneDi(numero)
  const preso = posseduti?.insieme.has(numero)
  // le carte si chiedono solo quando ci si ferma su un Pokémon: scorrendo con le frecce non parte una richiesta a voce
  const fermo = useDebounce(numero, 400)
  const { currentData, isFetching } = useGetCartePokemonQuery({ chiave: fermo }, { skip: fermo !== numero })
  const carte = fermo === numero ? (currentData?.carte ?? []) : []
  const totale = currentData ? (currentData.completo ? currentData.carte.length : currentData.totale) : undefined
  // anche la pedana aspetta un attimo: tenendo premuta una freccia non si scarica e misura la GIF di ogni Pokémon
  const sullaPedana = useDebounce(numero, 150)
  const presoSullaPedana = posseduti?.insieme.has(sullaPedana)

  return (
    <section aria-label={`Scheda di ${pokemon.nome}`} className="sfondo-hero animate-gradiente relative flex flex-col overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-ombra/25 xl:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <TitoloPokemon
            pokemon={pokemon}
            livello="h2"
            className="text-5xl xl:text-6xl"
            dettagli={[generazione && `Generazione ${generazione.sigla} · ${generazione.regione}`, pokemon.nomeInglese && `Sulle carte: ${pokemon.nomeInglese}`]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => onSposta(-1)} aria-label="Pokémon precedente" className="grid size-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 transition-colors hover:bg-white/20">
            <ChevronUp aria-hidden className="size-5" />
          </button>
          <button type="button" onClick={() => onSposta(1)} aria-label="Pokémon successivo" className="grid size-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 transition-colors hover:bg-white/20">
            <ChevronDown aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      {/* da desktop largo pedana a sinistra e carte a destra. Colonna delle carte larga fissa: mentre arrivano le
          carte (o le statistiche) la pedana non si sposta */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 pt-6 xl:flex-row xl:items-center">
        {/* la pedana prende tutto lo spazio che resta: su uno schermo alto il Pokémon è più grande */}
        <Pedana numero={sullaPedana} sagoma={posseduti !== null && !presoSullaPedana} riempi className="min-h-40 min-w-0 flex-1 self-stretch" />

        <div className="flex shrink-0 flex-wrap items-end justify-between gap-5 xl:w-80 xl:flex-col xl:items-start xl:justify-center">
          <div className="min-w-0">
            {posseduti && <StatoCollezione preso={!!preso} className="mb-4" />}
            <VentaglioCarte carte={carte} inAttesa={isFetching} />
          </div>
          <LinkBottone {...propsLinkPokemon(numero)} variante="secondario" dimensione="lg">
            {totale === undefined ? 'Vedi le sue carte' : totale === 0 ? 'Nessuna carta, apri la pagina' : `Vedi le sue ${totale} carte`}
          </LinkBottone>
        </div>
      </div>
    </section>
  )
}

// altezza dal punto in cui comincia l'elemento fino in fondo allo schermo (meno un margine); solo se attivo (da
// desktop). Almeno 28rem, 34rem sotto i 1280 px, dove nella scheda pedana e carte stanno una sopra l'altra.
// Si rimisura quando cambia lo schermo o quello che sta sopra (contatore, barra)
function useAltoFinoInFondo(ref: RefObject<HTMLElement | null>, attivo: boolean) {
  const [alto, setAlto] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!attivo || !el) {
      setAlto(null)
      return
    }
    const misura = () => {
      const minimo = window.innerWidth >= 1280 ? 448 : 544
      setAlto(Math.max(minimo, Math.round(window.innerHeight - (el.getBoundingClientRect().top + window.scrollY) - 24)))
    }
    misura()
    const osservatore = new ResizeObserver(misura)
    osservatore.observe(document.body)
    window.addEventListener('resize', misura)
    return () => {
      osservatore.disconnect()
      window.removeEventListener('resize', misura)
    }
  }, [ref, attivo])
  return alto
}
