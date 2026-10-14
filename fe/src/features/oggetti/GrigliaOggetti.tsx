import { AnimatePresence, motion } from 'framer-motion'
import { CardOggetto } from '../../components/CardOggetto'
import type { Oggetto } from '../../types/api'
import { griglia } from '../../theme/motion'
import { cn } from '../../utils/cn'
import type { CollezioneGriglia } from '../collezione/useCollezione'

interface Props {
  elementi: Array<{ oggetto: Oggetto; aggiuntoIl?: string }>
  // cambia a ogni pagina/ordinamento: la griglia si rimonta e le carte rientrano a cascata
  chiave: string
  isPreferito: (id: string) => boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onApri: (oggetto: Oggetto) => void
  inAggiornamento?: boolean
  // accanto a una colonna laterale: al massimo 3 carte per riga, altrimenti i nomi si tagliano
  stretta?: boolean
  collezione?: CollezioneGriglia
  // riga in più sotto una carta (vedi CardOggetto)
  notaPer?: (oggetto: Oggetto) => string | undefined
}

export function GrigliaOggetti({ elementi, chiave, isPreferito, onTogglePreferito, onApri, inAggiornamento, stretta, collezione, notaPer }: Props) {
  return (
    <motion.ul
      key={chiave}
      variants={griglia}
      initial="nascosto"
      animate="visibile"
      aria-busy={inAggiornamento || undefined}
      className={cn(
        // 2 colonne anche sui telefoni: a una sola, ogni carta riempiva lo schermo
        'grid grid-cols-2 gap-3 transition-opacity sm:gap-6',
        stretta ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4',
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
            collezione={collezione}
            nota={notaPer?.(oggetto)}
          />
        ))}
      </AnimatePresence>
    </motion.ul>
  )
}
