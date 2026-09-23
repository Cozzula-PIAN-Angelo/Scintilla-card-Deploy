import { Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { ModaleCarta } from '../components/ModaleCarta'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { VetrinaEspansioni } from '../features/espansioni/VetrinaEspansioni'
import { Hero } from '../features/oggetti/Hero'
import { useGetOggettiQuery } from '../features/oggetti/oggettiApi'
import { ORDINAMENTO_PREDEFINITO } from '../features/oggetti/ordinamenti'
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { useTitolo } from '../hooks/useTitolo'
import type { Oggetto } from '../types/api'

export function CatalogoPage() {
  useTitolo('Catalogo')
  // solo per il ventaglio dell'hero: le ultime carte arrivate
  const { data: ultime } = useGetOggettiQuery({ page: 0, size: 12, sort: ORDINAMENTO_PREDEFINITO })
  const { isPreferito, toggle } = usePreferiti()
  const [selezionato, setSelezionato] = useState<Oggetto | null>(null)
  const sezione = useRef<HTMLElement>(null)

  const scorriAlCatalogo = () => sezione.current?.scrollIntoView({ block: 'start' })

  return (
    <PaginaAnimata>
      <Hero vetrina={ultime?.content.filter((o) => o.immagineUrl).slice(0, 3) ?? []} onEsplora={scorriAlCatalogo} />

      <section ref={sezione} id="catalogo" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-4xl font-bold text-blu-900">
            Le espansioni
            <Sparkles aria-hidden className="size-7 text-blu-500" />
          </h2>
          <p className="mt-1 text-blu-900/70">Scegli un'espansione per scoprirne le carte.</p>
        </div>

        <VetrinaEspansioni isPreferito={isPreferito} onTogglePreferito={toggle} onApri={setSelezionato} />
      </section>

      <ModaleCarta
        oggetto={selezionato}
        preferito={selezionato ? isPreferito(selezionato.id) : false}
        onTogglePreferito={toggle}
        onChiudi={() => setSelezionato(null)}
      />
    </PaginaAnimata>
  )
}
