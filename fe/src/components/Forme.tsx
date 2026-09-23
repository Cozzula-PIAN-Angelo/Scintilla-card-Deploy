import type { CSSProperties } from 'react'
import { cn } from '../utils/cn'

// forme decorative originali: stella, fulmine, scintilla a quattro punte, anello

interface PropsForma {
  className?: string
  style?: CSSProperties
}

export function Stella({ className, style }: PropsForma) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} style={style}>
      <polygon points="50,4 62,36 96,38 69,59 79,93 50,74 21,93 31,59 4,38 38,36" strokeLinejoin="round" />
    </svg>
  )
}

export function Fulmine({ className, style }: PropsForma) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} style={style}>
      <polygon points="60,2 16,58 46,58 36,98 84,38 54,38 66,2" strokeLinejoin="round" />
    </svg>
  )
}

export function Scintilla({ className, style }: PropsForma) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} style={style}>
      <path d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z" />
    </svg>
  )
}

export function Anello({ className, style }: PropsForma) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn('fill-none', className)} style={style}>
      <circle cx="50" cy="50" r="38" strokeWidth="12" />
    </svg>
  )
}

type TipoForma = 'stella' | 'fulmine' | 'scintilla' | 'anello'

const COMPONENTI = { stella: Stella, fulmine: Fulmine, scintilla: Scintilla, anello: Anello }

interface FormaFluttuante {
  tipo: TipoForma
  classe: string
  durata: number
  ritardo: number
}

const FORME: FormaFluttuante[] = [
  { tipo: 'stella', classe: 'left-[5%] top-[14%] w-12 fill-giallo-400', durata: 9, ritardo: 0 },
  { tipo: 'fulmine', classe: 'left-[18%] bottom-[12%] w-14 fill-rosso-500', durata: 11, ritardo: 1.2 },
  { tipo: 'anello', classe: 'right-[8%] top-[10%] w-20 stroke-giallo-400/80', durata: 13, ritardo: 0.6 },
  { tipo: 'scintilla', classe: 'right-[22%] bottom-[18%] w-10 fill-white/80', durata: 8, ritardo: 2 },
  { tipo: 'stella', classe: 'right-[4%] bottom-[8%] w-16 fill-rosso-500/90', durata: 12, ritardo: 0.3 },
  { tipo: 'anello', classe: 'left-[40%] top-[6%] w-10 stroke-rosso-500/80', durata: 10, ritardo: 1.8 },
  { tipo: 'scintilla', classe: 'left-[10%] top-[52%] w-8 fill-giallo-400', durata: 7, ritardo: 0.9 },
  { tipo: 'fulmine', classe: 'right-[38%] top-[20%] w-9 fill-giallo-400/90', durata: 10, ritardo: 2.4 },
]

export function FormeFluttuanti({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {FORME.map((forma, indice) => {
        const Componente = COMPONENTI[forma.tipo]
        return (
          <Componente
            key={indice}
            className={cn('absolute animate-fluttua drop-shadow-lg', forma.classe)}
            style={{ animationDuration: `${forma.durata}s`, animationDelay: `${forma.ritardo}s` }}
          />
        )
      })}
    </div>
  )
}
