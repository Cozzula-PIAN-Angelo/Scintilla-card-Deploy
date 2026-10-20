import { Pencil, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/Button'
import { cn } from '../../utils/cn'

interface Props {
  titolo: string
  sottotitolo: string
  onModifica: () => void
  children: ReactNode
}

// riquadro di una sezione del profilo, con il suo pulsante Modifica
export function SezioneProfilo({ titolo, sottotitolo, onModifica, children }: Props) {
  return (
    <section className="rounded-3xl bg-superficie p-5 shadow-lg shadow-ombra/10 ring-1 ring-linea/5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-testo">{titolo}</h2>
          <p className="text-sm text-testo/70">{sottotitolo}</p>
        </div>
        <Button variante="chiaro" dimensione="sm" onClick={onModifica} aria-label={`Modifica: ${titolo}`}>
          <Pencil aria-hidden className="size-4" />
          <span className="hidden sm:inline">Modifica</span>
        </Button>
      </div>
      {children}
    </section>
  )
}

// posto libero in una sezione: invita a riempirlo e apre la modifica
export function CasellaVuota({ etichetta, onClick, className }: { etichetta: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etichetta}
      className={cn(
        'grid place-items-center rounded-2xl border-2 border-dashed border-linea/25 text-testo/40 transition-colors hover:border-blu-500 hover:text-blu-500',
        className,
      )}
    >
      <Plus aria-hidden className="size-6" />
    </button>
  )
}
