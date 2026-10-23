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

// tre grandicelle tagliate dai bordi, le altre piccole: la differenza di grandezza dà la profondità
const POSTI: Posto[] = [
  { x: '-3%', y: '8%', larghezza: 140, rotazione: -14, sfocatura: 2.5, soloLarghi: true },
  { x: '16%', y: '47%', larghezza: 60, rotazione: 10, sfocatura: 1.5 },
  { x: '40%', y: '4%', larghezza: 32, rotazione: 18, sfocatura: 4, soloLarghi: true },
  { x: '45%', y: '74%', larghezza: 96, rotazione: -8, sfocatura: 2, soloLarghi: true },
  { x: '60%', y: '10%', larghezza: 36, rotazione: 12, sfocatura: 3.5, soloLarghi: true },
  { x: '86%', y: '-6%', larghezza: 150, rotazione: -18, sfocatura: 1.5, soloLarghi: true },
  { x: '93%', y: '60%', larghezza: 58, rotazione: 16, sfocatura: 1 },
  { x: '28%', y: '40%', larghezza: 26, rotazione: -24, sfocatura: 5, soloLarghi: true },
  { x: '74%', y: '74%', larghezza: 32, rotazione: 6, sfocatura: 4 },
  // riempiono gli angoli in basso, rimasti vuoti
  { x: '3%', y: '72%', larghezza: 72, rotazione: 8, sfocatura: 1.5, soloLarghi: true },
  { x: '82%', y: '80%', larghezza: 66, rotazione: -12, sfocatura: 2 },
  // tra il ventaglio e il bordo destro
  { x: '79%', y: '32%', larghezza: 84, rotazione: 10, sfocatura: 2, soloLarghi: true },
  { x: '95%', y: '24%', larghezza: 44, rotazione: -10, sfocatura: 3.5, soloLarghi: true },
]

function opacita(sfocatura: number) {
  if (sfocatura > 3) return 0.3
  if (sfocatura > 1) return 0.5
  return 0.7
}

// carte vere sparse in profondità dietro la hero (carte del set più nuovo) e il login: lontane piccole, sfocate e tenui, vicine più nitide.
// Colori un po' smorzati per non fare concorrenza alle carte in primo piano
export function CarteSfondo({ carte, className }: { carte: Pick<Oggetto, 'id' | 'immagineUrl' | 'immagineUrlPiccola'>[]; className?: string }) {
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
            className={cn('absolute animate-deriva rounded-[3%/2.1%] shadow-xl shadow-ombra/40', posto.soloLarghi && 'hidden md:block')}
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
