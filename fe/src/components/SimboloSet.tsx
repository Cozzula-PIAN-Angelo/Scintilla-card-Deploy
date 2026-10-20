import { useState } from 'react'
import { cn } from '../utils/cn'

interface Props {
  src: string | null | undefined
  className?: string
  lazy?: boolean
  // senza simbolo (o se non si carica) un riquadro vuoto della stessa misura, così le righe restano allineate
  tieniPosto?: boolean
}

// simbolo di un set: decorativo (il nome del set è sempre accanto), sparisce se manca o se non si carica
export function SimboloSet({ src, className, lazy = false, tieniPosto = false }: Props) {
  // stato legato allo src: se cambia, si riprova
  const [srcInErrore, setSrcInErrore] = useState<string | null>(null)

  if (!src || srcInErrore === src) return tieniPosto ? <span className={className} /> : null
  return (
    <img
      src={src}
      alt=""
      loading={lazy ? 'lazy' : undefined}
      onError={() => setSrcInErrore(src)}
      className={cn('object-contain', className)}
    />
  )
}
