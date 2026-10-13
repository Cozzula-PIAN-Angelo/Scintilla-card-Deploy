import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { cn } from '../../../utils/cn'
import type { Lato } from './costanti'

// trascinando una carta, fermarsi sul bordo del binder gira la pagina
export function BordoSfoglio({ lato, attivo, onSfoglia }: { lato: Lato; attivo: boolean; onSfoglia: () => void }) {
  const timer = useRef<number | null>(null)
  const [sopra, setSopra] = useState(false)

  function ferma() {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    setSopra(false)
  }

  useEffect(() => ferma, [])

  if (!attivo) return null
  return (
    <div
      className={cn(
        'absolute inset-y-0 z-30 flex w-[7%] items-center justify-center transition-colors',
        lato === 'sinistra' ? 'left-0 rounded-l-2xl' : 'right-0 rounded-r-2xl',
        sopra ? 'bg-giallo-400/30' : 'bg-giallo-400/10',
      )}
      onDragEnter={() => {
        if (timer.current) return
        setSopra(true)
        timer.current = window.setTimeout(() => {
          timer.current = null
          setSopra(false)
          onSfoglia()
        }, 650)
      }}
      onDragOver={(e: DragEvent) => e.preventDefault()}
      onDragLeave={ferma}
      onDrop={ferma}
    >
      {lato === 'sinistra' ? <ChevronLeft aria-hidden className="size-8 text-giallo-400" /> : <ChevronRight aria-hidden className="size-8 text-giallo-400" />}
    </div>
  )
}
