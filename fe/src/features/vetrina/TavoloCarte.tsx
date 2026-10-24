import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import { DALL_ELENCO } from '../../hooks/useRitornoElenco'
import type { CartaAnteprima, Espansione } from '../../types/api'
import { cn } from '../../utils/cn'
import { classiRarita } from '../carte/rarita'
import { numeroNelSet } from './raritaVetrina'

// posizione delle carte sul tavolo, in % del riquadro (largo 1,5 volte l'altezza); la prima è la più preziosa
export const TAVOLO = [
  { x: 0, y: 4, w: 32, r: -4, z: 3 },
  { x: 33, y: 0, w: 22, r: 3, z: 2 },
  { x: 57, y: 8, w: 20, r: -2, z: 2 },
  { x: 78, y: 26, w: 20, r: 3, z: 1 },
  { x: 35, y: 50, w: 19, r: -3, z: 3 },
  { x: 56, y: 55, w: 18, r: 4, z: 3 },
  { x: 18, y: 64, w: 15, r: 7, z: 4 },
]

// quando la hero passa al set dopo, le carte vengono raccolte verso sinistra (prima l'ultima servita) e quelle
// nuove servite una a una da destra
const tavolo = {
  nascosto: {},
  visibile: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
  uscita: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
}
const cartaSulTavolo = {
  nascosto: { opacity: 0, x: '45%', y: -24, rotate: 12 },
  visibile: { opacity: 1, x: '0%', y: 0, rotate: 0, transition: { type: 'spring' as const, stiffness: 140, damping: 18 } },
  uscita: { opacity: 0, x: '-70%', y: 24, rotate: -10, transition: { duration: 0.25, ease: [0.55, 0, 1, 0.45] as const } },
}
// da telefono la fila scorre via tutta insieme
const fila = {
  nascosto: { opacity: 0, x: 32 },
  visibile: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  uscita: { opacity: 0, x: -32, transition: { duration: 0.2 } },
}

interface Props {
  espansione: Espansione
  // vuota mentre arrivano: al loro posto le sagome
  carte: CartaAnteprima[]
  className?: string
}

// le carte di punta del set: sparse sul tavolo da desktop, in fila da scorrere di lato da telefono e tablet.
// Al passaggio la carta si raddrizza e viene avanti
export function TavoloCarte({ espansione, carte, className }: Props) {
  const percorso = `/espansioni/${encodeURIComponent(espansione.id)}`
  const etichetta = (carta: CartaAnteprima) => `${carta.nome}, apri ${espansione.nome}`

  return (
    <div className={className}>
      <motion.div
        variants={fila}
        initial="nascosto"
        animate="visibile"
        exit="uscita"
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-3 pb-4 sm:-mx-6 sm:px-6 lg:hidden"
      >
        {carte.length === 0
          ? Array.from({ length: 4 }, (_, i) => <SagomaCarta key={i} className="w-40 shrink-0" />)
          : carte.map((carta, i) => (
              <Link
                key={carta.id}
                to={percorso}
                state={DALL_ELENCO}
                aria-label={etichetta(carta)}
                className={cn('shrink-0 snap-start', i === 0 ? 'w-52' : 'w-36 self-end')}
              >
                <CartaConNumero carta={carta} ufficiali={espansione.carteUfficiali} grande={i === 0} />
              </Link>
            ))}
      </motion.div>

      {/* montato solo con le carte: figli arrivati dopo l'entrata resterebbero nascosti */}
      {carte.length === 0 ? (
        <div className="relative hidden aspect-[3/2] lg:block">
          {TAVOLO.map((p, i) => (
            <SagomaCarta key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, rotate: `${p.r}deg` }} />
          ))}
        </div>
      ) : (
        <motion.div variants={tavolo} initial="nascosto" animate="visibile" exit="uscita" className="relative hidden aspect-[3/2] lg:block">
          {carte.map((carta, i) => {
            const p = TAVOLO[i]
            return (
              <motion.div
                key={carta.id}
                variants={cartaSulTavolo}
                className="absolute"
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, zIndex: p.z }}
              >
                <motion.div
                  initial={{ rotate: p.r }}
                  whileHover={{ rotate: 0, scale: 1.06, zIndex: 10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Link to={percorso} state={DALL_ELENCO} aria-label={etichetta(carta)} className="block">
                    <CartaConNumero carta={carta} ufficiali={espansione.carteUfficiali} grande={i === 0} />
                  </Link>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}

// sagoma vuota di una carta, mentre arrivano le immagini
function SagomaCarta({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden style={style} className={cn('aspect-[63/88] rounded-[3%/2.1%] bg-white/10 ring-1 ring-white/15', className)} />
}

// la carta con il numero nel set in alto, colorato come la rarità
function CartaConNumero({ carta, ufficiali, grande }: { carta: CartaAnteprima; ufficiali: number | null; grande: boolean }) {
  const numero = numeroNelSet(carta.numero, ufficiali)
  return (
    <div className="relative">
      <ImmagineCarta
        src={(grande ? carta.immagineUrl : carta.immagineUrlPiccola) ?? carta.immagineUrl}
        alt=""
        priorita={grande}
        className={cn('aspect-[63/88] w-full shadow-2xl shadow-ombra/50', FORMA_CARTA)}
      />
      {numero && (
        <span
          aria-hidden
          className={cn('absolute -top-2.5 left-3 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-md shadow-ombra/30', classiRarita(carta.rarita))}
        >
          {numero}
        </span>
      )}
    </div>
  )
}
