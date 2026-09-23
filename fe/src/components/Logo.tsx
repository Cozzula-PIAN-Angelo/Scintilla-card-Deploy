import { Link } from 'react-router'
import { cn } from '../utils/cn'
import { Scintilla } from './Forme'

export function Logo({ compatto = false }: { compatto?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="Scintilla, torna al catalogo">
      <span
        className={cn(
          'relative grid place-items-center rounded-2xl bg-blu-500 shadow-lg shadow-blu-500/40 transition-all duration-300 group-hover:rotate-12',
          compatto ? 'size-9' : 'size-11',
        )}
      >
        <Scintilla className={cn('fill-giallo-400 transition-all duration-300', compatto ? 'w-5' : 'w-6')} />
        <span aria-hidden className="absolute -right-1 -top-1 size-3 rounded-full bg-rosso-500 ring-2 ring-blu-900" />
      </span>
      <span className={cn('font-titolo font-bold text-white transition-all duration-300', compatto ? 'text-xl' : 'text-2xl')}>
        Scint<span className="text-giallo-400">illa</span>
      </span>
    </Link>
  )
}
