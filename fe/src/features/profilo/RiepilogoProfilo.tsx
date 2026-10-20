import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Profilo } from '../../types/api'
import { POKEDEX } from '../pokedex/pokedex'

// i numeri della collezione, con il rimando alle statistiche complete
export function RiepilogoProfilo({ riepilogo }: { riepilogo: Profilo['riepilogo'] }) {
  const voci = [
    { valore: riepilogo.carteDiverse.toLocaleString('it-IT'), etichetta: 'carte diverse' },
    { valore: riepilogo.setCompletati.toLocaleString('it-IT'), etichetta: riepilogo.setCompletati === 1 ? 'set completo' : 'set completi' },
    { valore: `${riepilogo.pokemonPosseduti}/${POKEDEX.length}`, etichetta: 'Pokémon del Pokédex' },
    { valore: riepilogo.binder.toLocaleString('it-IT'), etichetta: 'binder' },
  ]
  return (
    <section aria-label="La collezione in numeri" className="rounded-3xl bg-superficie p-5 shadow-lg shadow-ombra/10 ring-1 ring-linea/5 sm:p-6">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {voci.map((voce) => (
          // il numero sopra l'etichetta, ma dt prima di dd nell'HTML
          <div key={voce.etichetta} className="flex flex-col-reverse">
            <dt className="text-sm text-testo/70">{voce.etichetta}</dt>
            <dd className="text-3xl font-bold text-testo">{voce.valore}</dd>
          </div>
        ))}
      </dl>
      <Link to="/collezione" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blu-500 hover:underline">
        Tutte le statistiche
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </section>
  )
}
