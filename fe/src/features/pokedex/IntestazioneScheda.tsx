import { cn } from '../../utils/cn'
import { numeroFormattato, type Pokemon } from './pokedex'
import { SegnoCollezione } from './SegnoCollezione'

// nome del Pokémon col numero dopo, come nel Pokédex dei giochi, e sotto i dettagli: comune alla scheda
// dell'indice (h2) e alla pagina del Pokémon (h1)
export function TitoloPokemon({
  pokemon,
  livello: Titolo,
  dettagli,
  className = 'text-5xl sm:text-6xl',
}: {
  pokemon: Pokemon
  livello: 'h1' | 'h2'
  dettagli: Array<string | false | undefined>
  // misura del nome
  className?: string
}) {
  return (
    <>
      <Titolo className={cn('font-titolo font-bold leading-none', className)}>
        {pokemon.nome} <span className="whitespace-nowrap font-sans text-2xl font-semibold text-white/85">{numeroFormattato(pokemon.numero)}</span>
      </Titolo>
      <p className="mt-3 text-white/95">{dettagli.filter(Boolean).join(' · ')}</p>
    </>
  )
}

// se il Pokémon è in collezione, sul blu della scheda
export function StatoCollezione({ preso, className }: { preso: boolean; className?: string }) {
  return (
    <p className={cn('flex items-center gap-2 font-semibold', className)}>
      <SegnoCollezione preso={preso} className={cn('size-6', !preso && 'border-white/50')} />
      {preso ? "Ce l'hai in collezione" : 'Ti manca: nessuna sua carta in collezione'}
    </p>
  )
}
