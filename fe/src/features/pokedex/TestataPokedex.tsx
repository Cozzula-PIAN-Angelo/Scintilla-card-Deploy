import { cn } from '../../utils/cn'
import { percentuale } from '../statistiche/calcoli'
import { BallRarita } from '../vetrina/BallRarita'
import { CONTENITORE_POKEDEX } from './indice'
import type { PokemonPosseduti } from './usePokemonPosseduti'

// fascia blu in cima, come la home e gli illustratori: titolo con la ball e, con l'accesso, quanti ne hai
export function TestataPokedex({ posseduti }: { posseduti: PokemonPosseduti | null }) {
  const quota = posseduti ? percentuale(posseduti.posseduti, posseduti.totale) : 0
  return (
    <section aria-labelledby="titolo-pokedex" className="sfondo-hero animate-gradiente relative overflow-hidden text-white">
      <div className={cn(CONTENITORE_POKEDEX, 'flex flex-wrap items-end justify-between gap-x-10 gap-y-5 py-8 lg:py-10')}>
        <div>
          <h1 id="titolo-pokedex" className="flex items-center gap-[0.2em] font-titolo text-5xl font-bold leading-none sm:text-6xl">
            Pokédex
            <BallRarita tono="rosso" className="size-[0.8em] shrink-0 -rotate-12 drop-shadow-[0_4px_6px_rgb(0_0_0/0.4)]" />
          </h1>
          <p className="mt-3 max-w-xl text-white/80">Tutti i 1025 Pokémon, da Bulbasaur in poi: scegline uno e trovi ogni carta in cui è apparso.</p>
        </div>
        {posseduti && (
          <div className="w-full max-w-xs">
            <p className="flex items-baseline gap-2">
              <span className="font-titolo text-4xl font-bold leading-none">{posseduti.posseduti}</span>
              <span className="text-white/80">
                su {posseduti.totale} in collezione · {quota}%
              </span>
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-giallo-400" style={{ width: `${quota}%` }} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
