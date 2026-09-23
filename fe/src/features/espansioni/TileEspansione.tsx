import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Espansione } from '../../types/api'
import { elementoGriglia } from '../../theme/motion'
import { cn } from '../../utils/cn'

interface Props {
  espansione: Espansione
  // l'ultimo set aperto: tornando all'elenco si ritrova a colpo d'occhio
  evidenziata: boolean
  onClick: () => void
}

// riquadro di un'espansione: logo, nome, anno e numero di carte
export function TileEspansione({ espansione, evidenziata, onClick }: Props) {
  const [logoRotto, setLogoRotto] = useState(false)
  const anno = espansione.dataUscita?.slice(0, 4)

  return (
    <motion.li variants={elementoGriglia} className="list-none">
      <button
        type="button"
        onClick={onClick}
        aria-label={`Apri ${espansione.nome}`}
        className={cn(
          'group flex h-full w-full flex-col items-center gap-3 rounded-3xl bg-white p-4 text-center shadow-lg shadow-blu-900/10 ring-1 ring-blu-900/5 transition',
          'hover:-translate-y-1 hover:shadow-2xl hover:shadow-blu-500/25',
          evidenziata && 'ring-4 ring-giallo-400',
        )}
      >
        <div className="grid h-20 w-full place-items-center">
          {espansione.logoUrl && !logoRotto ? (
            <img
              src={espansione.logoUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setLogoRotto(true)}
              className="max-h-20 max-w-full object-contain transition-transform group-hover:scale-105"
            />
          ) : (
            <span className="font-titolo text-2xl font-bold text-blu-700">{espansione.nome}</span>
          )}
        </div>
        <div className="mt-auto">
          <p className="line-clamp-2 font-semibold leading-tight text-blu-900">{espansione.nome}</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-blu-900/70">
            {espansione.simboloUrl && <img src={espansione.simboloUrl} alt="" loading="lazy" className="size-4 object-contain" />}
            {[anno, espansione.totaleCarte != null && `${espansione.totaleCarte} carte`].filter(Boolean).join(' · ')}
          </p>
        </div>
      </button>
    </motion.li>
  )
}
