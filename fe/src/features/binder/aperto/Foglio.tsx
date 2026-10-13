import { motion, useTransform, type MotionValue } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'
import { angoliFoglio, MARGINE_COPERTINA, type Lato } from './costanti'

interface PropsFoglio {
  angolo: MotionValue<number>
  doppia: boolean
  avanti: boolean
  fronte: ReactNode
  retro: ReactNode
}

// Foglio che gira sulla rilegatura: fronte e retro sono le due facce della stessa pagina.
// La rotazione arriva da fuori (animazione o puntatore). A pagina singola il foglio esce
// (o rientra) da sinistra dissolvendosi nell'ultimo tratto
export function Foglio({ angolo, doppia, avanti, fronte, retro }: PropsFoglio) {
  const origine = doppia ? (avanti ? 'origin-left left-1/2' : 'origin-right left-0') : 'origin-left left-0'
  const opacita = useTransform(angolo, [-180, -120, 0], doppia ? [1, 1, 1] : [0, 1, 1])
  // il foglio si scurisce a metà giro, quando è di taglio rispetto alla luce
  const ombra = useTransform(angolo, (gradi) => 0.35 * Math.sin((Math.abs(gradi) * Math.PI) / 180))
  // l'ombra copre solo il foglio (margine e angoli come in SoloFoglio), non lo spazio intorno
  const latoFronte: Lato = doppia && !avanti ? 'sinistra' : 'destra'
  const latoRetro: Lato = doppia && avanti ? 'sinistra' : 'destra'

  return (
    <motion.div
      className={cn('absolute inset-y-0 z-20 [transform-style:preserve-3d]', doppia ? 'w-1/2' : 'w-full', origine)}
      style={{ rotateY: angolo, opacity: opacita }}
    >
      <div className="@container absolute inset-0 [backface-visibility:hidden]">
        {fronte}
        <motion.div
          aria-hidden
          className={cn('pointer-events-none absolute bg-black', angoliFoglio(latoFronte))}
          style={{ opacity: ombra, inset: `${MARGINE_COPERTINA}cqw` }}
        />
      </div>
      <div className="@container absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
        {retro}
        <motion.div
          aria-hidden
          className={cn('pointer-events-none absolute bg-black', angoliFoglio(latoRetro))}
          style={{ opacity: ombra, inset: `${MARGINE_COPERTINA}cqw` }}
        />
      </div>
    </motion.div>
  )
}
