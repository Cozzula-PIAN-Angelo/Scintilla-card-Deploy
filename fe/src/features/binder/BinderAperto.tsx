import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Book, BookOpen, ChevronLeft, ChevronRight, Layers, Maximize2, Minimize2, Settings2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { messaggioErrore, statoErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Loader } from '../../components/Loader'
import { ModaleCarta } from '../../components/ModaleCarta'
import { StatoErrore } from '../../components/StatiPagina'
import { useDimensioni } from '../../hooks/useDimensioni'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Binder, BinderDettaglio } from '../../types/api'
import { cn } from '../../utils/cn'
import { usePreferiti } from '../preferiti/usePreferiti'
import { Album } from './aperto/Album'
import { AvvisoInMano, Cestino } from './aperto/AvvisiBinder'
import { Cassetto, IntestazioneCassetto } from './aperto/Cassetto'
import { useAperturaBinder } from './aperto/useAperturaBinder'
import { useCarteBinder } from './aperto/useCarteBinder'
import { useSchermoIntero } from './aperto/useSchermoIntero'
import { useSfoglio } from './aperto/useSfoglio'
import { useSfoglioPuntatore } from './aperto/useSfoglioPuntatore'
import { proporzionePagina } from './aspetto'
import { useGetBinderDettaglioQuery } from './binderApi'
import { Contesto } from './contesto'

interface Props {
  id: string
  onChiuso: () => void
  onImpostazioni: (binder: Binder) => void
}

export function BinderAperto({ id, onChiuso, onImpostazioni }: Props) {
  const { data, isLoading, isError, error, refetch } = useGetBinderDettaglioQuery(id)

  if (isLoading) return <Loader etichetta="Apro il binder…" className="py-32" />
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-6 py-24">
        <StatoErrore
          messaggio={
            statoErrore(error) === 404
              ? 'Questo binder non esiste più.'
              : messaggioErrore(error, 'Non è stato possibile aprire il binder.')
          }
          onRiprova={statoErrore(error) === 404 ? undefined : refetch}
        />
        <Button variante="chiaro" onClick={onChiuso}>
          <ArrowLeft aria-hidden className="size-4" />I miei binder
        </Button>
      </div>
    )
  }
  return <VistaBinder dettaglio={data} onChiuso={onChiuso} onImpostazioni={onImpostazioni} />
}

