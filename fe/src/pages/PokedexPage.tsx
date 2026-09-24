import { BookOpen, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigationType } from 'react-router'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { StatoVuoto } from '../components/StatiPagina'
import { memoriaPokedex } from '../features/pokedex/memoriaPokedex'
import { corrisponde, GENERAZIONI, numeroFormattato, POKEDEX, spriteUrl, type Pokemon } from '../features/pokedex/pokedex'
import { useDebounce } from '../hooks/useDebounce'
import { useTitolo } from '../hooks/useTitolo'
import { cn } from '../utils/cn'

const CLASSI_GRIGLIA = 'grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'

// indice dei 1025 Pokémon per generazione: cliccandone uno si aprono tutte le sue carte
export function PokedexPage() {
  useTitolo('Pokédex')
  const tipoNavigazione = useNavigationType()
  const [ricerca, setRicerca] = useState('')
  const filtro = useDebounce(ricerca.trim().toLowerCase(), 150)

  const risultati = useMemo(() => (filtro ? POKEDEX.filter((p) => corrisponde(p, filtro)) : []), [filtro])

  // tornati da un Pokémon (indietro del browser o del sito): si riparte dallo stesso punto.
  // Salto istantaneo: il tema ha scroll-behavior smooth, che animerebbe migliaia di pixel
  useEffect(() => {
    if (tipoNavigazione === 'POP' && memoriaPokedex.posizione !== null) {
      window.scrollTo({ top: memoriaPokedex.posizione, behavior: 'instant' })
    }
    memoriaPokedex.posizione = null
  }, [tipoNavigazione])

  const vaiAGenerazione = (numero: number) =>
    document.getElementById(`generazione-${numero}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })

  return (
    <PaginaAnimata className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-4xl font-bold text-testo">
          Pokédex
          <BookOpen aria-hidden className="size-8 text-accento" />
        </h1>
        <p className="mt-1 text-testo/70">Scegli un Pokémon per vedere tutte le carte in cui compare.</p>
      </div>

      <div className="sticky top-16 z-20 -mx-4 mb-10 bg-sfondo/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <label className="relative block max-w-md">
          <span className="sr-only">Cerca un Pokémon</span>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-accento" />
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca per nome o numero…"
            className="w-full rounded-full bg-superficie py-3 pl-12 pr-5 text-testo shadow-md shadow-ombra/10 ring-1 ring-linea/10 outline-none placeholder:text-testo/50 focus:ring-2 focus:ring-blu-500"
          />
        </label>
        {!filtro && (
          <nav aria-label="Generazioni" className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {GENERAZIONI.map((g) => (
              <button
                key={g.numero}
                type="button"
                onClick={() => vaiAGenerazione(g.numero)}
                className="shrink-0 rounded-full bg-superficie px-3.5 py-1.5 text-sm font-semibold text-testo-2 shadow-sm ring-1 ring-linea/10 transition-colors hover:bg-blu-500 hover:text-white"
              >
                {g.sigla} · {g.regione}
              </button>
            ))}
          </nav>
        )}
      </div>

      {filtro ? (
        risultati.length === 0 ? (
          <StatoVuoto
            icona={<Search aria-hidden className="size-16" />}
            titolo="Nessun Pokémon trovato"
            testo={`Nessun Pokémon corrisponde a "${ricerca}".`}
          />
        ) : (
          <ul className={CLASSI_GRIGLIA}>
            {risultati.map((p) => (
              <TilePokemon key={p.numero} pokemon={p} />
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-14">
          {GENERAZIONI.map((g) => (
            <section key={g.numero} id={`generazione-${g.numero}`} aria-labelledby={`titolo-generazione-${g.numero}`} className="scroll-mt-44">
              <h2 id={`titolo-generazione-${g.numero}`} className="mb-5 text-2xl font-bold text-testo">
                Generazione {g.sigla} · {g.regione}
                <span className="ml-3 text-base font-medium text-testo/60">
                  {numeroFormattato(g.da)}–{numeroFormattato(g.a)}
                </span>
              </h2>
              <ul className={CLASSI_GRIGLIA}>
                {POKEDEX.slice(g.da - 1, g.a).map((p) => (
                  <TilePokemon key={p.numero} pokemon={p} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PaginaAnimata>
  )
}

function TilePokemon({ pokemon }: { pokemon: Pokemon }) {
  const evidenziato = pokemon.numero === memoriaPokedex.ultimo
  return (
    <li>
      <Link
        to={`/pokedex/${pokemon.numero}`}
        // passi di cronologia dal Pokédex: "← Pokédex" torna qui anche dopo aver sfogliato altri Pokémon
        state={{ passiDalPokedex: 1 }}
        onClick={() => {
          memoriaPokedex.posizione = window.scrollY
          memoriaPokedex.ultimo = pokemon.numero
        }}
        className={cn(
          'group flex flex-col items-center rounded-2xl bg-superficie px-2 pb-3 pt-1 text-center shadow-md shadow-ombra/10 ring-1 ring-linea/5 transition',
          'hover:-translate-y-1 hover:shadow-xl hover:shadow-blu-500/25',
          evidenziato && 'ring-4 ring-giallo-400',
        )}
      >
        <img
          src={spriteUrl(pokemon.numero)}
          alt=""
          loading="lazy"
          decoding="async"
          width={96}
          height={96}
          className="sprite-pixel size-24 transition-transform group-hover:scale-110"
        />
        <span className="text-xs font-semibold text-testo/50">{numeroFormattato(pokemon.numero)}</span>
        <span className="w-full truncate text-sm font-semibold text-testo">{pokemon.nome}</span>
      </Link>
    </li>
  )
}
