import { useState } from 'react'
import { MarchioIcona, MarchioScritta } from '../../components/Marchio'
import { cn } from '../../utils/cn'

interface Props {
  src: string | null
  lazy?: boolean
  className?: string
}

// logo di un set, steso sul contenitore (che deve essere relative, con le dimensioni). Senza logo (trainer kit,
// McDonald's, promo) o se non si carica, il marchio di CeloManca un po' attenuato: il nome del set sta sempre
// accanto, quindi è decorativo
export function LogoSet({ src, lazy = false, className }: Props) {
  const [srcInErrore, setSrcInErrore] = useState<string | null>(null)
  if (!src || srcInErrore === src) {
    return (
      <div aria-hidden className={cn('@container absolute inset-0 flex items-center justify-center gap-1.5 opacity-70', className)}>
        {/* il tratteggio chiaro della navbar sparirebbe sul fondo della tessera. Nelle tessere strette
            (due colonne da telefono) la scritta non ci sta: resta solo l'icona */}
        <MarchioIcona classeTratteggio="stroke-testo/50" className="h-11" />
        <MarchioScritta classeTratteggio="stroke-testo/50" className="hidden h-7 @min-[12rem]:block" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      onError={() => setSrcInErrore(src)}
      className={cn('absolute inset-0 h-full w-full object-contain', className)}
    />
  )
}
