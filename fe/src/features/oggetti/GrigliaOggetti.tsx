import { AnimatePresence, motion } from 'framer-motion'
import { CardOggetto } from '../../components/CardOggetto'
import type { Oggetto } from '../../types/api'
import { griglia } from '../../theme/motion'
import { cn } from '../../utils/cn'

interface Props {
  elementi: Array<{ oggetto: Oggetto; aggiuntoIl?: string }>
  // cambia a ogni pagina/ordinamento: la griglia si rimonta e le carte rientrano a cascata
  chiave: string
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onApri: (oggetto: Oggetto) => void
  inAggiornamento?: boolean
}

export function GrigliaOggetti({ elementi, chiave, isPreferito, onTogglePreferito, onApri, inAggiornamento }: Props) {
  return (
    <motion.ul
      key={chiave}
      variants={griglia}
      initial="nascosto"
      animate="visibile"
      aria-busy={inAggiornamento || undefined}
      className={cn(
        'grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        inAggiornamento && 'opacity-60',
      )}
    >
      <AnimatePresence mode="popLayout">
        {elementi.map(({ oggetto, aggiuntoIl }) => (
          <CardOggetto
            key={oggetto.id}
            oggetto={oggetto}
            aggiuntoIl={aggiuntoIl}
            preferito={isPreferito(oggetto.id)}
            onTogglePreferito={() => onTogglePreferito(oggetto)}
            onApri={() => onApri(oggetto)}
          />
        ))}
      </AnimatePresence>
    </motion.ul>
  )
}
