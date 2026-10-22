import { ArrowDownNarrowWide, ArrowDownWideNarrow } from 'lucide-react'
import { useId } from 'react'
import { leggiOrdinamento, prossimoOrdinamento, type CriterioOrdinamento } from '../features/oggetti/ordinamenti'
import { cn } from '../utils/cn'

interface Props {
  valore: string
  criteri: CriterioOrdinamento[]
  onCambia: (valore: string) => void
}

// un pulsante per criterio: ritoccando quello attivo l'ordine si inverte, la freccia dice il verso
export function PulsantiOrdinamento({ valore, criteri, onCambia }: Props) {
  const id = useId()
  const { campo, verso } = leggiOrdinamento(valore)
  const Freccia = verso === 'asc' ? ArrowDownNarrowWide : ArrowDownWideNarrow

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span id={id} className="text-sm font-semibold text-testo">
        Ordina per
      </span>
      <div role="group" aria-labelledby={id} className="inline-flex flex-wrap gap-1 rounded-full bg-tenue p-1">
        {criteri.map((c) => {
          const attivo = c.campo === campo
          return (
            <button
              key={c.campo}
              type="button"
              aria-pressed={attivo}
              onClick={() => onCambia(prossimoOrdinamento(valore, c))}
              title={attivo ? `${c.descrizioni[verso]}: tocca di nuovo per invertire` : c.descrizioni[c.versoIniziale]}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                attivo ? 'bg-blu-500 text-white' : 'text-testo-2 hover:bg-superficie',
              )}
            >
              {c.etichetta}
              {attivo && (
                <>
                  <Freccia aria-hidden className="size-4" />
                  <span className="sr-only">, {c.descrizioni[verso]}</span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
