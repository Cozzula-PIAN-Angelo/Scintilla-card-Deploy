import { cn } from '../utils/cn'

interface Props {
  etichetta?: string
  className?: string
}

// sfera a spicchi che rimbalza ruotando; con "riduci movimento" pulsa soltanto
export function Loader({ etichetta = 'Caricamento…', className }: Props) {
  return (
    <div role="status" className={cn('flex flex-col items-center gap-3 py-10', className)}>
      <div aria-hidden className="dissolvenza-ridotta relative h-24 w-16">
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <div className="animate-rimbalzo">
            <div className="relative size-11">
              <div className="sfera-loader absolute inset-0 animate-rotazione rounded-full" />
              <div className="sfera-loader-luce absolute inset-0 rounded-full" />
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 mx-auto h-2 w-9 animate-ombra rounded-full bg-ombra" />
      </div>
      <span className="text-sm font-semibold text-testo-2">{etichetta}</span>
    </div>
  )
}
