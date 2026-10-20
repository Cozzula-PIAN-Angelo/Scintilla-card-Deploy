import { SearchX } from 'lucide-react'
import { LinkBottone } from '../components/Button'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { StatoVuoto } from '../components/StatiPagina'
import { useTitolo } from '../hooks/useTitolo'

export function NonTrovataPage() {
  useTitolo('Pagina non trovata')
  return (
    <PaginaAnimata className="min-h-[70vh] px-4">
      <StatoVuoto
        icona={<SearchX aria-hidden className="size-16" />}
        titolo="Pagina non trovata"
        testo="L'indirizzo non corrisponde a nessuna pagina: controlla il link o riparti dal catalogo."
        azione={
          <LinkBottone to="/" variante="primario" dimensione="lg">
            Torna al catalogo
          </LinkBottone>
        }
      />
    </PaginaAnimata>
  )
}
