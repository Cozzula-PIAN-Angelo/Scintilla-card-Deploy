import { PaginaAnimata } from '../components/PaginaAnimata'
import { VetrinaEspansioni } from '../features/espansioni/VetrinaEspansioni'
import { useTitolo } from '../hooks/useTitolo'

// tutte le espansioni, divise per serie e con la ricerca (la vetrina che prima stava in home)
export function EspansioniPage() {
  useTitolo('Espansioni')

  return (
    <PaginaAnimata>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-testo">Le espansioni</h1>
          <p className="mt-1 text-testo/70">Da Base Set a oggi: apri un set e guarda quante carte ti mancano.</p>
        </div>

        <VetrinaEspansioni />
      </section>
    </PaginaAnimata>
  )
}
