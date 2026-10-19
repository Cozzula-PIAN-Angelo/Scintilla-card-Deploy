import { LoaderCircle, TriangleAlert } from 'lucide-react'

// al posto di BarraCollezione mentre le carte si scaricano a pezzi (vedi useCarteProgressive): barra, filtri e
// master set hanno bisogno di tutte le carte
export function AvvisoCarteInArrivo({ fallito }: { fallito: boolean }) {
  return (
    <section
      role="status"
      aria-label="Caricamento delle carte"
      className="mb-8 flex items-center gap-3 rounded-3xl bg-superficie p-4 text-testo shadow-lg shadow-ombra/10 ring-1 ring-linea/5"
    >
      {fallito ? (
        <>
          <TriangleAlert aria-hidden className="size-5 shrink-0 text-errore" />
          Non è stato possibile preparare tutte le carte: riprova più tardi.
        </>
      ) : (
        <>
          <LoaderCircle aria-hidden className="size-5 shrink-0 animate-spin text-accento" />
          Stiamo preparando tutte le carte… le pagine arrivano una alla volta.
        </>
      )}
    </section>
  )
}
