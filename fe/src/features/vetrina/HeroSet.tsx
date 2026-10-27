import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, PencilLine, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useAppSelector } from '../../app/hooks'
import { Button, LinkBottone } from '../../components/Button'
import { CarteSfondo } from '../../components/CarteSfondo'
import { SimboloSet } from '../../components/SimboloSet'
import { DALL_ELENCO } from '../../hooks/useRitornoElenco'
import { molla } from '../../theme/motion'
import type { AnteprimaSet } from '../../types/api'
import { cn } from '../../utils/cn'
import { formattaData } from '../../utils/formato'
import { selectIsAdmin } from '../auth/authSlice'
import { useGetAnteprimeQuery } from '../espansioni/espansioniApi'
import { LogoSet } from '../espansioni/LogoSet'
import { RaritaSet } from './BallRarita'
import { ModaleDescrizioneSet } from './ModaleDescrizioneSet'
import { carteSegrete } from './raritaVetrina'
import { TAVOLO, TavoloCarte } from './TavoloCarte'
import { useCarteCaricateDiPiuSet } from './useCarteCaricate'

// i set più nuovi che girano nella hero (il backend manda a loro le carte di sfondo); gli altri set recenti partono da qui
export const SET_IN_HERO = 3

const CLASSI_HERO = 'sfondo-hero relative animate-gradiente overflow-hidden text-white'
// minmax(0,1fr) anche da telefono: la fila di carte da scorrere allargherebbe la colonna oltre lo schermo
const CLASSI_GRIGLIA =
  'relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_23rem] xl:gap-16'

// il testo del set uscente sfuma mentre le sue carte vengono raccolte, quello nuovo arriva con le carte nuove
const entrata = (ritardo: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { delay: ritardo } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25, delay: 0.15 } },
})

// la hero della home: i set più nuovi già scaricati, uno alla volta, con le carte di punta sul tavolo e altre carte
// del set sparse sullo sfondo. Senza nessun set scaricato (database appena creato) resta solo l'invito all'elenco
export function HeroSet() {
  const { data, isLoading } = useGetAnteprimeQuery()
  const giro = useMemo(() => data?.slice(0, SET_IN_HERO) ?? [], [data])

  if (giro.length > 0) return <CaroselloHero giro={giro} />
  return (
    <section aria-labelledby="hero-set" className={CLASSI_HERO}>
      <div className={CLASSI_GRIGLIA}>
        <HeroSenzaSet inAttesa={isLoading} />
      </div>
    </section>
  )
}

// ogni quanto la hero passa al set dopo
const DURATA_SET = 8000

