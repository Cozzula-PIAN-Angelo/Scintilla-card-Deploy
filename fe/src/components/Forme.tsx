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
