import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../utils/cn'

// forme decorative originali: stella, fulmine, scintilla a quattro punte, anello, simboli di energia

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

// simboli di energia disegnati da noi (non quelli ufficiali del gioco): glifo pieno dentro un cerchio, come le
// energie sulle carte. I dettagli (riflesso, nervatura, pupilla) sono incisi nel colore della notte.
// Colore dal testo (classe text-*), trasparenza con opacity-* sull'intero simbolo
type TipoEnergia = 'fuoco' | 'acqua' | 'erba' | 'lampo' | 'psico' | 'buio'

const GLIFI: Record<TipoEnergia, { forma: ReactNode; dettagli?: ReactNode }> = {
  fuoco: { forma: <path d="M24 11c1.5 4.5 7 7.5 7 14.5a7 7 0 0 1-14 0c0-3.5 1.8-5.6 3.5-7.2.3 2.4 1.4 3.9 2.9 4.7-.4-4.6-.6-8.3.6-12Z" /> },
  acqua: {
    forma: <path d="M24 11c4.5 6 8 10.4 8 15a8 8 0 0 1-16 0c0-4.6 3.5-9 8-15Z" />,
    dettagli: <path d="M20.5 26.5a3.5 3.5 0 0 0 3.5 3.5" />,
  },
  erba: {
    forma: <path d="M14 34c0-12 8-20 20-20 0 12-8 20-20 20Z" />,
    dettagli: <path d="M16 32l12-12" />,
  },
  lampo: { forma: <path d="M26.5 11 17 26.5h7l-2.5 10.5 9.5-15.5h-7l2.5-10.5Z" /> },
  psico: {
    forma: <path d="M11 24c3.5-5.5 8-8 13-8s9.5 2.5 13 8c-3.5 5.5-8 8-13 8s-9.5-2.5-13-8Z" />,
    dettagli: <circle cx="24" cy="24" r="3.5" className="fill-blu-900" />,
  },
  buio: { forma: <path d="M28.5 13.2a11 11 0 1 0 6.3 15.3 8.5 8.5 0 0 1-6.3-15.3Z" /> },
}

export function Energia({ tipo, className, style }: PropsForma & { tipo: TipoEnergia }) {
  const { forma, dettagli } = GLIFI[tipo]
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className} style={style} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="21.5" className="fill-current/15 stroke-current" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <g className="fill-current stroke-current" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
        {forma}
      </g>
      {dettagli && (
        <g className="fill-none stroke-blu-900" strokeWidth={2.5}>
          {dettagli}
        </g>
      )}
    </svg>
  )
}

interface EnergiaFluttuante {
  tipo: TipoEnergia
  classe: string
  durata: number
  ritardo: number
}

// grandi e tenui sul fondo, piccoli e più accesi in primo piano. Ogni tipo ha il suo colore: fuoco rosso, acqua azzurra,
// erba verde, lampo giallo, psico viola, buio quasi nero
const ENERGIE: EnergiaFluttuante[] = [
  { tipo: 'fuoco', classe: 'left-[4%] top-[10%] w-20 text-rosso-500 opacity-85', durata: 16, ritardo: 0 },
  { tipo: 'erba', classe: '-left-8 bottom-[4%] w-36 text-verde-500 opacity-50', durata: 22, ritardo: 1.2 },
  { tipo: 'acqua', classe: 'right-[7%] top-[7%] w-28 text-azzurro-400 opacity-80', durata: 21, ritardo: 0.6 },
  { tipo: 'psico', classe: 'right-[24%] bottom-[14%] w-11 text-viola-400 opacity-90', durata: 15, ritardo: 2 },
  { tipo: 'lampo', classe: 'right-[3%] bottom-[6%] w-16 text-giallo-400 opacity-80', durata: 18, ritardo: 0.3 },
  { tipo: 'buio', classe: 'left-[38%] top-[4%] w-14 text-carbone-900 opacity-80', durata: 17, ritardo: 1.8 },
  { tipo: 'lampo', classe: 'left-[12%] top-[50%] w-7 text-giallo-400 opacity-90', durata: 14, ritardo: 0.9 },
  { tipo: 'fuoco', classe: 'right-[40%] top-[16%] w-6 text-rosso-500 opacity-90', durata: 20, ritardo: 2.4 },
  { tipo: 'acqua', classe: 'left-[47%] bottom-[5%] w-9 text-azzurro-400 opacity-90', durata: 16, ritardo: 3 },
  { tipo: 'buio', classe: '-right-10 top-[42%] w-40 text-carbone-900 opacity-50', durata: 24, ritardo: 1 },
]

export function FormeFluttuanti({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {ENERGIE.map((energia, indice) => (
        <Energia
          key={indice}
          tipo={energia.tipo}
          className={cn('absolute animate-deriva', energia.classe)}
          style={{ animationDuration: `${energia.durata}s`, animationDelay: `${energia.ritardo}s` }}
        />
      ))}
    </div>
  )
}
