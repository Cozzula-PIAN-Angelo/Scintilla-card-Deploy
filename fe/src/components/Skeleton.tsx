import { cn } from '../utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton dissolvenza-ridotta rounded-2xl', className)} />
}

// stesse colonne e stesso riquadro di GrigliaOggetti e CardOggetto (compatto sui telefoni)
// colonne della griglia delle carte (vedi le classi qui sotto e GrigliaOggetti): da telefono a monitor
export const COLONNE_GRIGLIA = { stretta: [2, 3], larga: [2, 3, 4] }

// schede dello scheletro: il minimo comune multiplo delle colonne, così ogni riga è piena (6 strette, 12 larghe)
export function schedeScheletro(stretta?: boolean): number {
  const mcd = (a: number, b: number): number => (b === 0 ? a : mcd(b, a % b))
  return COLONNE_GRIGLIA[stretta ? 'stretta' : 'larga'].reduce((mcm, colonne) => (mcm * colonne) / mcd(mcm, colonne), 1)
}

export function GrigliaSkeleton({ quante, stretta }: { quante?: number; stretta?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Caricamento delle carte"
      className={cn('grid grid-cols-2 gap-3 sm:gap-6', stretta ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4')}
    >
      {Array.from({ length: quante ?? schedeScheletro(stretta) }, (_, i) => (
        <div key={i} className="rounded-2xl bg-superficie p-2 shadow-lg shadow-ombra/10 sm:rounded-3xl sm:p-3">
          <Skeleton className="aspect-[63/88] w-full" />
          <div className="mt-2 flex flex-col items-start gap-1.5 px-1 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Skeleton className="h-4 w-2/3 rounded-full sm:h-5" />
            <Skeleton className="h-5 w-12 rounded-full sm:h-7 sm:w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}
