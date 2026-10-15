import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Skeleton } from '../../components/Skeleton'
import { POKEDEX } from '../pokedex/pokedex'
import { useGetStatisticheQuery } from './statisticheApi'

// riquadro semplice in cima alla pagina Binder: quattro numeri e il link alla pagina completa.
// In errore non compare: la mensola resta usabile
export function RiepilogoCollezione() {
  const { data, isLoading, isError } = useGetStatisticheQuery()

  if (isLoading) return <Skeleton className="mb-10 h-32 w-full rounded-3xl" />
  if (isError || !data) return null

  const { totali, valore, pokemon } = data
  const numeri = [
    { etichetta: 'Carte', valore: totali.carteDiverse.toLocaleString('it-IT') },
    { etichetta: 'Pokédex', valore: `${pokemon.length} / ${POKEDEX.length}` },
    { etichetta: 'Valore', valore: `≈ ${Math.round(valore.totale).toLocaleString('it-IT')} €` },
    { etichetta: 'Set completati', valore: `${totali.setCompletati} su ${totali.setIniziati}` },
  ]

  return (
    <section aria-label="La tua collezione" className="mb-10 rounded-3xl bg-superficie p-5 shadow-lg shadow-ombra/10 ring-1 ring-linea/5">
      {totali.carteDiverse === 0 ? (
        <p className="text-testo/80">Segna le carte che possiedi dalle pagine dei set o dei Pokémon.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {numeri.map((n) => (
              <div key={n.etichetta}>
                <dt className="text-sm font-semibold text-testo/70">{n.etichetta}</dt>
                <dd className="mt-1 text-2xl font-bold text-testo sm:text-3xl">{n.valore}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/collezione"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accento underline-offset-4 hover:underline"
          >
            Tutte le statistiche
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </>
      )}
    </section>
  )
}
