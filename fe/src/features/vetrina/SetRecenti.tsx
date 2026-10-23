import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { FORMA_CARTA, ImmagineCarta } from '../../components/ImmagineCarta'
import { Skeleton } from '../../components/Skeleton'
import { DALL_ELENCO } from '../../hooks/useRitornoElenco'
import type { AnteprimaSet } from '../../types/api'
import { cn } from '../../utils/cn'
import { useGetAnteprimeQuery } from '../espansioni/espansioniApi'
import { LogoSet } from '../espansioni/LogoSet'
import { useCarteCaricate } from './useCarteCaricate'

const CLASSI_GRIGLIA = 'grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4'

// i set usciti prima di quello della hero (due righe da quattro), ognuno con le sue tre carte più cercate dietro al logo
export function SetRecenti() {
  const { data, isLoading } = useGetAnteprimeQuery()
  const altri = data?.slice(1) ?? []
  if (!isLoading && altri.length === 0) return null

  return (
    <section aria-labelledby="set-recenti">
      <h2 id="set-recenti" className="mb-2 text-3xl font-bold text-testo">
        Gli altri set appena usciti
      </h2>
      <p className="mb-6 text-testo/70">Dietro ogni logo, le tre carte più cercate.</p>
      {isLoading ? (
        <div role="status" aria-label="Caricamento dei set recenti" className={CLASSI_GRIGLIA}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="mt-28 h-40 rounded-3xl sm:mt-36" />
          ))}
        </div>
      ) : (
        <ul className={CLASSI_GRIGLIA}>
          {altri.map((anteprima) => (
            <SetConCarteDietro key={anteprima.espansione.id} anteprima={anteprima} />
          ))}
        </ul>
      )}
    </section>
  )
}

// ventaglio chiuso dietro al riquadro; al passaggio le carte salgono e si aprono
const VENTAGLIO = [
  { chiusa: { x: -34, y: 20, rotate: -10 }, aperta: { x: -60, y: -8, rotate: -16 } },
  { chiusa: { x: 34, y: 20, rotate: 10 }, aperta: { x: 60, y: -8, rotate: 16 } },
  { chiusa: { x: 0, y: 6, rotate: 0 }, aperta: { x: 0, y: -26, rotate: 0 } },
]

function SetConCarteDietro({ anteprima }: { anteprima: AnteprimaSet }) {
  const { espansione } = anteprima
  const carte = useCarteCaricate(anteprima.carteDiPunta, 3)
  // la più preziosa al centro, davanti alle altre due
  const ordine = [carte[1], carte[2], carte[0]]

  return (
    <motion.li initial="chiusa" whileHover="aperta" className="list-none">
      <Link
        to={`/espansioni/${encodeURIComponent(espansione.id)}`}
        state={DALL_ELENCO}
        aria-label={`Apri ${espansione.nome}`}
        className="relative block rounded-3xl pt-28 sm:pt-36"
      >
        <div aria-hidden className="absolute inset-x-0 top-0 flex justify-center">
          {ordine.map((carta, i) =>
            carta ? (
              <motion.div
                key={carta.id}
                variants={{ chiusa: VENTAGLIO[i].chiusa, aperta: VENTAGLIO[i].aperta }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                // da telefono più piccole: con due colonne il ventaglio uscirebbe dallo schermo
                className="absolute w-24 sm:w-32"
              >
                <ImmagineCarta src={carta.immagineUrlPiccola} alt="" className={cn('aspect-[63/88] w-full shadow-lg shadow-ombra/40', FORMA_CARTA)} />
              </motion.div>
            ) : null,
          )}
        </div>
        <div className="relative flex flex-col items-center gap-3 rounded-3xl bg-superficie p-4 text-center shadow-lg shadow-ombra/15 ring-1 ring-linea/5">
          <div className="relative grid h-24 w-full place-items-center">
            <LogoSet src={espansione.logoUrl} lazy />
          </div>
          <div>
            <p className="line-clamp-2 font-semibold leading-tight text-testo">{espansione.nome}</p>
            <p className="mt-1 text-xs font-medium text-testo/70">
              {[espansione.dataUscita?.slice(0, 4), espansione.totaleCarte != null && `${espansione.totaleCarte} carte`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </Link>
    </motion.li>
  )
}
