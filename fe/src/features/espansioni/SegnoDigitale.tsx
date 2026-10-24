import { Smartphone } from 'lucide-react'
import { cn } from '../../utils/cn'

// set di un gioco digitale (TCG Pocket): le carte si trovano nell'app, non in busta
export function SegnoDigitale({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-blu-900 px-2 py-0.5 text-xs font-semibold text-giallo-400 scuro:ring-1 scuro:ring-giallo-400/40',
        className,
      )}
    >
      <Smartphone aria-hidden className="size-3.5" />
      Digitale
    </span>
  )
}
