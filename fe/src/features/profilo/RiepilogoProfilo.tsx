import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Profilo } from '../../types/api'
import { POKEDEX } from '../pokedex/pokedex'

// la collezione detta in una frase, con il rimando alle statistiche complete
export function RiepilogoProfilo({ riepilogo }: { riepilogo: Profilo['riepilogo'] }) {
  const n = (valore: number): ReactNode => <strong className="font-semibold text-testo">{valore.toLocaleString('it-IT')}</strong>

  if (riepilogo.carteDiverse === 0 && riepilogo.binder === 0) {
    return (
      <p className="text-testo/80">
        La collezione è ancora vuota: segna le carte che possiedi dalle pagine dei set o dei Pokémon.
      </p>
    )
  }
  return (
    <p className="max-w-3xl leading-relaxed text-testo/80">
      {n(riepilogo.carteDiverse)} {riepilogo.carteDiverse === 1 ? 'carta diversa' : 'carte diverse'}, {n(riepilogo.pokemonPosseduti)}{' '}
      Pokémon su {POKEDEX.length} del Pokédex, {n(riepilogo.setCompletati)} {riepilogo.setCompletati === 1 ? 'set completo' : 'set completi'} e{' '}
      {n(riepilogo.binder)} binder.{' '}
      <Link to="/collezione" className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-accento hover:underline">
        Tutte le statistiche
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </p>
  )
}
