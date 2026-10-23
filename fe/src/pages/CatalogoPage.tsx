import { Layers } from 'lucide-react'
import { LinkBottone } from '../components/Button'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { useGetEspansioniQuery } from '../features/espansioni/espansioniApi'
import { HeroSet } from '../features/vetrina/HeroSet'
import { SetRecenti } from '../features/vetrina/SetRecenti'
import { useTitolo } from '../hooks/useTitolo'

// home: il set più nuovo come hero, i set recenti col ventaglio e la strada per l'elenco completo (/espansioni)
export function CatalogoPage() {
  useTitolo('Catalogo')
  const { data } = useGetEspansioniQuery()

  return (
    <PaginaAnimata>
      <HeroSet />

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-20 sm:px-6">
        <SetRecenti />

        <section
          aria-labelledby="tutte-espansioni"
          className="flex flex-col items-start gap-6 rounded-3xl bg-superficie p-8 shadow-lg shadow-ombra/10 ring-1 ring-linea/5 sm:flex-row sm:items-center sm:justify-between sm:p-10"
        >
          <div className="flex items-center gap-5">
            <Layers aria-hidden className="size-12 shrink-0 text-accento" />
            <div>
              <h2 id="tutte-espansioni" className="text-3xl font-bold text-testo">
                Tutte le espansioni
              </h2>
              <p className="mt-1 text-testo/70">
                {data ? `${data.length} set` : 'I set'} da Base Set a oggi, divisi per serie e da cercare per nome.
              </p>
            </div>
          </div>
          <LinkBottone to="/espansioni" dimensione="lg" className="shrink-0">
            Vedi tutte le espansioni
          </LinkBottone>
        </section>
      </div>
    </PaginaAnimata>
  )
}
