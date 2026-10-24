import { useId, useState, type ImgHTMLAttributes } from 'react'
import { cn } from '../utils/cn'
import { dividiNomeCarta } from '../utils/nomeCarta'

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

// La carta gialla del marchio (MarchioIcona) in grande: cornice gialla, nome in alto, finestra dell'illustrazione
// vuota con una ball in filigrana (4:3, come sulle carte vere), le righe degli attacchi e in fondo set e numero
// (dal nome del catalogo, "Bulbasaur (Mega Evolution 1/132)"). Si legge come una carta anche in mezzo alle scansioni.
// Le misure sono in proporzione alla larghezza della carta (cqw): lo stesso disegno va dalla carta grande del
// dettaglio alla miniatura di 40px delle liste. Le scritte si leggono solo da 96px in su: sotto resterebbero
// tagliate a poche lettere, e chi guarda la miniatura ha il nome accanto.
// Il giallo e il padding stanno sui figli: il contenitore riceve sfondi dal chiamante (bg-tenue) e su di lui
// cqw si riferirebbe al viewport
export function PlaceholderCarta({ nome, className }: { nome: string; className?: string }) {
  const carta = dividiNomeCarta(nome)
  return (
    <div role="img" aria-label={`${nome}: immagine non disponibile`} className={cn('@container relative overflow-hidden', className)}>
      <div className="absolute inset-0 flex flex-col gap-[4cqw] bg-giallo-400 p-[5.5cqw]">
        {/* line-clamp taglia quello che esce dalla riga: interlinee larghe abbastanza per le gambe di g, p, y */}
        <span className="hidden shrink-0 font-titolo text-[10cqw] font-semibold leading-[1.25] text-blu-900 [overflow-wrap:anywhere] @min-[6rem]:line-clamp-2">
          {carta.nome}
        </span>
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden rounded-[2.5cqw] border-[0.8cqw] border-blu-900/30 bg-gradient-to-br from-blu-500 via-blu-700 to-blu-900 shadow-[inset_0_1cqw_2cqw_rgb(11_31_75/0.5)]">
          <BallFiligrana className="absolute -bottom-[12cqw] -right-[10cqw] w-[56cqw]" />
        </div>
        {/* righe degli attacchi: con un nome o un set lunghi si stringono e spariscono, non spingono fuori il fondo */}
        <div aria-hidden className="flex min-h-0 flex-1 flex-col gap-[3cqw] overflow-hidden pt-[1cqw]">
          <span className="flex items-center gap-[2.5cqw]">
            <span className="size-[5.5cqw] shrink-0 rounded-full bg-blu-900/20" />
            <span className="h-[3cqw] w-[62%] rounded-full bg-blu-900/15" />
          </span>
          <span className="h-[3cqw] w-[88%] rounded-full bg-blu-900/15" />
          <span className="h-[3cqw] w-[54%] rounded-full bg-blu-900/15" />
        </div>
        {carta.set && (
          <div className="hidden shrink-0 items-end justify-between gap-[3cqw] border-t-[0.6cqw] border-blu-900/20 pt-[3cqw] pb-[1cqw] text-[6.5cqw] leading-[1.35] text-blu-900 @min-[6rem]:flex">
            <span className="line-clamp-2 font-semibold [overflow-wrap:anywhere]">{carta.set}</span>
            {carta.numero && <span className="shrink-0 font-bold tabular-nums">{carta.numero}</span>}
          </div>
        )}
      </div>
      {/* luce sulla carta, come sul cartoncino stampato */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgb(255_255_255/0.4),transparent_38%,transparent_72%,rgb(11_31_75/0.12))]"
      />
    </div>
  )
}

// ball in filigrana fatta di forme piene, non di tratti: le due metà sono un disco a cui la maschera toglie
// la fascia e lo spazio attorno al bottone, così fascia e anello restano dello stesso spessore e senza giunte.
// Metà alta scura e metà bassa chiara, come una ball vera; al centro anello e bottone
function BallFiligrana({ className }: { className?: string }) {
  const maschera = useId()
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <defs>
        <mask id={maschera}>
          <circle cx="50" cy="50" r="48" fill="white" />
          <rect x="0" y="45.5" width="100" height="9" fill="black" />
          <circle cx="50" cy="50" r="18.5" fill="black" />
        </mask>
      </defs>
      <g mask={`url(#${maschera})`}>
        <rect width="100" height="50" className="fill-blu-900/45" />
        <rect y="50" width="100" height="50" className="fill-white/25" />
      </g>
      <path
        fillRule="evenodd"
        d="M50 37.5a12.5 12.5 0 1 1 0 25a12.5 12.5 0 1 1 0-25zM50 41.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z"
        className="fill-white/25"
      />
      <circle cx="50" cy="50" r="5.5" className="fill-white/30" />
    </svg>
  )
}
