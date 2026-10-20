import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Skeleton } from '../../components/Skeleton'
import { avanzamentoPokedex } from './calcoli'
import { useGetStatisticheQuery } from './statisticheApi'

// in cima alla pagina Binder: la collezione detta in una frase, con il link alla pagina completa.
// In errore non compare: la mensola resta usabile
export function RiepilogoCollezione() {
  const { data, isLoading, isError } = useGetStatisticheQuery()

  if (isLoading) return <Skeleton className="mb-10 h-7 w-full max-w-2xl" />
  if (isError || !data) return null

  const { totali, valore, pokemon } = data
  // stesso conteggio della pagina /collezione: i numeri fuori dal Pokédex non contano
  const pokedex = avanzamentoPokedex(pokemon)
  const n = (testo: string): ReactNode => <strong className="font-semibold text-testo">{testo}</strong>

  return (
    <section aria-label="La tua collezione" className="mb-10">
      {totali.carteDiverse === 0 ? (
        <p className="text-testo/80">Segna le carte che possiedi dalle pagine dei set o dei Pokémon.</p>
      ) : (
        <p className="max-w-3xl leading-relaxed text-testo/80">
          {n(totali.carteDiverse.toLocaleString('it-IT'))} {totali.carteDiverse === 1 ? 'carta diversa' : 'carte diverse'},{' '}
          {n(`${pokedex.posseduti}`)} Pokémon su {pokedex.totale} del Pokédex, un valore stimato di{' '}
          {n(`${Math.round(valore.totale).toLocaleString('it-IT')} €`)} e {n(`${totali.setCompletati}`)}{' '}
          {totali.setCompletati === 1 ? 'set completo' : 'set completi'} su {totali.setIniziati}.{' '}
          <Link to="/collezione" className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-accento hover:underline">
            Tutte le statistiche
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </p>
      )}
    </section>
  )
}
