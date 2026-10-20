import { useRef } from 'react'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { VetrinaEspansioni } from '../features/espansioni/VetrinaEspansioni'
import { Hero } from '../features/oggetti/Hero'
import { useUltimeCarte } from '../features/oggetti/useUltimeCarte'
import { useTitolo } from '../hooks/useTitolo'

export function CatalogoPage() {
  useTitolo('Catalogo')
  // solo per l'hero: le prime tre nel ventaglio, le altre sparse sullo sfondo
  const ultime = useUltimeCarte()
  const sezione = useRef<HTMLElement>(null)

  const scorriAlCatalogo = () => sezione.current?.scrollIntoView({ block: 'start' })

  return (
    <PaginaAnimata>
      <Hero vetrina={ultime.slice(0, 3)} sfondo={ultime.slice(3)} onEsplora={scorriAlCatalogo} />

      <section ref={sezione} id="catalogo" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-testo">Le espansioni</h2>
          <p className="mt-1 text-testo/70">Scegli un'espansione per scoprirne le carte.</p>
        </div>

        <VetrinaEspansioni />
      </section>
    </PaginaAnimata>
  )
}
