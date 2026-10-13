import { motion } from 'framer-motion'
import { useMemo, type ReactNode } from 'react'
import type { Binder, BinderDettaglio, Oggetto } from '../../../types/api'
import { cn } from '../../../utils/cn'
import { useContestoBinder } from '../contesto'
import { CopertinaBinder, FoderaBinder } from '../CopertinaBinder'
import { useImmagineBinder } from '../immagine'
import { PaginaBinder } from '../PaginaBinder'
import { BordoSfoglio } from './BordoSfoglio'
import { CURVA, DURATA_COPERTINA, type Lato } from './costanti'
import { Foglio } from './Foglio'
import { ManigliaPagina } from './ManigliaPagina'
import { Anelli, CopertinaAperta, Dorso, InternoCopertina } from './Rilegatura'
import { SoloFoglio, Tavola } from './Tavola'
import type { Apertura } from './useAperturaBinder'
import type { Sfoglio } from './useSfoglio'
import type { SfoglioPuntatore } from './useSfoglioPuntatore'

interface Props {
  binder: Binder
  slot: BinderDettaglio['slot']
  doppia: boolean
  proporzione: number
  rapporto: number
  larghezzaLibro: number
  apertura: Apertura
  sfoglio: Sfoglio
  puntatore: SfoglioPuntatore
}

// Il libro: copertina che ruota, facciate con la pila dei fogli, foglio che gira, maniglie e
// bordi di sfoglio. Il puntatore si afferra sul contenitore
export function Album({ binder, slot, doppia, proporzione, rapporto, larghezzaLibro, apertura, sfoglio, puntatore }: Props) {
  const { fase, apri } = apertura
  const { vista, numeroViste, giro, avanti, angolo, vaiA } = sfoglio
  const { trascinata } = useContestoBinder()
  const immagine = useImmagineBinder(binder)

  // carte per pagina e posizione
  const cartePerPagina = useMemo(() => {
    const mappa = new Map<number, Map<number, Oggetto>>()
    for (const s of slot) {
      if (!mappa.has(s.pagina)) mappa.set(s.pagina, new Map())
      mappa.get(s.pagina)!.set(s.posizione, s.oggetto)
    }
    return mappa
  }, [slot])

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
      contenuto = <PaginaBinder numero={v} tasche={binder.tasche} carte={cartePerPagina.get(v) ?? new Map()} lato="destra" inerte={inerte} />
    } else if (lato === 'sinistra') {
      contenuto =
        v === 0 ? (
          <InternoCopertina binder={binder} />
        ) : (
          <PaginaBinder numero={2 * v - 1} tasche={binder.tasche} carte={cartePerPagina.get(2 * v - 1) ?? new Map()} lato="sinistra" inerte={inerte} />
        )
    } else {
      contenuto =
        2 * v < binder.pagine ? (
          <PaginaBinder numero={2 * v} tasche={binder.tasche} carte={cartePerPagina.get(2 * v) ?? new Map()} lato="destra" inerte={inerte} />
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

  const larghezzaFacciata = doppia ? larghezzaLibro / 2 : larghezzaLibro
  const aperto = fase === 'aperto'
  // chiuso, il binder a doppia pagina si sposta a sinistra di mezza facciata: la copertina resta al centro
  const spostamento = doppia && !aperto && fase !== 'apertura' ? '-25%' : '0%'
  // durante lo sfoglio sotto il foglio che gira si vedono già le facciate di arrivo
  const baseSinistra = giro ? (avanti ? giro.da : giro.a) : vista
  const baseDestra = giro ? (avanti ? giro.a : giro.da) : vista

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      className={cn('relative touch-pan-y select-none', aperto && (puntatore.pagineInMano ? 'cursor-grabbing' : 'cursor-grab'))}
      style={{ width: larghezzaLibro, height: larghezzaLibro / rapporto, perspective: '2600px' }}
      {...puntatore.gestori}
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
            style={{ rotateY: apertura.angoloCopertina, opacity: doppia ? 1 : apertura.opacitaCopertina }}
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
  )
}
