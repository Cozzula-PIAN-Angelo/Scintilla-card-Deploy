import { AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { messaggioErrore, statoErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Loader } from '../../components/Loader'
import { ModaleCarta } from '../../components/ModaleCarta'
import { sfoglioCarte } from '../../components/sfoglioCarte'
import { StatoErrore } from '../../components/StatiPagina'
import { useDimensioni } from '../../hooks/useDimensioni'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Binder, BinderDettaglio } from '../../types/api'
import { cn } from '../../utils/cn'
import { usePreferiti } from '../preferiti/usePreferiti'
import { Album } from './aperto/Album'
import { AvvisoInMano, Cestino } from './aperto/AvvisiBinder'
import { BarraBinder } from './aperto/BarraBinder'
import { CassettoDalBasso, CassettoLaterale } from './aperto/Cassetto'
import { NavigazionePagine } from './aperto/NavigazionePagine'
import { useAperturaBinder } from './aperto/useAperturaBinder'
import { ModaleOrdina } from './aperto/ModaleOrdina'
import { useCarteBinder } from './aperto/useCarteBinder'
import { useFaiSpazio } from './aperto/useFaiSpazio'
import { useSchermoIntero } from './aperto/useSchermoIntero'
import { useSfoglio } from './aperto/useSfoglio'
import { useSfoglioPuntatore } from './aperto/useSfoglioPuntatore'
import { proporzionePagina } from './aspetto'
import { useGetBinderDettaglioQuery } from './binderApi'
import { Contesto, stessaPosizione } from './contesto'
import { statisticheBinder } from './statisticheBinder'
import { creaMappa, possiede, varianteMostrata } from '../collezione/conteggi'

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
  // dalla collezione del dettaglio: si aggiorna con le tasche e con "Ce l'ho"
  const mappa = useMemo(() => creaMappa(dettaglio.collezione), [dettaglio.collezione])
  const statistiche = useMemo(
    () => statisticheBinder(slot, binder.pagine * binder.tasche, (id, variante) => possiede(mappa, id, variante)),
    [mappa, slot, binder.pagine, binder.tasche],
  )
  const doppia = useMediaQuery('(min-width: 1024px)')
  const preferiti = usePreferiti()
  const [faiSpazio, setFaiSpazio] = useFaiSpazio()
  const [ordinaAperto, setOrdinaAperto] = useState(false)
  const carte = useCarteBinder(binder, slot, faiSpazio)

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

  // --- dettaglio carta: le frecce sfogliano le carte nell'ordine delle tasche, saltando le vuote ---
  const ordinate = useMemo(() => [...slot].sort((a, b) => a.pagina - b.pagina || a.posizione - b.posizione), [slot])
  const guardata = carte.guardata
  const indiceGuardata = guardata ? ordinate.findIndex((s) => stessaPosizione(s, guardata)) : -1
  const sfoglioDettaglio = guardata ? sfoglioCarte(ordinate, indiceGuardata, indiceGuardata, carte.contesto.guarda) : undefined
  // chiudendo il dettaglio l'album gira fino alla pagina dell'ultima carta vista
  // (a doppia pagina la vista v mostra le pagine 2v-1 e 2v)
  const chiudiCarta = () => {
    if (guardata) vaiA(doppia ? Math.ceil(guardata.pagina / 2) : guardata.pagina)
    carte.chiudiCarta()
  }

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
            <BarraBinder
              binder={binder}
              // dalle tasche, non da binder.carteInserite: inserire o togliere una carta aggiorna
              // subito le tasche, mentre il conteggio del dettaglio resterebbe quello di apertura
              carteInserite={slot.length}
              fase={fase}
              doppia={doppia}
              cassettoLaterale={cassettoLaterale}
              espanso={schermo.espanso}
              faiSpazio={faiSpazio}
              statistiche={statistiche}
              onFaiSpazio={setFaiSpazio}
              onOrdina={() => setOrdinaAperto(true)}
              onApri={apri}
              onChiudi={chiudi}
              onCarte={() => (doppia ? setCassettoLaterale((visibile) => !visibile) : setCassettoAperto(true))}
              onAlternaEspanso={schermo.alternaEspanso}
              onImpostazioni={onImpostazioni}
            />

            <div className="flex min-h-0 flex-1 gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {/* il binder occupa tutto lo spazio libero, alle sue proporzioni */}
                <div ref={misuraSpazio} className="grid min-h-0 flex-1 place-items-center">
                  <Album
                    binder={binder}
                    slot={slot}
                    statistiche={statistiche}
                    doppia={doppia}
                    proporzione={proporzione}
                    rapporto={rapporto}
                    larghezzaLibro={larghezzaLibro}
                    apertura={apertura}
                    sfoglio={sfoglio}
                    puntatore={puntatore}
                  />
                </div>

                <NavigazionePagine
                  pagine={binder.pagine}
                  doppia={doppia}
                  vista={vista}
                  numeroViste={numeroViste}
                  aperto={fase === 'aperto'}
                  vaiA={vaiA}
                />
              </div>

              <CassettoLaterale visibile={doppia && cassettoLaterale} />
            </div>
          </div>

          <CassettoDalBasso aperto={cassettoAperto} onChiudi={() => setCassettoAperto(false)} />

          <AnimatePresence>
            {carte.inMano && <AvvisoInMano sorgente={carte.inMano} onAnnulla={carte.posa} />}
            {carte.trascinata?.tipo === 'tasca' && <Cestino />}
          </AnimatePresence>

          <ModaleCarta
            oggetto={guardata?.oggetto ?? null}
            preferito={guardata ? preferiti.isPreferito(guardata.oggetto.id) : false}
            onTogglePreferito={preferiti.toggle}
            onChiudi={chiudiCarta}
            sfoglio={sfoglioDettaglio}
            variante={guardata ? varianteMostrata(guardata.variante ?? null, possiede(mappa, guardata.oggetto.id, 'REVERSE_HOLO')) : undefined}
          />
          <ModaleOrdina aperto={ordinaAperto} dettaglio={dettaglio} onChiudi={() => setOrdinaAperto(false)} />
        </>,
      )}
    </Contesto.Provider>
  )
}
