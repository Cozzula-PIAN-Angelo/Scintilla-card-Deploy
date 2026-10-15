import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { BadgeCheck, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { effettoCarta } from '../features/collezione/conteggi'
import { piuPregiata } from '../features/collezione/varianti'
import { RigaArtisti } from '../features/artisti/RigaArtisti'
import { SezioneCollezione } from '../features/collezione/SezioneCollezione'
import type { Oggetto, Variante } from '../types/api'
import { useIndietroChiude } from '../hooks/useIndietroChiude'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { cn } from '../utils/cn'
import { formattaData, formattaPrezzo } from '../utils/formato'
import { HoloCard } from './HoloCard'
import { ImmagineCarta } from './ImmagineCarta'
import { Modale } from './Modale'
import { PulsanteCuore } from './PulsanteCuore'
import type { SfoglioCarte } from './sfoglioCarte'

// ciò che il dettaglio usa della collezione; senza (ospite, altre pagine) la sezione non c'è
export interface CollezioneModale {
  perVariante(id: string): Map<Variante, number>
  modifica(oggetto: Oggetto, variante: Variante, delta: number): void
}

interface Props {
  oggetto: Oggetto | null
  preferito: boolean
  onTogglePreferito: (oggetto: Oggetto) => void
  onChiudi: () => void
  collezione?: CollezioneModale
  // frecce per passare alle carte vicine della lista; senza, il dettaglio mostra solo la carta
  sfoglio?: SfoglioCarte
}

// trascinamento col dito oltre cui si passa alla carta vicina (px), o velocità di un colpo rapido (px/s)
const SOGLIA_SCORRIMENTO = 70
const SOGLIA_VELOCITA = 500

export function ModaleCarta({ oggetto, preferito, onTogglePreferito, onChiudi, collezione, sfoglio }: Props) {
  // l'ultimo oggetto resta visibile durante l'animazione di chiusura
  const ultimo = useRef<Oggetto | null>(null)
  if (oggetto) ultimo.current = oggetto
  const mostrato = ultimo.current
  // variante scelta con un clic su una riga; vale solo per la carta per cui è stata scelta,
  // così aprendo un'altra carta si riparte dalla regola di default
  const [scelta, setScelta] = useState<{ id: string; variante: Variante } | null>(null)
  // a ogni apertura (anche della stessa carta) la scelta riparte da zero; alla chiusura no,
  // così durante l'animazione la carta resta com'era
  const [idAperto, setIdAperto] = useState<string | null>(null)
  const idCorrente = oggetto?.id ?? null
  if (idCorrente !== idAperto) {
    setIdAperto(idCorrente)
    if (idCorrente !== null) setScelta(null)
  }
  const perVariante = mostrato && collezione ? collezione.perVariante(mostrato.id) : undefined
  // la riga scelta comanda lo specchio sulle carte di base; sulle rare l'arcobaleno non dipende dalla scelta
  const varianteScelta = mostrato && scelta?.id === mostrato.id ? scelta.variante : undefined
  const effetto = mostrato ? effettoCarta(mostrato, perVariante, varianteScelta) : null
  // riga evidenziata: quella cliccata, se no la più pregiata posseduta
  const selezionata = varianteScelta ?? piuPregiata([...(perVariante?.keys() ?? [])].filter((v) => (perVariante?.get(v) ?? 0) > 0))

  // verso dell'ultimo passaggio (1 avanti, -1 indietro): la carta nuova entra da quel lato
  const [verso, setVerso] = useState(1)
  const movimentoRidotto = useReducedMotion()
  const tocco = useMediaQuery('(pointer: coarse)')
  const precedente = sfoglio?.onPrecedente
  const successiva = sfoglio?.onSuccessiva
  const vaiIndietro = precedente
    ? () => {
        setVerso(-1)
        precedente()
      }
    : undefined
  const vaiAvanti = successiva
    ? () => {
        setVerso(1)
        successiva()
      }
    : undefined

  // frecce della tastiera, solo a dettaglio aperto
  const aperto = oggetto !== null
  // l'indietro del telefono chiude il dettaglio
  useIndietroChiude(aperto, onChiudi)
  const tasti = useRef({ vaiIndietro, vaiAvanti })
  tasti.current = { vaiIndietro, vaiAvanti }
  useEffect(() => {
    if (!aperto) return
    function tasto(evento: KeyboardEvent) {
      if ((evento.target as HTMLElement | null)?.closest('input, textarea, select')) return
      if (evento.key === 'ArrowLeft') tasti.current.vaiIndietro?.()
      else if (evento.key === 'ArrowRight') tasti.current.vaiAvanti?.()
    }
    document.addEventListener('keydown', tasto)
    return () => document.removeEventListener('keydown', tasto)
  }, [aperto])

  function fineScorrimento(_: unknown, { offset, velocity }: PanInfo) {
    if (offset.x < -SOGLIA_SCORRIMENTO || velocity.x < -SOGLIA_VELOCITA) vaiAvanti?.()
    else if (offset.x > SOGLIA_SCORRIMENTO || velocity.x > SOGLIA_VELOCITA) vaiIndietro?.()
  }

  const spostamento = movimentoRidotto ? 0 : 60

  return (
    <Modale aperto={oggetto !== null} onChiudi={onChiudi} larghezza="max-w-4xl">
      <AnimatePresence initial={false} mode="wait" custom={verso}>
        {mostrato && (
          <motion.div
            key={mostrato.id}
            custom={verso}
            variants={{
              entra: (v: number) => ({ opacity: 0, x: v * spostamento }),
              fermo: { opacity: 1, x: 0 },
              esce: (v: number) => ({ opacity: 0, x: -v * spostamento }),
            }}
            initial="entra"
            animate="fermo"
            exit="esce"
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]"
          >
            <div className="mx-auto w-full max-w-sm">
              <div className="relative">
                {/* col dito la carta si trascina di lato per passare alla vicina */}
                <motion.div
                  drag={sfoglio && tocco ? 'x' : false}
                  dragSnapToOrigin
                  dragElastic={0.5}
                  onDragEnd={fineScorrimento}
                >
                  <HoloCard className="w-full rounded-3xl">
                    <ImmagineCarta
                      src={mostrato.immagineUrl}
                      alt={mostrato.nome}
                      priorita
                      riflesso={effetto}
                      className="aspect-[63/88] w-full rounded-3xl shadow-2xl shadow-ombra/30"
                    />
                  </HoloCard>
                </motion.div>
                {sfoglio && (
                  <>
                    <FrecciaCarta lato="sinistra" onClick={vaiIndietro} />
                    <FrecciaCarta lato="destra" onClick={vaiAvanti} />
                  </>
                )}
              </div>
              {sfoglio?.numero != null && sfoglio.totale > 1 && (
                <p className="mt-3 text-center text-sm font-medium tabular-nums text-testo/70">
                  {sfoglio.numero} / {sfoglio.totale}
                </p>
              )}
            </div>

            <div className="space-y-5">
              {mostrato.idEsterno && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-tenue px-3 py-1 text-xs font-semibold text-testo-2">
                  <BadgeCheck aria-hidden className="size-4" />
                  Carta originale da collezione
                </span>
              )}
              <h2 className="text-3xl font-semibold leading-tight text-testo sm:text-4xl">{mostrato.nome}</h2>
              <p className="inline-block rounded-2xl bg-giallo-400 px-5 py-2 font-titolo text-3xl font-bold text-blu-900 shadow-lg shadow-giallo-400/40">
                {formattaPrezzo(mostrato.prezzo)}
              </p>
              <p className="flex items-center gap-2 text-sm text-testo/70">
                <CalendarDays aria-hidden className="size-4" />
                Nel catalogo dal {formattaData(mostrato.createdAt)}
              </p>
              <RigaArtisti artisti={mostrato.artisti} onNavigazione={onChiudi} sostituisci />
              <div className="flex items-center gap-3 rounded-2xl bg-tenue p-3 pr-5">
                <PulsanteCuore attivo={preferito} onToggle={() => onTogglePreferito(mostrato)} nome={mostrato.nome} />
                <span className="text-sm font-semibold text-testo">
                  {preferito ? 'Nei tuoi preferiti' : 'Aggiungi ai preferiti'}
                </span>
              </div>
              {collezione && perVariante && (
                <SezioneCollezione
                  oggetto={mostrato}
                  perVariante={perVariante}
                  onModifica={(variante, delta) => collezione.modifica(mostrato, variante, delta)}
                  selezionata={selezionata}
                  onSeleziona={(variante) => setScelta({ id: mostrato.id, variante })}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modale>
  )
}

// freccia tonda sopra il bordo della carta; senza onClick (prima o ultima carta) è disattivata
function FrecciaCarta({ lato, onClick }: { lato: 'sinistra' | 'destra'; onClick?: () => void }) {
  const Icona = lato === 'sinistra' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={lato === 'sinistra' ? 'Carta precedente' : 'Carta successiva'}
      className={cn(
        'absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-superficie/90 text-testo shadow-lg shadow-ombra/30 backdrop-blur transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-accento disabled:pointer-events-none disabled:opacity-30 sm:size-11',
        lato === 'sinistra' ? '-left-3 sm:-left-5' : '-right-3 sm:-right-5',
      )}
    >
      <Icona aria-hidden className="size-5 sm:size-6" />
    </button>
  )
}