function VistaBinder({ dettaglio, onChiuso, onImpostazioni }: { dettaglio: BinderDettaglio } & Omit<Props, 'id'>) {
  const { binder, slot } = dettaglio
  const doppia = useMediaQuery('(min-width: 1024px)')
  const preferiti = usePreferiti()
  const carte = useCarteBinder(binder.id)

  const [cassettoAperto, setCassettoAperto] = useState(false)
  const [cassettoLaterale, setCassettoLaterale] = useState(true)

  // --- apertura e sfoglio ---------------------------------------------------------------
  const apertura = useAperturaBinder(onChiuso)
  const { fase, apri } = apertura
  const sfoglio = useSfoglio({ doppia, pagine: binder.pagine, attivo: fase === 'aperto', onGiro: carte.chiudiMenu })
  const { vista, numeroViste, vaiA } = sfoglio

  // a copertina richiusa si torna alla mensola, oppure si resta col binder chiuso davanti
  const chiudi = (destinazione: 'mensola' | 'resta' = 'mensola') =>
    apertura.chiudi(destinazione, () => {
      sfoglio.azzera()
      carte.annulla()
    })

  // --- spazio: il binder si adatta all'area libera; a schermo intero copre tutta la finestra ---
  const [misuraSpazio, spazioLibero] = useDimensioni<HTMLDivElement>()
  const schermo = useSchermoIntero()
  const proporzione = proporzionePagina(binder.tasche)
  const rapporto = doppia ? 2 * proporzione : proporzione
  // il più grande possibile nello spazio libero, senza deformarlo
  const larghezzaLibro = Math.max(0, Math.min(spazioLibero.larghezza, spazioLibero.altezza * rapporto))
  const puntatore = useSfoglioPuntatore({ attivo: fase === 'aperto', doppia, larghezzaLibro, sfoglio, onPresa: carte.chiudiMenu })

  // frecce per sfogliare, Esc per posare la carta in mano o chiudere il menu di una tasca
  useEffect(() => {
    function tasto(evento: KeyboardEvent) {
      const bersaglio = evento.target as HTMLElement | null
      if (bersaglio?.closest('input, textarea, select, [role="dialog"]')) return
      if (evento.key === 'ArrowRight') vaiA(vista + 1)
      else if (evento.key === 'ArrowLeft') vaiA(vista - 1)
      else if (evento.key === 'Escape') carte.annulla()
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [vaiA, vista, carte.annulla])

  const aperto = fase === 'aperto'

  const primaPagina = doppia ? Math.max(0, 2 * vista - 1) : vista
  const etichettaVista = doppia
    ? vista === 0
      ? `Copertina · pagina 1`
      : 2 * vista < binder.pagine
        ? `Pagine ${2 * vista} – ${2 * vista + 1}`
        : `Pagina ${2 * vista}`
    : `Pagina ${vista + 1}`

  return (
    <Contesto.Provider value={carte.contesto}>
      {/* a schermo intero tutto passa nel body: un antenato con transform (l'animazione di
          pagina) farebbe da riferimento al fixed, che non coprirebbe la finestra */}
      {schermo.inPortale(
        <>
          <div
            className={cn(
              'flex min-h-[26rem] flex-col gap-3 px-3 py-3 sm:px-5',
              // schermo intero: il binder copre anche navbar e footer
              schermo.espanso ? 'cielo-stellato fixed inset-0 z-[45] h-dvh' : 'h-[calc(100dvh-5.5rem)]',
            )}
          >
            <div className="flex shrink-0 items-center gap-3">
              <Button
                variante="chiaro"
                dimensione="sm"
                onClick={() => chiudi('mensola')}
                disabled={!aperto && fase !== 'chiuso'}
                aria-label="Chiudi il binder e torna ai miei binder"
              >
                <ArrowLeft aria-hidden className="size-4" />
                <span className="hidden sm:inline">I miei binder</span>
              </Button>
              <div className="flex min-w-0 flex-1 items-baseline justify-center gap-3">
                <h1 className="truncate text-xl font-bold text-testo sm:text-2xl">{binder.nome}</h1>
                <p className="shrink-0 text-sm text-testo/70">
                  {/* dalle tasche, non da binder.carteInserite: inserire o togliere una carta aggiorna
                      subito le tasche, mentre il conteggio del dettaglio resterebbe quello di apertura */}
                  {slot.length} / {binder.pagine * binder.tasche} carte
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variante="chiaro"
                  dimensione="sm"
                  onClick={() => (fase === 'chiuso' ? apri() : chiudi('resta'))}
                  disabled={fase === 'apertura' || fase === 'chiusura'}
                  aria-label={fase === 'chiuso' ? 'Apri il binder' : 'Chiudi il binder'}
                  title={fase === 'chiuso' ? 'Apri il binder' : 'Chiudi il binder'}
                >
                  {fase === 'chiuso' ? <BookOpen aria-hidden className="size-4" /> : <Book aria-hidden className="size-4" />}
                  <span className="hidden sm:inline">{fase === 'chiuso' ? 'Apri' : 'Chiudi'}</span>
                </Button>
                <Button
                  variante="chiaro"
                  dimensione="sm"
                  onClick={() => (doppia ? setCassettoLaterale((visibile) => !visibile) : setCassettoAperto(true))}
                  aria-pressed={doppia ? cassettoLaterale : undefined}
                  aria-label={doppia ? (cassettoLaterale ? 'Nascondi le carte' : 'Mostra le carte') : 'Aggiungi carte'}
                >
                  <Layers aria-hidden className="size-4" />
                  <span className="hidden sm:inline">Carte</span>
                </Button>
                <Button
                  variante="chiaro"
                  dimensione="sm"
                  onClick={schermo.alternaEspanso}
                  aria-pressed={schermo.espanso}
                  aria-label={schermo.espanso ? 'Esci dallo schermo intero' : 'Schermo intero'}
                  title={schermo.espanso ? 'Esci dallo schermo intero' : 'Schermo intero'}
                >
                  {schermo.espanso ? <Minimize2 aria-hidden className="size-4" /> : <Maximize2 aria-hidden className="size-4" />}
                </Button>
                <Button variante="chiaro" dimensione="sm" onClick={() => onImpostazioni(binder)} aria-label="Impostazioni del binder" title="Impostazioni">
                  <Settings2 aria-hidden className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {/* il binder occupa tutto lo spazio libero, alle sue proporzioni */}
                <div ref={misuraSpazio} className="grid min-h-0 flex-1 place-items-center">
                  <Album
                    binder={binder}
                    slot={slot}
                    doppia={doppia}
                    proporzione={proporzione}
                    rapporto={rapporto}
                    larghezzaLibro={larghezzaLibro}
                    apertura={apertura}
                    sfoglio={sfoglio}
                    puntatore={puntatore}
                  />
                </div>

                <nav aria-label="Pagine del binder" className="flex shrink-0 items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => vaiA(vista - 1)}
                    disabled={!aperto || vista === 0}
                    aria-label="Pagina precedente"
                    className="grid size-10 place-items-center rounded-full bg-superficie text-testo-2 shadow-md shadow-ombra/10 transition-colors hover:bg-tenue disabled:opacity-40"
                  >
                    <ChevronLeft aria-hidden className="size-5" />
                  </button>
                  <label className="flex items-center gap-2 text-sm font-semibold text-testo">
                    <span className="sr-only">Vai alla pagina</span>
                    <span aria-live="polite">{etichettaVista}</span>
                    <select
                      value={primaPagina}
                      disabled={!aperto}
                      onChange={(e) => {
                        const pagina = Number(e.target.value)
                        vaiA(doppia ? Math.floor((pagina + 1) / 2) : pagina)
                      }}
                      aria-label="Vai alla pagina"
                      className="rounded-full bg-superficie px-3 py-1.5 text-sm text-testo shadow-sm ring-1 ring-linea/10 outline-none focus:ring-2 focus:ring-blu-500"
                    >
                      {Array.from({ length: binder.pagine }, (_, p) => (
                        <option key={p} value={p}>
                          {p + 1}
                        </option>
                      ))}
                    </select>
                    <span className="font-medium text-testo/60">di {binder.pagine}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => vaiA(vista + 1)}
                    disabled={!aperto || vista >= numeroViste - 1}
                    aria-label="Pagina successiva"
                    className="grid size-10 place-items-center rounded-full bg-superficie text-testo-2 shadow-md shadow-ombra/10 transition-colors hover:bg-tenue disabled:opacity-40"
                  >
                    <ChevronRight aria-hidden className="size-5" />
                  </button>
                </nav>
              </div>

              {/* cassetto delle carte: colonna laterale richiudibile su schermi larghi */}
              <AnimatePresence initial={false}>
                {doppia && cassettoLaterale && (
                  <motion.aside
                    key="cassetto"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '18rem', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 34 }}
                    className="flex shrink-0 overflow-hidden"
                  >
                    <div className="flex h-full w-72 shrink-0 flex-col rounded-3xl bg-superficie p-4 shadow-lg shadow-ombra/10">
                      <IntestazioneCassetto />
                      <Cassetto />
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* cassetto su schermi stretti: foglio dal basso */}
          <AnimatePresence>
            {cassettoAperto && (
              <>
                <motion.div
                  aria-hidden
                  className="fixed inset-0 z-[46] bg-ombra/50 lg:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setCassettoAperto(false)}
                />
                <motion.div
                  role="dialog"
                  aria-label="Carte da inserire"
                  className="fixed inset-x-0 bottom-0 z-[47] flex h-[72dvh] flex-col rounded-t-3xl bg-superficie p-4 shadow-2xl lg:hidden"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <IntestazioneCassetto />
                    <button
                      type="button"
                      onClick={() => setCassettoAperto(false)}
                      aria-label="Chiudi"
                      className="grid size-10 shrink-0 place-items-center rounded-full text-testo-2 hover:bg-tenue"
                    >
                      <X aria-hidden className="size-5" />
                    </button>
                  </div>
                  <Cassetto onScelta={() => setCassettoAperto(false)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {carte.inMano && <AvvisoInMano sorgente={carte.inMano} onAnnulla={carte.posa} />}
            {carte.trascinata?.tipo === 'tasca' && <Cestino />}
          </AnimatePresence>

          <ModaleCarta
            oggetto={carte.guardata}
            preferito={carte.guardata ? preferiti.isPreferito(carte.guardata.id) : false}
            onTogglePreferito={preferiti.toggle}
            onChiudi={carte.chiudiCarta}
          />
        </>,
      )}
    </Contesto.Provider>
  )
}
