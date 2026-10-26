import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { LinkBottone } from '../../components/Button'
import { StatoVuoto } from '../../components/StatiPagina'
import { useDebounce } from '../../hooks/useDebounce'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cn } from '../../utils/cn'
import { CONTENITORE_POKEDEX, filtraPokemon, propsLinkPokemon, type PropsVista } from './indice'
import { memoriaPokedex } from './memoriaPokedex'
import { generazioneDi, GENERAZIONI, numeroFormattato, POKEDEX, trovaPokemon, type Pokemon } from './pokedex'
import { useGetCartePokemonQuery } from './pokedexApi'
import { SegnoCollezione } from './SegnoCollezione'
import { Pedana } from './Pedana'
import { SpritePokemon } from './SpritePokemon'
import { VentaglioCarte } from './VentaglioCarte'

// pannelli attaccati sotto navbar e barra, alti fino in fondo allo schermo
const ATTACCATO = 'lg:sticky lg:top-[calc(var(--alto-barra)+4.75rem)] lg:h-[calc(100dvh-var(--alto-barra)-5.75rem)]'

// vista "scheda", come il Pokédex dei giochi: elenco numerato a sinistra, scheda del Pokémon scelto a destra con
// le sue carte. Da telefono solo l'elenco, e un tocco apre il Pokémon
export function VistaScheda(props: PropsVista) {
  const { filtro, posseduti, barra } = props
  const largo = useMediaQuery('(min-width: 1024px)')
  const [scelto, setScelto] = useState(memoriaPokedex.ultimo ?? 1)
  const lista = filtraPokemon(POKEDEX, props)
  // per regione; i risultati di una ricerca tutti insieme
  const gruppi = filtro
    ? [{ regione: null, pokemon: lista }]
    : GENERAZIONI.map((g) => ({ regione: g.regione, pokemon: lista.filter((p) => p.numero >= g.da && p.numero <= g.a) })).filter(
        (g) => g.pokemon.length > 0,
      )
  // la voce raggiungibile col Tab: lo scelto, o il primo se il filtro l'ha tolto dall'elenco
  const focalizzabile = lista.some((p) => p.numero === scelto) ? scelto : lista[0]?.numero
  const elenco = useRef<HTMLUListElement>(null)
  const navigate = useNavigate()

  // lo scelto resta in vista nell'elenco (scorre il pannello, non la pagina)
  useLayoutEffect(() => {
    const pannello = elenco.current?.parentElement
    const voce = elenco.current?.querySelector<HTMLElement>(`[data-numero="${scelto}"]`)
    if (!pannello || !voce || !largo) return
    const sopra = voce.offsetTop - pannello.scrollTop
    if (sopra < 40 || sopra > pannello.clientHeight - 60) pannello.scrollTop = voce.offsetTop - pannello.clientHeight / 2
  }, [scelto, largo, filtro])

  const sposta = (passo: number) => {
    const i = lista.findIndex((p) => p.numero === scelto)
    const prossimo = lista[Math.min(lista.length - 1, Math.max(0, i + passo))]
    if (!prossimo) return
    setScelto(prossimo.numero)
    elenco.current?.querySelector<HTMLElement>(`[data-numero="${prossimo.numero}"]`)?.focus({ preventScroll: true })
  }
  const tasti = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      sposta(e.key === 'ArrowDown' ? 1 : -1)
    }
  }
  // da desktop si sceglie il primo della generazione, da telefono si scorre fino a lui
  const vaiA = (da: number) => {
    const primo = lista.find((p) => p.numero >= da)
    if (!primo) return
    if (largo) setScelto(primo.numero)
    else document.getElementById(`voce-${primo.numero}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <>
      {barra(
        !filtro && (
          <nav aria-label="Generazioni" className="flex gap-2 overflow-x-auto pb-1">
            {GENERAZIONI.map((g) => {
              const attiva = generazioneDi(scelto)?.numero === g.numero
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

      <div className={cn(CONTENITORE_POKEDEX, 'mt-6 grid gap-6 lg:grid-cols-[minmax(20rem,26rem)_1fr]')}>
        <div className={cn(ATTACCATO, 'rounded-3xl bg-superficie lg:overflow-y-auto p-2 shadow-lg shadow-ombra/10 ring-1 ring-linea/5')}>
          {lista.length === 0 ? (
            <StatoVuoto icona={<Search aria-hidden className="size-16" />} titolo="Nessun Pokémon trovato" testo={`Nessun Pokémon corrisponde a "${props.ricerca}".`} />
          ) : (
            <ul ref={elenco} aria-label="Pokémon" onKeyDown={tasti} className="relative">
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
                          scelto={largo && p.numero === scelto}
                          focalizzabile={p.numero === focalizzabile}
                          largo={largo}
                          onScegli={() => setScelto(p.numero)}
                          onApri={() => {
                            memoriaPokedex.ultimo = p.numero
                            navigate(`/pokedex/${p.numero}`, { state: propsLinkPokemon(p.numero).state })
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        {largo && <Scheda numero={scelto} posseduti={posseduti} onSposta={sposta} />}
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
  onScegli: () => void
  onApri: () => void
}

function VocePokemon({ pokemon, posseduti, scelto, focalizzabile, largo, onScegli, onApri }: PropsVoce) {
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
      onClick={onScegli}
      onFocus={() => (setAttivo(true), onScegli())}
      onDoubleClick={onApri}
      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onApri())}
      className={classi}
    >
      {contenuto}
    </button>
  )
}

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

  return (
    <section aria-label={`Scheda di ${pokemon.nome}`} className={cn(ATTACCATO, 'sfondo-hero animate-gradiente relative flex flex-col overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-ombra/25 xl:p-8')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* il numero dopo il nome, come nel Pokédex dei giochi */}
          <h2 className="font-titolo text-5xl font-bold leading-none xl:text-6xl">
            {pokemon.nome} <span className="whitespace-nowrap font-sans text-2xl font-semibold text-white/85">{numeroFormattato(numero)}</span>
          </h2>
          <p className="mt-3 text-white/95">
            {[generazione && `Generazione ${generazione.sigla} · ${generazione.regione}`, pokemon.nomeInglese && `Sulle carte: ${pokemon.nomeInglese}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
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

      {/* da desktop largo pedana a sinistra e carte a destra: tutto resta nell'altezza dello schermo */}
      <div className="grid min-h-0 flex-1 content-start items-center gap-6 pt-6 xl:grid-cols-[minmax(0,1fr)_auto]">
        <Pedana numero={numero} sagoma={posseduti !== null && !preso} className="mx-auto size-60 2xl:size-72" />

        <div className="flex flex-wrap items-end justify-between gap-5 xl:flex-col xl:items-start xl:justify-center">
          <div className="min-w-0">
            {posseduti && (
              <p className="mb-4 flex items-center gap-2 font-semibold">
                <SegnoCollezione preso={!!preso} className={cn('size-6', !preso && 'border-white/50')} />
                {preso ? "Ce l'hai in collezione" : 'Ti manca: nessuna sua carta in collezione'}
              </p>
            )}
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
