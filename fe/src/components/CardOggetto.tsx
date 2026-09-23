import { motion } from 'framer-motion'
import { CalendarHeart } from 'lucide-react'
import type { Oggetto } from '../types/api'
import { elementoGriglia } from '../theme/motion'
import { formattaData, formattaPrezzo } from '../utils/formato'
import { HoloCard } from './HoloCard'
import { ImmagineCarta } from './ImmagineCarta'
import { PulsanteCuore } from './PulsanteCuore'

interface Props {
  oggetto: Oggetto
  preferito: boolean
  onTogglePreferito: () => void
  onApri: () => void
  aggiuntoIl?: string
}

export function CardOggetto({ oggetto, preferito, onTogglePreferito, onApri, aggiuntoIl }: Props) {
  return (
    <motion.li layout variants={elementoGriglia} exit="uscita" className="list-none">
      <HoloCard
        className="rounded-3xl"
        sopra={
          <div className="absolute right-5 top-5 z-10">
            <PulsanteCuore attivo={preferito} onToggle={onTogglePreferito} nome={oggetto.nome} />
          </div>
        }
      >
        <button
          type="button"
          onClick={onApri}
          aria-label={`Apri i dettagli di ${oggetto.nome}`}
          className="block w-full rounded-3xl bg-white p-3 text-left shadow-lg shadow-blu-900/10 ring-1 ring-blu-900/5 transition-shadow hover:shadow-2xl hover:shadow-blu-500/25"
        >
          <ImmagineCarta src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl} alt={oggetto.nome} className="aspect-[63/88] w-full rounded-2xl" />
          <div className="mt-3 flex items-start justify-between gap-3 px-1">
            <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-blu-900">{oggetto.nome}</h3>
            <span className="shrink-0 rounded-full bg-giallo-400 px-3 py-1 text-sm font-bold text-blu-900 shadow-sm">
              {formattaPrezzo(oggetto.prezzo)}
            </span>
          </div>
          {aggiuntoIl && (
            <p className="mt-2 flex items-center gap-1.5 px-1 pb-1 text-xs font-medium text-blu-900/70">
              <CalendarHeart aria-hidden className="size-3.5 text-rosso-700" />
              Aggiunta il {formattaData(aggiuntoIl)}
            </p>
          )}
        </button>
      </HoloCard>
    </motion.li>
  )
}