// gira da sola, con le frecce per passare al set prima o dopo; si ferma col mouse sopra, col focus da tastiera dentro,
// con la modifica aperta e quando la hero non si vede. Da telefono si ferma al primo tocco (niente mouse sopra per fermarla).
// Con il movimento ridotto non gira. Gli altri comandi (un bottone per set e ferma/riprendi) compaiono solo col focus da tastiera
function CaroselloHero({ giro }: { giro: AnteprimaSet[] }) {
  const sezione = useRef<HTMLElement>(null)
  const [scelto, setScelto] = useState(0)
  const [fermato, setFermato] = useState(false)
  const [mouseSopra, setMouseSopra] = useState(false)
  const [fuocoDaTastiera, setFuocoDaTastiera] = useState(false)
  const [modificaAperta, setModificaAperta] = useState(false)
  const inVista = useInVista(sezione)
  const automatico = !useReducedMotion() && giro.length > 1
  const inPausa = fermato || mouseSopra || fuocoDaTastiera || modificaAperta || !inVista

  const indice = scelto < giro.length ? scelto : 0
  const hero = giro[indice]
  const sposta = (passo: number) => setScelto((indice + passo + giro.length) % giro.length)
  useContoAllaRovescia(!automatico || inPausa, indice, () => sposta(1))
  const isAdmin = useAppSelector(selectIsAdmin)

  const candidate = useMemo(() => giro.map((a) => a.carteDiPunta), [giro])
  const carte = useCarteCaricateDiPiuSet(candidate, TAVOLO.length)[indice]
  usePrecaricaSfondi(giro)

  return (
    <section
      ref={sezione}
      aria-labelledby="hero-set"
      aria-roledescription="carosello"
      className={CLASSI_HERO}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setMouseSopra(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setMouseSopra(false)}
      onPointerDown={(e) => e.pointerType === 'touch' && setFermato(true)}
      onFocus={(e) => setFuocoDaTastiera(e.target.matches(':focus-visible'))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFuocoDaTastiera(false)
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={hero.espansione.id}
          // un po' più chiare che nel login: sul blu della hero si spegnevano troppo
          className="pointer-events-none absolute inset-0 brightness-115"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.9, delay: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          <CarteSfondo carte={hero.carteSfondo} />
        </motion.div>
      </AnimatePresence>

      {giro.length > 1 && (
        // da desktop le frecce stanno ai bordi della hero, a metà altezza
        <>
          <FrecciaSet lato="sinistra" onClick={() => sposta(-1)} className="absolute top-1/2 left-6 hidden -translate-y-1/2 lg:grid" />
          <FrecciaSet lato="destra" onClick={() => sposta(1)} className="absolute top-1/2 right-6 hidden -translate-y-1/2 lg:grid" />
        </>
      )}

      {/* il contenuto lascia spazio alle frecce finché i margini dello schermo non bastano */}
      <div className={cn(CLASSI_GRIGLIA, giro.length > 1 && 'lg:px-24 2xl:px-6')}>
        <AnimatePresence mode="wait">
          <TavoloCarte key={hero.espansione.id} espansione={hero.espansione} carte={carte} className="order-2 lg:order-1" />
        </AnimatePresence>

        <div className="order-1 lg:order-2">
          {/* tutti i testi nella stessa cella: la colonna è alta quanto il set più lungo e la pagina sotto non salta */}
          <div className="grid *:[grid-area:1/1]">
            {giro.map((a, i) =>
              i === indice ? null : <TestoSet key={a.espansione.id} anteprima={a} isAdmin={isAdmin} fantasma />,
            )}
            <AnimatePresence mode="wait">
              <TestoSet key={hero.espansione.id} anteprima={hero} isAdmin={isAdmin} onModifica={() => setModificaAperta(true)} />
            </AnimatePresence>
          </div>

          {giro.length > 1 && (
            <div role="group" aria-label="I set più nuovi" className="sr-only flex flex-wrap gap-2 focus-within:not-sr-only focus-within:mt-6">
              {giro.map((a, i) => (
                <Button
                  key={a.espansione.id}
                  variante="suScuro"
                  dimensione="sm"
                  aria-current={i === indice || undefined}
                  onClick={() => setScelto(i)}
                  className={cn(i === indice && 'bg-white/15')}
                >
                  {a.espansione.nome}
                </Button>
              ))}
              {automatico && (
                <Button variante="suScuro" dimensione="sm" onClick={() => setFermato((f) => !f)}>
                  {fermato ? <Play aria-hidden className="size-3.5 fill-current" /> : <Pause aria-hidden className="size-3.5 fill-current" />}
                  {fermato ? 'Fai girare i set' : 'Ferma i set'}
                </Button>
              )}
            </div>
          )}
        </div>

        {giro.length > 1 && (
          // da telefono una fila sotto le carte
          <div className="order-3 -mt-4 flex justify-center gap-4 lg:hidden">
            <FrecciaSet lato="sinistra" onClick={() => sposta(-1)} />
            <FrecciaSet lato="destra" onClick={() => sposta(1)} />
          </div>
        )}
      </div>

      {isAdmin && (
        <ModaleDescrizioneSet aperto={modificaAperta} espansione={hero.espansione} onChiudi={() => setModificaAperta(false)} />
      )}
    </section>
  )
}

interface PropsFreccia {
  lato: 'sinistra' | 'destra'
  onClick: () => void
  className?: string
}

// freccia tonda di vetro senza contorno: solo un velo bianco semitrasparente e la sfocatura di ciò che c'è sotto,
// così sul blu e sulle carte si vede senza coprirle
function FrecciaSet({ lato, onClick, className }: PropsFreccia) {
  const Icona = lato === 'sinistra' ? ChevronLeft : ChevronRight
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={lato === 'sinistra' ? 'Set precedente' : 'Set successivo'}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      transition={molla}
      className={cn(
        'z-10 grid size-12 place-items-center rounded-full bg-white/5 text-white/85 backdrop-blur-xl lg:size-14',
        'shadow-[0_12px_28px_-12px_rgb(0_0_0/0.45)] transition-colors hover:bg-white/14 hover:text-white',
        className,
      )}
    >
      <Icona aria-hidden strokeWidth={2} className={cn('size-6 lg:size-7', lato === 'sinistra' ? '-ml-0.5' : 'ml-0.5')} />
    </motion.button>
  )
}

interface PropsTesto {
  anteprima: AnteprimaSet
  isAdmin: boolean
  onModifica?: () => void
  // copia invisibile di un set che non si vede: tiene solo l'altezza della colonna
  fantasma?: boolean
}

