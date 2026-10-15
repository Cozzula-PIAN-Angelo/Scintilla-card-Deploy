import type { Oggetto } from '../types/api'
import { cn } from '../utils/cn'

interface Posto {
  x: string
  y: string
  larghezza: number
  rotazione: number
  // px: più è sfocata, più è lontana, quindi anche più trasparente
  sfocatura: number
  // da telefono restano solo le carte ai bordi, così il testo non ha niente sotto
  soloLarghi?: boolean
}

const POSTI: Posto[] = [
  { x: '4%', y: '10%', larghezza: 44, rotazione: -14, sfocatura: 3 },
  { x: '16%', y: '68%', larghezza: 60, rotazione: 10, sfocatura: 1.5, soloLarghi: true },
  { x: '40%', y: '4%', larghezza: 32, rotazione: 18, sfocatura: 4, soloLarghi: true },
  { x: '47%', y: '76%', larghezza: 50, rotazione: -8, sfocatura: 2, soloLarghi: true },
  { x: '60%', y: '10%', larghezza: 36, rotazione: 12, sfocatura: 3.5, soloLarghi: true },
  { x: '88%', y: '6%', larghezza: 76, rotazione: -18, sfocatura: 0.6 },
  { x: '93%', y: '60%', larghezza: 58, rotazione: 16, sfocatura: 1 },
  { x: '28%', y: '40%', larghezza: 26, rotazione: -24, sfocatura: 5, soloLarghi: true },
  { x: '74%', y: '74%', larghezza: 32, rotazione: 6, sfocatura: 4 },
]

function opacita(sfocatura: number) {
  if (sfocatura > 3) return 0.3
  if (sfocatura > 1) return 0.5
  return 0.7
}

// carte vere sparse in profondità dietro l'hero e il login: lontane piccole, sfocate e tenui, vicine più nitide.
// Colori un po' smorzati per non fare concorrenza al ventaglio
export function CarteSfondo({ carte, className }: { carte: Oggetto[]; className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {POSTI.map((posto, indice) => {
        const carta = carte[indice]
        const src = carta?.immagineUrlPiccola ?? carta?.immagineUrl
        if (!src) return null
        return (
          <img
            key={carta.id}
            src={src}
            alt=""
            decoding="async"
            // un'immagine che non arriva sparisce invece di mostrare l'icona rotta
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className={cn('absolute animate-deriva rounded-[6%] shadow-xl shadow-ombra/40', posto.soloLarghi && 'hidden md:block')}
            style={{
              left: posto.x,
              top: posto.y,
              width: posto.larghezza,
              rotate: `${posto.rotazione}deg`,
              filter: `blur(${posto.sfocatura}px) saturate(0.85)`,
              opacity: opacita(posto.sfocatura),
              animationDuration: `${12 + indice * 2}s`,
              animationDelay: `${-indice * 1.3}s`,
            }}
          />
        )
      })}
    </div>
  )
}
