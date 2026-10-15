import { cn } from '../../../utils/cn'
import type { StatisticheBinder } from '../statisticheBinder'

interface Props {
  statistiche: StatisticheBinder
  className?: string
  // colori dei due tratti pieni: carte possedute e carte inserite ma ancora da trovare
  possedute: string
  daTrovare: string
}

// barra a tre tratti delle tasche del binder: possedute, da trovare, libere (il fondo)
export function BarraTasche({ statistiche, className, possedute, daTrovare }: Props) {
  const { piene, totale, possedute: n } = statistiche
  const quota = (valore: number) => `${totale > 0 ? (valore / totale) * 100 : 0}%`
  return (
    <div
      role="img"
      aria-label={`${n} carte possedute, ${piene - n} da trovare, ${totale - piene} tasche libere su ${totale}`}
      className={cn('flex overflow-hidden rounded-full', className)}
    >
      <span className={cn('h-full', possedute)} style={{ width: quota(n) }} />
      <span className={cn('h-full', daTrovare)} style={{ width: quota(piene - n) }} />
    </div>
  )
}
