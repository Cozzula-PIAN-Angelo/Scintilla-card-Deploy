import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowLeft, Book, BookOpen, ChevronLeft, ChevronRight, Layers, Maximize2, Minimize2, Settings2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { messaggioErrore, statoErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Loader } from '../../components/Loader'
import { ModaleCarta } from '../../components/ModaleCarta'
import { StatoErrore } from '../../components/StatiPagina'
import { useDimensioni } from '../../hooks/useDimensioni'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { Binder, BinderDettaglio, Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { usePreferiti } from '../preferiti/usePreferiti'
import { useToast } from '../toast/useToast'
import { AvvisoInMano, Cestino } from './aperto/AvvisiBinder'
import { BordoSfoglio } from './aperto/BordoSfoglio'
import { Cassetto, IntestazioneCassetto } from './aperto/Cassetto'
import { CURVA, DURATA_COPERTINA, DURATA_PAGINA, type Fase, type Lato } from './aperto/costanti'
import { Foglio } from './aperto/Foglio'
import { ManigliaPagina } from './aperto/ManigliaPagina'
import { Anelli, CopertinaAperta, Dorso, InternoCopertina } from './aperto/Rilegatura'
import { SoloFoglio, Tavola } from './aperto/Tavola'
import { useSchermoIntero } from './aperto/useSchermoIntero'
import { proporzionePagina } from './aspetto'
import { useGetBinderDettaglioQuery, useInserisciCartaMutation, useSpostaCartaMutation, useSvuotaTascaMutation } from './binderApi'
import { Contesto, stessaPosizione, type ContestoBinder, type Posizione, type Sorgente } from './contesto'
import { CopertinaBinder, FoderaBinder } from './CopertinaBinder'
import { useImmagineBinder } from './immagine'
import { PaginaBinder } from './PaginaBinder'

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
  const toast = useToast()
  const doppia = useMediaQuery('(min-width: 1024px)')
  const immagine = useImmagineBinder(binder)
  const preferiti = usePreferiti()

  // carte per pagina e posizione
  const carte = useMemo(() => {
    const mappa = new Map<number, Map<number, Oggetto>>()
    for (const s of slot) {
      if (!mappa.has(s.pagina)) mappa.set(s.pagina, new Map())
      mappa.get(s.pagina)!.set(s.posizione, s.oggetto)
    }
    return mappa
  }, [slot])

  // carta in mano (scelta con un tocco), carta trascinata, tasca col menu aperto, carta ingrandita
  const [inMano, setInMano] = useState<Sorgente | null>(null)
  const [trascinata, setTrascinata] = useState<Sorgente | null>(null)
  const [tascaAttiva, setTascaAttiva] = useState<Posizione | null>(null)
  const [guardata, setGuardata] = useState<Oggetto | null>(null)
  const [cassettoAperto, setCassettoAperto] = useState(false)
  const [cassettoLaterale, setCassettoLaterale] = useState(true)

  // --- apertura e sfoglio ---------------------------------------------------------------
  const [fase, setFase] = useState<Fase>('chiuso')
  // fase aggiornata per i callback (timer, fine animazione) creati in render precedenti
  const faseCorrente = useRef<Fase>('chiuso')
  faseCorrente.current = fase
  // Rotazione della copertina in gradi: 0 chiusa, -180 aperta e ribaltata a sinistra. Animata con
  // animate() come i fogli: alla fine dell'animazione si passa alla fase successiva
  const angoloCopertina = useMotionValue(0)
  // "vista": a doppia pagina è il numero della coppia di facciate, a pagina singola la pagina.
  // Cambiando modalità (finestra ridimensionata) si converte restando sulla stessa pagina
  const [vistaSalvata, setVistaSalvata] = useState({ doppia, vista: 0 })
  if (vistaSalvata.doppia !== doppia) {
    const { vista } = vistaSalvata
    setVistaSalvata({ doppia, vista: doppia ? Math.floor((vista + 1) / 2) : Math.max(0, 2 * vista - 1) })
  }
  const numeroViste = doppia ? Math.floor(binder.pagine / 2) + 1 : binder.pagine
  // pagine ridotte dalle impostazioni mentre il binder è aperto
  const vista = Math.min(vistaSalvata.vista, numeroViste - 1)
  const [giro, setGiro] = useState<{ da: number; a: number } | null>(null)

  useEffect(() => {
    // solo all'arrivo; apri() legge la fase dal ref, quindi va bene anche dal primo render
    const timer = window.setTimeout(() => apri(), 450)
    return () => window.clearTimeout(timer)
  }, [])

  // Rotazione del foglio che gira, in gradi. Lo stesso valore lo muove l'animazione (frecce,
  // tastiera) oppure il puntatore quando si trascina la pagina
  const angolo = useMotionValue(0)

  // angolo di partenza e di arrivo: a doppia pagina il foglio va da una metà all'altra,
  // a pagina singola esce (o rientra) da sinistra
  const estremi = useCallback(
    (avanti: boolean): [number, number] => (doppia ? [0, avanti ? -180 : 180] : avanti ? [0, -180] : [-180, 0]),
    [doppia],
  )

  const completaGiro = useCallback(
    (destinazione: number) => {
      setVistaSalvata({ doppia, vista: destinazione })
      setGiro(null)
    },
    [doppia],
  )

  const vaiA = useCallback(
    (destinazione: number) => {
      if (fase !== 'aperto' || giro || destinazione === vista || destinazione < 0 || destinazione >= numeroViste) return
      setTascaAttiva(null)
      const [inizio, fine] = estremi(destinazione > vista)
      angolo.set(inizio)
      setGiro({ da: vista, a: destinazione })
      void animate(angolo, fine, { duration: DURATA_PAGINA, ease: CURVA }).then(() => completaGiro(destinazione))
    },
    [fase, giro, vista, numeroViste, estremi, angolo, completaGiro],
  )

  // a copertina richiusa si torna alla mensola, oppure si resta col binder chiuso davanti
  function chiudi(destinazione: 'mensola' | 'resta' = 'mensola') {
    // già chiuso: si torna direttamente alla mensola
    if (fase === 'chiuso' && destinazione === 'mensola') {
      onChiuso()
      return
    }
    if (fase !== 'aperto') return
    setGiro(null)
    setVistaSalvata({ doppia, vista: 0 })
    setTascaAttiva(null)
    setInMano(null)
    setFase('chiusura')
    angoloCopertina.set(-180)
    void animate(angoloCopertina, 0, { duration: DURATA_COPERTINA, ease: CURVA }).then(() =>
      destinazione === 'mensola' ? onChiuso() : setFase('chiuso'),
    )
  }

  function apri() {
    if (faseCorrente.current !== 'chiuso') return
    faseCorrente.current = 'apertura'
    setFase('apertura')
    void animate(angoloCopertina, -180, { duration: DURATA_COPERTINA, ease: CURVA }).then(() => setFase('aperto'))
  }

  // --- carte: tocco, trascinamento, menu delle tasche --------------------------------------
  const [inserisci] = useInserisciCartaMutation()
  const [sposta] = useSpostaCartaMutation()
  const [svuota] = useSvuotaTascaMutation()

  const contesto = useMemo<ContestoBinder>(() => {
    const errore = (e: unknown) => toast.errore(messaggioErrore(e, 'Operazione non riuscita, riprova'))
    return {
      inMano,
      prendi: (sorgente) => {
        setTascaAttiva(null)
        setInMano(sorgente)
      },
      trascinata,
      iniziaTrascinamento: (sorgente) => {
        setTascaAttiva(null)
        setInMano(null)
        setTrascinata(sorgente)
      },
      fineTrascinamento: () => setTrascinata(null),
      tascaAttiva,
      attivaTasca: setTascaAttiva,
      rilascia: (arrivo, sorgente) => {
        setInMano(null)
        setTascaAttiva(null)
        if (sorgente.tipo === 'carta') {
          inserisci({ binderId: binder.id, ...arrivo, oggetto: sorgente.oggetto }).unwrap().catch(errore)
        } else if (!stessaPosizione(sorgente, arrivo)) {
          const da = { pagina: sorgente.pagina, posizione: sorgente.posizione }
          sposta({ binderId: binder.id, da, a: arrivo }).unwrap().catch(errore)
        }
      },
      togli: (posizione) => {
        setTascaAttiva(null)
        svuota({ binderId: binder.id, ...posizione }).unwrap().catch(errore)
      },
      guarda: (oggetto) => {
        setTascaAttiva(null)
        setGuardata(oggetto)
      },
    }
  }, [inMano, trascinata, tascaAttiva, binder.id, inserisci, sposta, svuota, toast])

  // --- spazio: il binder si adatta all'area libera; a schermo intero copre tutta la finestra ---
  const [misuraSpazio, spazioLibero] = useDimensioni<HTMLDivElement>()
  const schermo = useSchermoIntero()

  // --- sfoglio col puntatore: si afferra la pagina e il foglio segue il mouse (o il dito) ---
  // Sulle carte il gesto resta quello di spostarle (trascinamento nativo): la pagina si prende
  // dai margini, dagli spazi tra le tasche, dalle tasche vuote o dalla maniglia sul bordo esterno
  const presa = useRef<{
    id: number
    x: number
    y: number
    lato: Lato
    // attivato superata una piccola soglia: prima può ancora essere un semplice clic
    attiva: boolean
    avanti: boolean
    progresso: number
    ultimaX: number
    ultimoTempo: number
    velocita: number
  } | null>(null)
  const [pagineInMano, setPagineInMano] = useState(false)
  // dopo un trascinamento il clic finale non deve arrivare alle tasche
  const ignoraClic = useRef(false)

  function afferra(evento: PointerEvent<HTMLDivElement>) {
    if (!aperto || giro || evento.button !== 0) return
    const bersaglio = evento.target as HTMLElement
    if (!bersaglio.closest('[data-maniglia]') && bersaglio.closest('[draggable="true"], input, select')) return
    const riquadro = evento.currentTarget.getBoundingClientRect()
    presa.current = {
      id: evento.pointerId,
      x: evento.clientX,
      y: evento.clientY,
      lato: !doppia || evento.clientX > riquadro.left + riquadro.width / 2 ? 'destra' : 'sinistra',
      attiva: false,
      avanti: true,
      progresso: 0,
      ultimaX: evento.clientX,
      ultimoTempo: evento.timeStamp,
      velocita: 0,
    }
  }

  function trascinaPagina(evento: PointerEvent<HTMLDivElement>) {
    const p = presa.current
    if (!p || p.id !== evento.pointerId) return
    const dx = evento.clientX - p.x
    const dy = evento.clientY - p.y

    if (!p.attiva) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return
      const avanti = dx < 0
      // a doppia pagina si gira in avanti la pagina destra e indietro la sinistra
      const consentito = avanti
        ? vista < numeroViste - 1 && (!doppia || p.lato === 'destra')
        : vista > 0 && (!doppia || p.lato === 'sinistra')
      if (!consentito) {
        presa.current = null
        return
      }
      p.attiva = true
      p.avanti = avanti
      evento.currentTarget.setPointerCapture(evento.pointerId)
      setTascaAttiva(null)
      setPagineInMano(true)
      angolo.set(estremi(avanti)[0])
      setGiro({ da: vista, a: vista + (avanti ? 1 : -1) })
    }

    // per girare tutto il foglio si attraversa quasi tutto il binder
    const corsa = larghezzaLibro * (doppia ? 0.75 : 0.8)
    p.progresso = Math.min(1, Math.max(0, (p.avanti ? -dx : dx) / corsa))
    const [inizio, fine] = estremi(p.avanti)
    angolo.set(inizio + (fine - inizio) * p.progresso)

    const intervallo = evento.timeStamp - p.ultimoTempo
    if (intervallo > 0) p.velocita = (evento.clientX - p.ultimaX) / intervallo
    p.ultimaX = evento.clientX
    p.ultimoTempo = evento.timeStamp
  }

  function lasciaPagina(evento: PointerEvent<HTMLDivElement>) {
    const p = presa.current
    if (!p || p.id !== evento.pointerId) return
    presa.current = null
    if (!p.attiva) return
    // il clic che segue il rilascio (se arriva) si scarta; poi si torna alla normalità
    ignoraClic.current = true
    window.setTimeout(() => (ignoraClic.current = false), 0)
    setPagineInMano(false)

    // si completa oltre un terzo di giro, o con un colpo deciso nella direzione giusta
    const spinta = p.avanti ? -p.velocita : p.velocita
    const completa = evento.type !== 'pointercancel' && (p.progresso > 0.35 || spinta > 0.6)
    const [inizio, fine] = estremi(p.avanti)
    const destinazione = vista + (p.avanti ? 1 : -1)
    const resto = completa ? 1 - p.progresso : p.progresso
    void animate(angolo, completa ? fine : inizio, { duration: 0.2 + 0.4 * resto, ease: 'easeOut' }).then(() =>
      completa ? completaGiro(destinazione) : setGiro(null),
    )
  }

  // frecce per sfogliare, Esc per posare la carta in mano o chiudere il menu di una tasca
  useEffect(() => {
    function tasto(evento: KeyboardEvent) {
      const bersaglio = evento.target as HTMLElement | null
      if (bersaglio?.closest('input, textarea, select, [role="dialog"]')) return
      if (evento.key === 'ArrowRight') vaiA(vista + 1)
      else if (evento.key === 'ArrowLeft') vaiA(vista - 1)
      else if (evento.key === 'Escape') {
        setInMano(null)
        setTascaAttiva(null)
      }
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [vaiA, vista])

  // --- facciate ---------------------------------------------------------------------------
  // fogli che stanno sotto la facciata visibile: a sinistra quelli già girati, a destra quelli da
  // girare. Danno lo spessore della pila; i fogli che girano non ne hanno
  function fogliSotto(v: number, lato: Lato) {
    if (!doppia) return Math.ceil((binder.pagine - 1 - v) / 2)
    return lato === 'sinistra' ? v : numeroViste - 1 - v
  }

  // soloFoglio: senza la cornice della copertina, per il foglio che gira
  function facciata(v: number, lato: Lato, inerte = false, fogli = 0, soloFoglio = false): ReactNode {
    let contenuto: ReactNode
    if (!doppia) {
      contenuto = <PaginaBinder numero={v} tasche={binder.tasche} carte={carte.get(v) ?? new Map()} lato="destra" inerte={inerte} />
    } else if (lato === 'sinistra') {
      contenuto =
        v === 0 ? (
          <InternoCopertina binder={binder} />
        ) : (
          <PaginaBinder numero={2 * v - 1} tasche={binder.tasche} carte={carte.get(2 * v - 1) ?? new Map()} lato="sinistra" inerte={inerte} />
        )
    } else {
      contenuto =
        2 * v < binder.pagine ? (
          <PaginaBinder numero={2 * v} tasche={binder.tasche} carte={carte.get(2 * v) ?? new Map()} lato="destra" inerte={inerte} />
        ) : (
          <FoderaBinder colore={binder.colore} />
        )
    }
    if (soloFoglio) return <SoloFoglio lato={doppia ? lato : 'destra'}>{contenuto}</SoloFoglio>
    // interno della copertina (prima facciata a sinistra) e del retro (ultima a destra)
    const fodera = doppia && (lato === 'sinistra' ? v === 0 : 2 * v >= binder.pagine)
    return (
      <Tavola
        colore={binder.colore}
        lato={doppia ? lato : 'destra'}
        proporzione={proporzione}
        fogli={fogli}
        fodera={fodera}
        // aperto a doppia pagina il fondo è la copertina unica (CopertinaAperta)
        senzaFondo={doppia && fase === 'aperto'}
      >
        {contenuto}
      </Tavola>
    )
  }

  const proporzione = proporzionePagina(binder.tasche)
  const rapporto = doppia ? 2 * proporzione : proporzione
  const opacitaCopertina = useTransform(angoloCopertina, [-180, -120, 0], [0, 1, 1])
  // il più grande possibile nello spazio libero, senza deformarlo
  const larghezzaLibro = Math.max(0, Math.min(spazioLibero.larghezza, spazioLibero.altezza * rapporto))
  const larghezzaFacciata = doppia ? larghezzaLibro / 2 : larghezzaLibro
  const avanti = giro ? giro.a > giro.da : true
  const aperto = fase === 'aperto'
  // chiuso, il binder a doppia pagina si sposta a sinistra di mezza facciata: la copertina resta al centro
  const spostamento = doppia && !aperto && fase !== 'apertura' ? '-25%' : '0%'
  // durante lo sfoglio sotto il foglio che gira si vedono già le facciate di arrivo
  const baseSinistra = giro ? (avanti ? giro.da : giro.a) : vista
  const baseDestra = giro ? (avanti ? giro.a : giro.da) : vista

  const primaPagina = doppia ? Math.max(0, 2 * vista - 1) : vista
  const etichettaVista = doppia
    ? vista === 0
      ? `Copertina · pagina 1`
      : 2 * vista < binder.pagine
        ? `Pagine ${2 * vista} – ${2 * vista + 1}`
        : `Pagina ${2 * vista}`
    : `Pagina ${vista + 1}`

  return (
    <Contesto.Provider value={contesto}>
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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                    className={cn('relative touch-pan-y select-none', aperto && (pagineInMano ? 'cursor-grabbing' : 'cursor-grab'))}
                    style={{ width: larghezzaLibro, height: larghezzaLibro / rapporto, perspective: '2600px' }}
                    onPointerDown={afferra}
                    onPointerMove={trascinaPagina}
                    onPointerUp={lasciaPagina}
                    onPointerCancel={lasciaPagina}
                    onClickCapture={(evento) => {
                      if (!ignoraClic.current) return
                      ignoraClic.current = false
                      evento.stopPropagation()
                      evento.preventDefault()
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 [transform-style:preserve-3d]"
                      initial={false}
                      animate={{ x: spostamento }}
                      transition={{ duration: DURATA_COPERTINA, ease: CURVA }}
                    >
                      {/* facciata sinistra: da chiuso non c'è, la copre la copertina girata */}
                      {doppia && aperto && <CopertinaAperta colore={binder.colore} proporzione={proporzione} />}
                      {doppia && aperto && <div className="absolute inset-y-0 left-0 w-1/2">{facciata(baseSinistra, 'sinistra', false, fogliSotto(baseSinistra, 'sinistra'))}</div>}
                      <div className={cn('absolute inset-y-0 right-0', doppia ? 'w-1/2' : 'w-full')}>
                        {facciata(baseDestra, 'destra', !aperto, fogliSotto(baseDestra, 'destra'))}
                      </div>

                      {/* la fodera passa sotto la costa: sopra di lei si ridisegna la sua metà di dorso */}
                      {doppia && aperto && baseSinistra === 0 && <Dorso colore={binder.colore} sopra="sinistra" />}
                      {doppia && aperto && 2 * baseDestra >= binder.pagine && <Dorso colore={binder.colore} sopra="destra" />}
                      {doppia && aperto && <Anelli />}

                      {/* foglio che gira */}
                      {giro && (
                        <Foglio
                          key={`${giro.da}-${giro.a}`}
                          angolo={angolo}
                          doppia={doppia}
                          avanti={avanti}
                          fronte={
                            doppia
                              ? facciata(giro.da, avanti ? 'destra' : 'sinistra', true, 0, true)
                              : facciata(avanti ? giro.da : giro.a, 'destra', true, 0, true)
                          }
                          retro={
                            doppia ? (
                              facciata(giro.a, avanti ? 'sinistra' : 'destra', true, 0, true)
                            ) : (
                              <SoloFoglio lato="destra">
                                <div className="trama-telata h-full w-full" />
                              </SoloFoglio>
                            )
                          }
                        />
                      )}

                      {/* copertina: si apre ruotando sul dorso e resta ribaltata a sinistra */}
                      {!aperto && (
                        <motion.div
                          className={cn(
                            'absolute inset-y-0 right-0 origin-left [transform-style:preserve-3d]',
                            doppia ? 'w-1/2' : 'w-full',
                            fase === 'chiuso' && 'cursor-pointer',
                          )}
                          // chiuso, la copertina si apre con un clic (o Invio / spazio)
                          role={fase === 'chiuso' ? 'button' : undefined}
                          tabIndex={fase === 'chiuso' ? 0 : undefined}
                          aria-label={fase === 'chiuso' ? `Apri ${binder.nome}` : undefined}
                          onClick={apri}
                          onKeyDown={(evento) => {
                            if (evento.key === 'Enter' || evento.key === ' ') {
                              evento.preventDefault()
                              apri()
                            }
                          }}
                          // a pagina singola la copertina aperta uscirebbe a sinistra: nell'ultimo tratto sfuma
                          style={{ rotateY: angoloCopertina, opacity: doppia ? 1 : opacitaCopertina }}
                        >
                          <div className="absolute inset-0 [backface-visibility:hidden]">
                            <CopertinaBinder
                              nome={binder.nome}
                              colore={binder.colore}
                              motivo={binder.motivo}
                              tasche={binder.tasche}
                              cartaCopertina={binder.cartaCopertina}
                              immagineUrl={immagine}
                              className="shadow-2xl shadow-ombra/40"
                            />
                          </div>
                          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                            <Tavola colore={binder.colore} lato="sinistra" proporzione={proporzione} fodera>
                              <InternoCopertina binder={binder} />
                            </Tavola>
                          </div>
                        </motion.div>
                      )}

                      {aperto && !giro && !trascinata && (
                        <>
                          {vista > 0 && <ManigliaPagina lato="sinistra" larghezzaFacciata={larghezzaFacciata} />}
                          {vista < numeroViste - 1 && <ManigliaPagina lato="destra" larghezzaFacciata={larghezzaFacciata} />}
                        </>
                      )}

                      {aperto && trascinata && (
                        <>
                          <BordoSfoglio lato="sinistra" attivo={vista > 0} onSfoglia={() => vaiA(vista - 1)} />
                          <BordoSfoglio lato="destra" attivo={vista < numeroViste - 1} onSfoglia={() => vaiA(vista + 1)} />
                        </>
                      )}
                    </motion.div>
                  </motion.div>
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
            {inMano && <AvvisoInMano sorgente={inMano} onAnnulla={() => setInMano(null)} />}
            {trascinata?.tipo === 'tasca' && <Cestino />}
          </AnimatePresence>

          <ModaleCarta
            oggetto={guardata}
            preferito={guardata ? preferiti.isPreferito(guardata.id) : false}
            onTogglePreferito={preferiti.toggle}
            onChiudi={() => setGuardata(null)}
          />
        </>,
      )}
    </Contesto.Provider>
  )
}
