import { useState } from 'react'
import { cn } from '../utils/cn'
import type { Cornice } from '../features/collezione/varianti'
import { Anello, Fulmine, Scintilla, Stella } from './Forme'

interface Props {
  src: string | null
  alt: string
  className?: string
  priorita?: boolean
  // riflesso olografico (usa --mx, --my, --riflesso di un HoloCard antenato): 'holo' arcobaleno su bordo e disegno,
  // 'reverse' a specchio sulla sola cornice
  riflesso?: 'holo' | 'reverse' | null
  // cornice misurata della carta: decide la maschera di holo e reverse; null = nessuna maschera, effetto su tutta la carta
  cornice?: Cornice | null
}

// maschera dell'holo per tipo di cornice; senza cornice misurata l'holo copre tutta la carta
const MASCHERA_HOLO: Record<Cornice, string> = {
  normale: 'solo-bordo-e-disegno',
  ex: 'holo-cornice-ex',
}

// immagine lazy con dissolvenza al caricamento; senza immagine (o se fallisce) un placeholder illustrato
export function ImmagineCarta({ src, alt, className, priorita = false, riflesso = null, cornice = null }: Props) {
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
          'relative h-full w-full object-contain transition-opacity duration-500',
          caricata ? 'opacity-100' : 'opacity-0',
        )}
      />
      {riflesso === 'reverse' && caricata && (
        <div
          aria-hidden
          className={cn('holo-reverse pointer-events-none absolute inset-0', cornice === 'normale' && 'senza-disegno')}
        />
      )}
      {riflesso === 'holo' && caricata && (
        <div aria-hidden className={cn('holo-riflesso pointer-events-none absolute inset-0', cornice && MASCHERA_HOLO[cornice])} />
      )}
    </div>
  )
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
