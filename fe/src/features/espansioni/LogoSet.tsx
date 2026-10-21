import { useState } from 'react'
import { Anello, Fulmine, Scintilla, Stella } from '../../components/Forme'
import { cn } from '../../utils/cn'

interface Props {
  src: string | null
  lazy?: boolean
  // classi dell'immagine del logo
  className?: string
  // classi del segnaposto (per esempio gli angoli del riquadro)
  classeSegnaposto?: string
}

// logo di un set, steso sul contenitore (che deve essere relative, con le dimensioni). Senza logo (trainer kit,
// McDonald's, promo) o se non si carica, un'illustrazione nello stile di PlaceholderCarta: il nome del set sta
// sempre accanto, quindi è decorativa
export function LogoSet({ src, lazy = false, className, classeSegnaposto }: Props) {
  const [srcInErrore, setSrcInErrore] = useState<string | null>(null)
  if (!src || srcInErrore === src) return <SegnapostoLogo className={classeSegnaposto} />
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

// riquadro orizzontale: le misure sono in proporzione all'altezza (cqh), così le forme non escono dal riquadro
// basso della tessera né da quello più alto della testata
function SegnapostoLogo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute inset-0 overflow-hidden bg-blu-700 bg-gradient-to-br from-blu-900 via-blu-700 to-blu-500 [container-type:size]',
        className,
      )}
    >
      <Anello className="absolute -right-[12cqh] -top-[22cqh] w-[70cqh] stroke-giallo-400/70" />
      <Stella className="absolute left-[12%] top-[16cqh] w-[30cqh] fill-giallo-400" />
      <Scintilla className="absolute left-[44%] top-[50cqh] w-[20cqh] fill-white/80" />
      <Fulmine className="absolute bottom-[14cqh] right-[24%] w-[28cqh] fill-rosso-500" />
      <Anello className="absolute -bottom-[32cqh] -left-[14cqh] w-[60cqh] stroke-white/30" />
    </div>
  )
}
