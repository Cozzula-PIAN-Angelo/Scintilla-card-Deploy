import { motion } from 'framer-motion'
import { CalendarHeart, Plus } from 'lucide-react'
import { effettoCarta } from '../features/collezione/conteggi'
import type { CollezioneGriglia } from '../features/collezione/useCollezione'
import type { Oggetto } from '../types/api'
import { elementoGriglia } from '../theme/motion'
import { cn } from '../utils/cn'
import { formattaData, formattaPrezzo } from '../utils/formato'
import { HoloCard } from './HoloCard'
import { FORMA_CARTA, ImmagineCarta } from './ImmagineCarta'
import { PulsanteCuore } from './PulsanteCuore'

interface Props {
  oggetto: Oggetto
  preferito: boolean
  onTogglePreferito: () => void
  onApri: () => void
  aggiuntoIl?: string
  // se presente: badge delle copie, "+" rapido e carta in grigio se non posseduta
  collezione?: CollezioneGriglia
  // riga in più sotto nome e prezzo, es. "con Sachiko Eba" nella pagina di un artista
  nota?: string
}

export function CardOggetto({ oggetto, preferito, onTogglePreferito, onApri, aggiuntoIl, collezione, nota }: Props) {
  const copie = collezione?.copie(oggetto.id) ?? 0
  const varianti = collezione?.perVariante(oggetto.id)
  const effetto = effettoCarta(oggetto, varianti)

  return (
    <motion.li layout variants={elementoGriglia} exit="uscita" className="list-none">
      <HoloCard
        className="rounded-3xl"
        sopra={
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 sm:right-5 sm:top-5 sm:gap-2">
            {collezione && copie > 0 && (
              <span className="rounded-full bg-giallo-400 px-2 py-0.5 text-xs font-bold text-blu-900 shadow-lg shadow-ombra/20 sm:px-2.5 sm:py-1 sm:text-sm">
                <span aria-hidden>×{copie}</span>
                <span className="sr-only">{copie === 1 ? '1 copia posseduta' : `${copie} copie possedute`}</span>
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
                className="grid size-9 place-items-center rounded-full bg-superficie text-testo-2 shadow-lg shadow-ombra/20 ring-1 ring-linea/10 transition-transform hover:scale-110 active:scale-90 sm:size-11"
              >
                <Plus aria-hidden className="size-4 sm:size-5" />
              </button>
            )}
            <PulsanteCuore attivo={preferito} onToggle={onTogglePreferito} nome={oggetto.nome} compatto />
          </div>
        }
      >
        <button
          type="button"
          onClick={onApri}
          aria-label={`Apri i dettagli di ${oggetto.nome}`}
          className="group block w-full rounded-2xl bg-superficie p-2 text-left sm:rounded-3xl sm:p-3 shadow-lg shadow-ombra/10 ring-1 ring-linea/5 transition-shadow hover:shadow-xl hover:shadow-ombra/25"
        >
          <ImmagineCarta
            src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl}
            alt={oggetto.nome}
            riflesso={effetto}
            className={cn(
              'aspect-[63/88] w-full transition-[filter] duration-300',
              FORMA_CARTA,
              // non posseduta: in grigio (salvo la scelta «Mancanti a colori»), a colori in hover o con il focus sulla carta
              collezione && !collezione.aColori && copie === 0 && 'grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0',
            )}
          />
          {/* sui telefoni (2 colonne strette) il prezzo va sotto il nome */}
          <div className="mt-2 flex flex-col items-start gap-1.5 px-1 sm:mt-3 sm:flex-row sm:justify-between sm:gap-3">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-testo sm:text-lg">{oggetto.nome}</h3>
            <span className="shrink-0 rounded-full bg-giallo-400 px-2 py-0.5 text-xs font-bold text-blu-900 shadow-sm sm:px-3 sm:py-1 sm:text-sm">
              {formattaPrezzo(oggetto.prezzo)}
            </span>
          </div>
          {nota && <p className="mt-2 truncate px-1 pb-1 text-xs font-medium text-testo/70">{nota}</p>}
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
