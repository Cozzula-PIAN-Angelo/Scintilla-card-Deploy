import { AnimatePresence, motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../utils/cn'

interface Props {
  attivo: boolean
  onToggle: () => void
  nome: string
  className?: string
}

const SCINTILLE = [0, 60, 120, 180, 240, 300]

export function PulsanteCuore({ attivo, onToggle, nome, className }: Props) {
  // incrementa a ogni "accensione": fa ripartire l'esplosione di scintille
  const [impulso, setImpulso] = useState(0)

  return (
    <motion.button
      type="button"
      aria-pressed={attivo}
      aria-label={attivo ? `Rimuovi ${nome} dai preferiti` : `Aggiungi ${nome} ai preferiti`}
      onClick={(evento) => {
        evento.stopPropagation()
        if (!attivo) setImpulso((n) => n + 1)
        onToggle()
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.85 }}
      className={cn(
        'relative grid size-11 place-items-center rounded-full bg-white shadow-lg shadow-blu-900/20 ring-1 ring-blu-900/10',
        className,
      )}
    >
      <motion.span
        initial={false}
        animate={attivo ? { scale: [1, 1.45, 0.9, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="grid place-items-center"
      >
        <Heart
          aria-hidden
          className={cn(
            'size-5 transition-colors',
            attivo ? 'fill-rosso-500 text-rosso-500' : 'fill-transparent text-blu-700',
          )}
        />
      </motion.span>

      <AnimatePresence>
        {attivo && impulso > 0 && (
          <motion.span key={impulso} aria-hidden className="pointer-events-none absolute inset-0">
            {SCINTILLE.map((angolo) => (
              <motion.span
                key={angolo}
                className="absolute left-1/2 top-1/2 size-1.5 rounded-full bg-rosso-500"
                initial={{ x: '-50%', y: '-50%', opacity: 1, scale: 1 }}
                animate={{
                  x: `calc(-50% + ${Math.cos((angolo * Math.PI) / 180) * 22}px)`,
                  y: `calc(-50% + ${Math.sin((angolo * Math.PI) / 180) * 22}px)`,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
