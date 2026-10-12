import { motion } from 'framer-motion'
import { CalendarHeart, Plus } from 'lucide-react'
import { varianteEffetto } from '../features/collezione/conteggi'
import type { CollezioneGriglia } from '../features/collezione/useCollezione'
import type { Oggetto, Variante } from '../types/api'
import { elementoGriglia } from '../theme/motion'
import { cn } from '../utils/cn'
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
  // copie possedute per variante (se note): decidono l'effetto olografico
  perVariante?: Map<Variante, number>
  // se presente: badge delle copie, "+" rapido e carta in grigio se non posseduta
  collezione?: CollezioneGriglia
}

export function CardOggetto({ oggetto, preferito, onTogglePreferito, onApri, aggiuntoIl, perVariante, collezione }: Props) {
  const copie = collezione?.copie(oggetto.id) ?? 0
  const varianti = collezione ? collezione.perVariante(oggetto.id) : perVariante
  const effetto = varianteEffetto(oggetto, varianti)

  return (
    <motion.li layout variants={elementoGriglia} exit="uscita" className="list-none">
      <HoloCard
        className="rounded-3xl"
        variante={effetto}
        sopra={
          <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
            {collezione && copie > 0 && (
              <span
                aria-label={copie === 1 ? '1 copia posseduta' : `${copie} copie possedute`}
                className="rounded-full bg-giallo-400 px-2.5 py-1 text-sm font-bold text-blu-900 shadow-lg shadow-ombra/20"
              >
                ×{copie}
              </span>
            )}
            {collezione && (
              <button
                type="button"
                aria-label={`Aggiungi una copia di ${oggetto.nome} alla collezione`}
                onClick={(evento) => {
                  evento.stopPropagation()
                  collezione.aggiungiRapido(oggetto)
                }}
                className="grid size-11 place-items-center rounded-full bg-superficie text-testo-2 shadow-lg shadow-ombra/20 ring-1 ring-linea/10 transition-transform hover:scale-110 active:scale-90"
              >
                <Plus aria-hidden className="size-5" />
              </button>
            )}
            <PulsanteCuore attivo={preferito} onToggle={onTogglePreferito} nome={oggetto.nome} />
          </div>
        }
      >
        <button
          type="button"
          onClick={onApri}
          aria-label={`Apri i dettagli di ${oggetto.nome}`}
          className="group block w-full rounded-3xl bg-superficie p-3 text-left shadow-lg shadow-ombra/10 ring-1 ring-linea/5 transition-shadow hover:shadow-2xl hover:shadow-blu-500/25"
        >
          <ImmagineCarta
            src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl}
            alt={oggetto.nome}
            reverse={effetto === 'REVERSE_HOLO'}
            className={cn(
              'aspect-[63/88] w-full rounded-2xl transition-[filter] duration-300',
              // non posseduta: in grigio, a colori in hover o con il focus sulla carta
              collezione && copie === 0 && 'grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0',
            )}
          />
          <div className="mt-3 flex items-start justify-between gap-3 px-1">
            <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-testo">{oggetto.nome}</h3>
            <span className="shrink-0 rounded-full bg-giallo-400 px-3 py-1 text-sm font-bold text-blu-900 shadow-sm">
              {formattaPrezzo(oggetto.prezzo)}
            </span>
          </div>
          {aggiuntoIl && (
            <p className="mt-2 flex items-center gap-1.5 px-1 pb-1 text-xs font-medium text-testo/70">
              <CalendarHeart aria-hidden className="size-3.5 text-errore" />
              Aggiunta il {formattaData(aggiuntoIl)}
            </p>
          )}
        </button>
      </HoloCard>
    </motion.li>
  )
}
