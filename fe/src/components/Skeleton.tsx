import { cn } from '../utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton dissolvenza-ridotta rounded-2xl', className)} />
}

export function GrigliaSkeleton({ quante = 8 }: { quante?: number }) {
  return (
    <div role="status" aria-label="Caricamento delle carte" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: quante }, (_, i) => (
        <div key={i} className="rounded-3xl bg-white p-3 shadow-lg shadow-blu-900/10">
          <Skeleton className="aspect-[63/88] w-full" />
          <div className="mt-3 flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-2/3 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
