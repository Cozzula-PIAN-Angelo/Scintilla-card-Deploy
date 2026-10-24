import { motion } from 'framer-motion'
import type { Espansione } from '../../types/api'
import { elementoGriglia } from '../../theme/motion'
import { cn } from '../../utils/cn'
import { SimboloSet } from '../../components/SimboloSet'
import { LogoSet } from './LogoSet'
import { SegnoDigitale } from './SegnoDigitale'

interface Props {
  espansione: Espansione
  // l'ultimo set aperto: tornando all'elenco si ritrova a colpo d'occhio
  evidenziata: boolean
  onClick: () => void
}

// riquadro di un'espansione: logo, nome, anno e numero di carte; i set digitali col loro segno sul bordo alto
export function TileEspansione({ espansione, evidenziata, onClick }: Props) {
  const anno = espansione.dataUscita?.slice(0, 4)

  return (
    <motion.li variants={elementoGriglia} className="list-none">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Apri ${espansione.nome}`}
        className={cn(
          'group relative flex h-full w-full flex-col items-center gap-3 rounded-3xl bg-superficie p-4 text-center shadow-lg shadow-ombra/10 ring-1 ring-linea/5 transition',
          'hover:-translate-y-1 hover:shadow-xl hover:shadow-ombra/25',
          evidenziata && 'ring-4 ring-giallo-400',
        )}
      >
        {/* a cavallo del bordo alto, fuori dallo spazio del logo: i loghi larghi arrivano agli angoli */}
        {espansione.digitale && (
          <SegnoDigitale className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 shadow-md shadow-ombra/25" />
        )}
        {/* dimensioni esplicite + object-contain: il logo resta sempre dentro il riquadro */}
        <div className="relative grid h-24 w-full place-items-center">
          <LogoSet src={espansione.logoUrl} lazy className="transition-transform group-hover:scale-105" />
        </div>
        <div className="mt-auto">
          <p className="line-clamp-2 font-semibold leading-tight text-testo">{espansione.nome}</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-testo/70">
            <SimboloSet src={espansione.simboloUrl} lazy className="size-4" />
            {[anno, espansione.totaleCarte != null && `${espansione.totaleCarte} carte`].filter(Boolean).join(' · ')}
          </p>
        </div>
      </button>
    </motion.li>
  )
}
