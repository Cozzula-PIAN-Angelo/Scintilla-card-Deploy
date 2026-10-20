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

// forma di una carta: angoli di circa 2 mm su 63x88, più acuti di quelli stampati (circa 3 mm), così le scansioni
// di TCGdex (angoli dritti) perdono meno immagine. Stesse proporzioni delle tasche del binder (Tasca, ModaleCarta);
// sfondo trasparente: le immagini di riserva (pokemontcg.io) hanno già gli angoli trasparenti
export const FORMA_CARTA = 'rounded-[3%/2.1%] bg-transparent!'

// immagine lazy con dissolvenza al caricamento; senza immagine (o se fallisce) un placeholder illustrato.
// object-fill: le scansioni di TCGdex (600x825) sono un po' più larghe della carta vera (63x88). Con object-contain
// restava una striscia vuota in basso, con object-cover si tagliavano i lati: così la carta si vede intera,
// stretta in larghezza dell'1,5%, che a occhio non si nota
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
          'relative h-full w-full object-fill transition-opacity duration-500',
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

// Le misure sono in proporzione alla larghezza della carta (cqw): lo stesso disegno va dalla carta grande del
// dettaglio alla miniatura di 40px delle liste. Il nome si legge solo da 96px in su: sotto resterebbe tagliato
// a poche lettere, e chi guarda la miniatura ha il nome accanto. Il padding sta sul figlio: sul contenitore
// stesso cqw si riferirebbe al viewport e allargherebbe la carta
export function PlaceholderCarta({ nome, className }: { nome: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${nome}: immagine non disponibile`}
      className={cn(
        '@container relative overflow-hidden bg-blu-700 bg-gradient-to-br from-blu-900 via-blu-700 to-blu-500',
        className,
      )}
    >
      <Anello className="absolute -right-[10cqw] -top-[10cqw] w-[45cqw] stroke-giallo-400/70" />
      <Stella className="absolute left-[8cqw] top-[10cqw] w-[19cqw] fill-giallo-400" />
      <Fulmine className="absolute right-[10cqw] top-1/3 w-[19cqw] fill-rosso-500" />
      <Scintilla className="absolute left-1/3 top-1/2 w-[13cqw] fill-white/80" />
      <Anello className="absolute -bottom-[13cqw] -left-[13cqw] w-[38cqw] stroke-white/30" />
      <div className="absolute inset-0 flex items-end p-[7cqw]">
        <span className="hidden font-titolo text-[9cqw] font-semibold leading-tight text-white [overflow-wrap:anywhere] @min-[6rem]:line-clamp-4">
          {nome}
        </span>
      </div>
    </div>
  )
}
