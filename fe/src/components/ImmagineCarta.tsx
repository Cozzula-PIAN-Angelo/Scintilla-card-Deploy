import { useState, type ImgHTMLAttributes } from 'react'
import { cn } from '../utils/cn'
import { Anello, Fulmine, Scintilla, Stella } from './Forme'

interface Props {
  src: string | null
  alt: string
  className?: string
  priorita?: boolean
  // riflesso olografico (usa --mx, --my, --riflesso di un HoloCard antenato): 'arcobaleno' o 'specchio', su tutta l'immagine
  riflesso?: 'arcobaleno' | 'specchio' | null
}

// forma di una carta vera: angoli come quelli stampati (le stesse proporzioni delle tasche del binder);
// sfondo trasparente perché le immagini hanno già gli angoli trasparenti
export const FORMA_CARTA = 'rounded-[6%/4.3%] bg-transparent!'

// immagine lazy con dissolvenza al caricamento; senza immagine (o se fallisce) un placeholder illustrato.
// object-cover: le scansioni di TCGdex (600x825) sono un po' più larghe della carta vera (63x88) e con
// object-contain lasciavano una striscia vuota in basso; così si perde meno dell'1% del bordo per lato
export function ImmagineCarta({ src, alt, className, priorita = false, riflesso = null }: Props) {
  // stato legato allo src: se cambia, si riparte da "non caricata"
  const [srcCaricata, setSrcCaricata] = useState<string | null>(null)
  const [srcInErrore, setSrcInErrore] = useState<string | null>(null)

  if (!src || srcInErrore === src) return <PlaceholderCarta nome={alt} className={className} />

  const caricata = srcCaricata === src
  return (
    <div className={cn('relative overflow-hidden bg-tenue', className)}>
      {!caricata && <div aria-hidden className="skeleton dissolvenza-ridotta absolute inset-0" />}
      <img
        src={src}
        alt={alt}
        loading={priorita ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setSrcCaricata(src)}
        onError={() => setSrcInErrore(src)}
        className={cn(
          'relative h-full w-full object-cover transition-opacity duration-500',
          caricata ? 'opacity-100' : 'opacity-0',
        )}
      />
      {riflesso === 'specchio' && caricata && <div aria-hidden className="holo-reverse pointer-events-none absolute inset-0" />}
      {riflesso === 'arcobaleno' && caricata && <div aria-hidden className="holo-riflesso pointer-events-none absolute inset-0" />}
    </div>
  )
}

// immagine semplice (tasche e elenchi del binder), senza dissolvenza: se manca o non si carica (per esempio una
// riserva di pokemontcg.io che non esiste più) il placeholder illustrato
export function ImmagineOPlaceholder({
  src,
  nome,
  className,
  ...resto
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string | null; nome: string }) {
  const [srcInErrore, setSrcInErrore] = useState<string | null>(null)
  if (!src || srcInErrore === src) return <PlaceholderCarta nome={nome} className={className} />
  return <img src={src} {...resto} className={className} onError={() => setSrcInErrore(src)} />
}

export function PlaceholderCarta({ nome, className }: { nome: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${nome}: immagine non disponibile`}
      className={cn(
        'relative flex items-end overflow-hidden bg-blu-700 bg-gradient-to-br from-blu-900 via-blu-700 to-blu-500 p-4',
        className,
      )}
    >
      <Anello className="absolute -right-6 -top-6 w-28 stroke-giallo-400/70" />
      <Stella className="absolute left-5 top-6 w-12 fill-giallo-400" />
      <Fulmine className="absolute right-6 top-1/3 w-12 fill-rosso-500" />
      <Scintilla className="absolute left-1/3 top-1/2 w-8 fill-white/80" />
      <Anello className="absolute -bottom-8 -left-8 w-24 stroke-white/30" />
      <span className="relative line-clamp-3 font-titolo text-xl font-semibold leading-tight text-white">{nome}</span>
    </div>
  )
}
