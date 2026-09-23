import { Sparkles } from 'lucide-react'
import { LinkBottone } from '../components/Button'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { StatoVuoto } from '../components/StatiPagina'
import { useTitolo } from '../hooks/useTitolo'

export function NonTrovataPage() {
  useTitolo('Pagina non trovata')
  return (
    <PaginaAnimata className="min-h-[70vh] px-4">
      <StatoVuoto
        icona={<Sparkles aria-hidden className="size-16" />}
        titolo="Questa pagina è introvabile"
        testo="Più rara di una carta segreta: forse il link non è corretto."
        azione={
          <LinkBottone to="/" variante="primario" dimensione="lg">
            Torna al catalogo
          </LinkBottone>
        }
      />
    </PaginaAnimata>
  )
}
