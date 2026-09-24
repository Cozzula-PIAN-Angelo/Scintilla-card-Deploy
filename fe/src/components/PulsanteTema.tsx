import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import type { Tema } from '../theme/tema'

interface Props {
  tema: Tema
  onAlterna: () => void
}

// pensato per le fasce scure (navbar): icona bianca, luna gialla quando è notte
export function PulsanteTema({ tema, onAlterna }: Props) {
  const scuro = tema === 'scuro'

  return (
    <button
      type="button"
      onClick={onAlterna}
      aria-label={scuro ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      title={scuro ? 'Tema chiaro' : 'Tema scuro'}
      className="grid size-11 shrink-0 place-items-center rounded-full text-white transition-colors hover:bg-white/10"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={tema}
          initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {scuro ? <Moon aria-hidden className="size-5 fill-giallo-400 text-giallo-400" /> : <Sun aria-hidden className="size-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
