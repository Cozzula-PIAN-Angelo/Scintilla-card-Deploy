import { cn } from '../utils/cn'

// marchio CeloManca: la carta che hai (piena, bordo giallo) davanti alla sagoma tratteggiata di quella che manca

interface Props {
  className?: string
  // colore della parte tratteggiata: chiaro sulla navbar scura, da cambiare su un fondo chiaro
  classeTratteggio?: string
}

export function MarchioIcona({ className, classeTratteggio = 'stroke-blu-50' }: Props) {
  return (
    <svg viewBox="0 0 44 46" width="44" height="46" aria-hidden className={cn('w-auto', className)}>
      <rect
        x="17.7"
        y="4.7"
        width="20.6"
        height="29.6"
        rx="2.6"
        transform="rotate(12 28 20)"
        className={cn('fill-none', classeTratteggio)}
        strokeWidth="1.4"
        strokeDasharray="2.6 1.9"
      />
      <g transform="rotate(-8 17 25) translate(6 10)">
        <rect width="22" height="31" rx="3" className="fill-giallo-400" />
        <rect x="2.5" y="3" width="17" height="12" rx="1.5" className="fill-blu-500" />
        <circle cx="13.5" cy="8" r="2.6" className="fill-giallo-400" opacity="0.9" />
        <rect x="2.5" y="18" width="17" height="2" rx="1" className="fill-white" />
        <rect x="2.5" y="22" width="11" height="2" rx="1" className="fill-white" opacity="0.8" />
      </g>
    </svg>
  )
}

// «Manca» è vuota e tratteggiata come la carta che manca: il CSS non tratteggia le lettere, serve il testo SVG
export function MarchioScritta({ className, classeTratteggio = 'stroke-blu-50' }: Props) {
  return (
    <svg viewBox="0 0 152 30" width="152" height="30" aria-hidden className={cn('w-auto overflow-visible', className)}>
      <text x="2" y="24" fontSize="26" letterSpacing="-0.26" className="font-titolo font-bold">
        <tspan className="fill-giallo-400">Celo</tspan>
        <tspan
          dx="1.6"
          letterSpacing="1.6"
          className={cn('fill-none', classeTratteggio)}
          strokeWidth="1.4"
          strokeDasharray="2.2 1.6"
          strokeLinejoin="round"
        >
          Manca
        </tspan>
      </text>
    </svg>
  )
}
