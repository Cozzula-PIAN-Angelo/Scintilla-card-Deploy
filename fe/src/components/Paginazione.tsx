import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { molla } from '../theme/motion'
import { cn } from '../utils/cn'

interface Props {
  pagina: number
  totalePagine: number
  onCambia: (pagina: number) => void
}

// numeri di pagina da mostrare (0-based), con "…" dove si salta
function paginePerNavigazione(corrente: number, totale: number): Array<number | 'salto'> {
  if (totale <= 7) return Array.from({ length: totale }, (_, i) => i)
  const vicine = [corrente - 1, corrente, corrente + 1].filter((p) => p > 0 && p < totale - 1)
  const risultato: Array<number | 'salto'> = [0]
  if (vicine[0] > 1) risultato.push('salto')
  risultato.push(...vicine)
  if (vicine[vicine.length - 1] < totale - 2) risultato.push('salto')
  risultato.push(totale - 1)
  return risultato
}

export function Paginazione({ pagina, totalePagine, onCambia }: Props) {
  if (totalePagine <= 1) return null

  const classeFreccia =
    'grid size-11 place-items-center rounded-full bg-white text-blu-700 shadow-md shadow-blu-900/10 transition-colors hover:bg-blu-50 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav aria-label="Paginazione" className="mt-12 flex items-center justify-center gap-2">
      <button type="button" className={classeFreccia} disabled={pagina === 0} onClick={() => onCambia(pagina - 1)} aria-label="Pagina precedente">
        <ChevronLeft aria-hidden className="size-5" />
      </button>

      <ul className="flex items-center gap-1.5">
        {paginePerNavigazione(pagina, totalePagine).map((voce, indice) =>
          voce === 'salto' ? (
            <li key={`salto-${indice}`} aria-hidden className="px-1 font-semibold text-blu-700">
              …
            </li>
          ) : (
            <li key={voce}>
              <button
                type="button"
                onClick={() => onCambia(voce)}
                aria-current={voce === pagina ? 'page' : undefined}
                aria-label={`Pagina ${voce + 1}`}
                className={cn(
                  'relative grid size-11 place-items-center rounded-full text-sm font-bold transition-colors',
                  voce === pagina ? 'text-blu-900' : 'text-blu-700 hover:bg-white',
                )}
              >
                {voce === pagina && (
                  <motion.span layoutId="pagina-attiva" transition={molla} className="absolute inset-0 rounded-full bg-giallo-400 shadow-md" />
                )}
                <span className="relative">{voce + 1}</span>
              </button>
            </li>
          ),
        )}
      </ul>

      <button
        type="button"
        className={classeFreccia}
        disabled={pagina >= totalePagine - 1}
        onClick={() => onCambia(pagina + 1)}
        aria-label="Pagina successiva"
      >
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </nav>
  )
}
