import { cn } from '../../utils/cn'

// barra di avanzamento con la percentuale per i lettori di schermo
export function Barra({ valore, totale, className }: { valore: number; totale: number; className?: string }) {
  const percentuale = totale > 0 ? Math.round((valore / totale) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={percentuale}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 overflow-hidden rounded-full bg-tenue', className)}
    >
      <div className="h-full rounded-full bg-blu-500" style={{ width: `${percentuale}%` }} />
    </div>
  )
}

export function percentuale(valore: number, totale: number) {
  return totale > 0 ? Math.round((valore / totale) * 100) : 0
}
