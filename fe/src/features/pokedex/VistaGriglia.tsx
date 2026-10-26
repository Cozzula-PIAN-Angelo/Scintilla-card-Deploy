import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { StatoVuoto } from '../../components/StatiPagina'
import { cn } from '../../utils/cn'
import { CONTENITORE_POKEDEX, filtraPokemon, propsLinkPokemon, type PropsVista } from './indice'
import { memoriaPokedex } from './memoriaPokedex'
import { GENERAZIONI, numeroFormattato, POKEDEX, type Pokemon } from './pokedex'
import { SpritePokemon } from './SpritePokemon'

const CLASSI_GRIGLIA = 'grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-10'

// vista "griglia": tutti insieme, generazione dopo generazione; chi manca è una tasca vuota con la sua sagoma
export function VistaGriglia(props: PropsVista) {
  const { ricerca, filtro, posseduti, barra } = props
  const vaiA = (numero: number) => document.getElementById(`generazione-${numero}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  const risultati = filtro ? filtraPokemon(POKEDEX, props) : []

  return (
    <>
      {barra(
        !filtro && (
          <nav aria-label="Generazioni" className="flex gap-2 overflow-x-auto pb-1">
            {GENERAZIONI.map((g) => {
              const avanz = posseduti?.generazioni[g.numero - 1]
              return (
                <button
                  key={g.numero}
                  type="button"
                  onClick={() => vaiA(g.numero)}
                  className="flex shrink-0 items-baseline gap-1.5 rounded-full bg-superficie px-3.5 py-1.5 text-sm font-semibold text-testo-2 shadow-sm ring-1 ring-linea/10 transition-colors hover:bg-blu-500 hover:text-white"
                >
                  {g.sigla} · {g.regione}
                  {avanz && (
                    <span className="text-xs font-medium opacity-70">
                      {avanz.posseduti}/{avanz.totale}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        ),
      )}

      <div className={cn(CONTENITORE_POKEDEX, 'mt-8')}>
        {filtro ? (
          risultati.length === 0 ? (
            <StatoVuoto icona={<Search aria-hidden className="size-16" />} titolo="Nessun Pokémon trovato" testo={`Nessun Pokémon corrisponde a "${ricerca}".`} />
          ) : (
            <ul className={CLASSI_GRIGLIA}>
              {risultati.map((p) => (
                <TascaPokemon key={p.numero} pokemon={p} preso={posseduti?.insieme.has(p.numero) ?? true} />
              ))}
            </ul>
          )
        ) : (
          <div className="space-y-14">
            {GENERAZIONI.map((g) => {
              const lista = filtraPokemon(POKEDEX.slice(g.da - 1, g.a), props)
              const avanz = posseduti?.generazioni[g.numero - 1]
              if (lista.length === 0) return null
              return (
                <section key={g.numero} id={`generazione-${g.numero}`} aria-labelledby={`titolo-generazione-${g.numero}`} className="scroll-mt-[calc(var(--alto-barra)+5rem)]">
                  <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h2 id={`titolo-generazione-${g.numero}`} className="font-titolo text-3xl font-bold text-testo">
                      {g.regione}
                      <span className="ml-3 font-sans text-base font-medium text-testo/60">
                        Generazione {g.sigla} · {numeroFormattato(g.da)}–{numeroFormattato(g.a)}
                      </span>
                    </h2>
                    {avanz && (
                      <p className="font-semibold text-testo-2">
                        {avanz.mancanti.length === 0 ? 'Regione completa!' : `Te ne mancano ${avanz.mancanti.length} su ${avanz.totale}`}
                      </p>
                    )}
                  </div>
                  <ul className={CLASSI_GRIGLIA}>
                    {lista.map((p) => (
                      <TascaPokemon key={p.numero} pokemon={p} preso={posseduti?.insieme.has(p.numero) ?? true} />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// Pokémon in collezione su una tessera bianca; chi manca è una tasca vuota tratteggiata con la sua sagoma,
// che al passaggio si riempie e si colora
function TascaPokemon({ pokemon, preso }: { pokemon: Pokemon; preso: boolean }) {
  const [attivo, setAttivo] = useState(false)
  const evidenziato = pokemon.numero === memoriaPokedex.ultimo
  return (
    <li>
      <Link
        {...propsLinkPokemon(pokemon.numero)}
        onMouseEnter={() => setAttivo(true)}
        onMouseLeave={() => setAttivo(false)}
        onFocus={() => setAttivo(true)}
        onBlur={() => setAttivo(false)}
        className={cn(
          'group flex flex-col items-center rounded-2xl px-2 pb-3 pt-1 text-center transition',
          preso
            ? 'bg-superficie shadow-md shadow-ombra/10 ring-1 ring-linea/5 hover:-translate-y-1 hover:shadow-xl hover:shadow-ombra/25'
            : 'border-2 border-dashed border-linea/20 hover:border-transparent hover:bg-superficie hover:shadow-xl hover:shadow-ombra/25',
          evidenziato && 'ring-4 ring-giallo-400',
        )}
      >
        <SpritePokemon numero={pokemon.numero} attivo={attivo} sagoma={!preso} className="size-24 transition-transform group-hover:scale-110" />
        <span className="text-xs font-semibold text-testo/60">{numeroFormattato(pokemon.numero)}</span>
        <span className={cn('w-full truncate text-sm font-semibold', preso || attivo ? 'text-testo' : 'text-testo/60')}>{pokemon.nome}</span>
      </Link>
    </li>
  )
}
