import { useId } from 'react'
import type { RaritaContata } from '../../types/api'
import { cn } from '../../utils/cn'
import { raritaMostrate, type TonoBall } from './raritaVetrina'

// colori della metà alta della ball per tono, dalla luce all'ombra
const TONI: Record<TonoBall, string[]> = {
  // gli stessi colori del riflesso olografico delle carte (holo-reverse)
  arcobaleno: ['#eb4696', '#f0af1e', '#28c8b4', '#2a75bb', '#9b5cff'],
  oro: ['#fff1a8', '#ffcb05', '#c8900a'],
  argento: ['#ffffff', '#c9d4ff', '#7d8bbd'],
  blu: ['#8eaeff', '#2a75bb', '#1b4f8a'],
  rosso: ['#ff7a5c', '#e3350d', '#b52a0a'],
}

const CONTORNO = '#0b1f4b'
const BIANCO_BALL = '#f4f6ff'

// ball disegnata a mano: metà alta col colore della rarità, fascia, bottone e un riflesso
export function BallRarita({ tono, className }: { tono: TonoBall; className?: string }) {
  const id = useId()
  const colori = TONI[tono]
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn(tono === 'arcobaleno' && 'ball-iride', className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {colori.map((colore, i) => (
            <stop key={colore} offset={i / (colori.length - 1)} stopColor={colore} />
          ))}
        </linearGradient>
      </defs>
      <path d="M2 12a10 10 0 0 1 20 0z" fill={`url(#${id})`} />
      <path d="M2 12a10 10 0 0 0 20 0z" fill={BIANCO_BALL} />
      <ellipse cx="8" cy="6.6" rx="3.2" ry="1.6" transform="rotate(-30 8 6.6)" fill="white" fillOpacity="0.55" />
      <circle cx="12" cy="12" r="10" fill="none" stroke={CONTORNO} strokeWidth="1.6" />
      <path d="M2 12h20" stroke={CONTORNO} strokeWidth="2" />
      <circle cx="12" cy="12" r="3.4" fill={BIANCO_BALL} stroke={CONTORNO} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.5" fill="none" stroke={CONTORNO} strokeWidth="0.8" strokeOpacity="0.6" />
    </svg>
  )
}

// le rarità importanti del set, dalla più rara: ball, quante e sigla; il nome intero per i lettori di schermo e al passaggio
export function RaritaSet({ rarita, className }: { rarita: RaritaContata[]; className?: string }) {
  if (rarita.length === 0) return null
  return (
    <ul aria-label="Le rarità più ambite" className={cn('flex flex-wrap gap-2', className)}>
      {raritaMostrate(rarita).map((r) => (
        <li
          key={r.rarita}
          title={`${r.quante} ${r.nome}`}
          className={cn(
            'flex items-center gap-2.5 rounded-2xl py-2 pl-2.5 pr-4 text-white',
            r.tono === 'arcobaleno' ? 'riquadro-iride' : 'bg-blu-900/55 ring-1 ring-white/15',
          )}
        >
          <BallRarita tono={r.tono} className={cn('drop-shadow', r.tono === 'arcobaleno' ? 'size-9' : 'size-7')} />
          <span aria-hidden className="flex flex-col">
            <span className="text-xl font-bold leading-none">{r.quante}</span>
            <span className="mt-0.5 text-xs font-semibold tracking-wider text-blu-50">{r.sigla}</span>
          </span>
          <span className="sr-only">
            {r.quante} {r.nome}
          </span>
        </li>
      ))}
    </ul>
  )
}
