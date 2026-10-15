import { cn } from '../../utils/cn'
import { percentuale as calcola } from './calcoli'

// barra di avanzamento con la percentuale per i lettori di schermo
// colore: del tratto pieno (oro per i set completati)
export function Barra({ valore, totale, className, colore = 'bg-blu-500' }: { valore: number; totale: number; className?: string; colore?: string }) {
  const percentuale = calcola(valore, totale)
  return (
    <div
      role="progressbar"
      aria-valuenow={percentuale}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 overflow-hidden rounded-full bg-tenue', className)}
    >
      <div className={cn('h-full rounded-full', colore)} style={{ width: `${percentuale}%` }} />
    </div>
  )
}
