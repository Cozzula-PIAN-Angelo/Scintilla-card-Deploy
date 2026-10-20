import { PaginaAnimata } from '../components/PaginaAnimata'
import { useTitolo } from '../hooks/useTitolo'

export function ProfiloPage() {
  useTitolo('Il mio profilo')
  return (
    <PaginaAnimata className="mx-auto min-h-[70vh] max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold text-testo">Il mio profilo</h1>
    </PaginaAnimata>
  )
}
