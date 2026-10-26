import { cn } from '../../utils/cn'
import { BallRarita } from '../vetrina/BallRarita'

// segno della collezione: ball rossa se ce l'hai, cerchio tratteggiato (la tasca vuota del marchio) se manca
export function SegnoCollezione({ preso, className }: { preso: boolean; className?: string }) {
  return preso ? (
    <BallRarita tono="rosso" className={cn('shrink-0', className)} />
  ) : (
    <span aria-hidden className={cn('shrink-0 rounded-full border-2 border-dashed border-testo/30', className)} />
  )
}