function TestoSet({ anteprima, isAdmin, onModifica, fantasma = false }: PropsTesto) {
  const { espansione } = anteprima
  const segrete = carteSegrete(espansione.totaleCarte, espansione.carteUfficiali)
  const percorso = `/espansioni/${encodeURIComponent(espansione.id)}`
  // le copie invisibili non hanno h1 né id: la pagina ha un solo titolo
  const Titolo = fantasma ? motion.p : motion.h1

  return (
    <div aria-hidden={fantasma || undefined} className={cn(fantasma && 'invisible')}>
      <motion.div {...entrata(0.05)} className="relative h-28 w-full max-w-80 drop-shadow-lg">
        <LogoSet src={espansione.logoUrl} className="object-left" />
      </motion.div>
      <Titolo {...entrata(0.1)} id={fantasma ? undefined : 'hero-set'} className="mt-5 text-balance text-5xl font-bold leading-[1.05] sm:text-6xl">
        {espansione.nome}
      </Titolo>
      <motion.div {...entrata(0.15)} className="mt-4 text-base font-medium text-blu-50">
        {espansione.serie && (
          <p className="flex items-center gap-2">
            <SimboloSet src={espansione.simboloUrl} className="size-5" />
            {espansione.serie}
          </p>
        )}
        <p className="mt-0.5">
          {[
            espansione.dataUscita && formattaData(espansione.dataUscita),
            espansione.totaleCarte != null && `${espansione.totaleCarte} carte`,
            segrete ? `${segrete} segrete` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </motion.div>
      <motion.div {...entrata(0.2)}>
        {espansione.descrizione && <p className="mt-6 text-lg text-white">{espansione.descrizione}</p>}
        <RaritaSet rarita={anteprima.raritaAmbite} className="mt-6" />
      </motion.div>
      <motion.div {...entrata(0.3)} className="mt-8 flex flex-wrap gap-3">
        <LinkBottone to={percorso} state={DALL_ELENCO} variante="secondario" dimensione="lg">
          Apri il set
        </LinkBottone>
        <LinkBottone to="/espansioni" variante="suScuro" dimensione="lg">
          Tutti i set
        </LinkBottone>
      </motion.div>
      {isAdmin && (
        <Button variante="suScuro" dimensione="sm" onClick={onModifica} className="mt-4">
          <PencilLine aria-hidden className="size-4" />
          {espansione.descrizione ? 'Modifica la descrizione' : 'Scrivi una descrizione'}
        </Button>
      )}
    </div>
  )
}

// chiama `onFine` dopo DURATA_SET, contando solo il tempo fuori pausa; a ogni cambio di `chiave` (il set) riparte da capo
function useContoAllaRovescia(inPausa: boolean, chiave: unknown, onFine: () => void) {
  const fine = useRef(onFine)
  const restante = useRef(DURATA_SET)

  useEffect(() => {
    fine.current = onFine
  })

  useEffect(() => {
    restante.current = DURATA_SET
  }, [chiave])

  useEffect(() => {
    if (inPausa) return
    const inizio = performance.now()
    const timer = setTimeout(() => fine.current(), restante.current)
    return () => {
      clearTimeout(timer)
      restante.current -= performance.now() - inizio
    }
  }, [inPausa, chiave])
}

// la hero si vede: è sullo schermo e la scheda del browser è aperta
function useInVista(ref: RefObject<HTMLElement | null>) {
  const [inVista, setInVista] = useState(true)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || typeof IntersectionObserver === 'undefined') return
    let sulloSchermo = true
    const aggiorna = () => setInVista(sulloSchermo && document.visibilityState === 'visible')
    const osservatore = new IntersectionObserver(([voce]) => {
      sulloSchermo = voce.isIntersecting
      aggiorna()
    })
    osservatore.observe(elemento)
    document.addEventListener('visibilitychange', aggiorna)
    return () => {
      osservatore.disconnect()
      document.removeEventListener('visibilitychange', aggiorna)
    }
  }, [ref])

  return inVista
}

// le carte di sfondo dei set dopo il primo si scaricano subito, così al cambio arrivano già pronte
function usePrecaricaSfondi(giro: AnteprimaSet[]) {
  useEffect(() => {
    for (const anteprima of giro.slice(1)) {
      for (const carta of anteprima.carteSfondo) {
        const src = carta.immagineUrlPiccola ?? carta.immagineUrl
        if (src) new Image().src = src
      }
    }
  }, [giro])
}

// nessun set ancora scaricato (o vetrina non raggiungibile): niente carte da mostrare, solo la strada per l'elenco
function HeroSenzaSet({ inAttesa }: { inAttesa: boolean }) {
  return (
    <div className="max-w-xl lg:col-span-2">
      <h1 id="hero-set" className="text-balance text-5xl font-bold leading-[1.05] sm:text-6xl">
        {inAttesa ? 'Il set più nuovo sta arrivando…' : 'Tutte le espansioni, da Base Set a oggi'}
      </h1>
      {!inAttesa && (
        <>
          <p className="mt-5 text-lg text-white">Apri un set e guarda quante carte ti mancano: le altre aspettano in grigio al loro posto.</p>
          <LinkBottone to="/espansioni" variante="secondario" dimensione="lg" className="mt-8">
            Tutti i set
          </LinkBottone>
        </>
      )}
    </div>
  )
}
