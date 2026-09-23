import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, type MotionStyle } from 'framer-motion'
import { useRef, type PointerEvent, type ReactNode } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { cn } from '../utils/cn'

interface Props {
  children: ReactNode
  className?: string
  // elementi sopra il riflesso (es. il cuore), così restano nitidi e cliccabili
  sopra?: ReactNode
}

const INCLINAZIONE_MASSIMA = 16

// effetto "carta olografica": inclinazione 3D che segue il cursore e riflesso arcobaleno.
// Solo con puntatore fine (mouse) e senza "riduci movimento"
export function HoloCard({ children, className, sopra }: Props) {
  const puntatoreFine = useMediaQuery('(hover: hover) and (pointer: fine)')
  const movimentoRidotto = useReducedMotion()
  const attivo = puntatoreFine && !movimentoRidotto

  const ref = useRef<HTMLDivElement>(null)
  const molla = { stiffness: 220, damping: 18, mass: 0.6 }
  const rotazioneX = useSpring(0, molla)
  const rotazioneY = useSpring(0, molla)
  const opacita = useSpring(0, { stiffness: 180, damping: 24 })
  const posizioneX = useMotionValue(50)
  const posizioneY = useMotionValue(50)
  const mx = useMotionTemplate`${posizioneX}%`
  const my = useMotionTemplate`${posizioneY}%`

  if (!attivo) {
    return (
      <div className={cn('relative', className)}>
        {children}
        {sopra}
      </div>
    )
  }

  function muovi(evento: PointerEvent<HTMLDivElement>) {
    if (!ref.current) return
    const area = ref.current.getBoundingClientRect()
    const x = (evento.clientX - area.left) / area.width
    const y = (evento.clientY - area.top) / area.height
    rotazioneY.set((x - 0.5) * 2 * INCLINAZIONE_MASSIMA)
    rotazioneX.set((0.5 - y) * 2 * INCLINAZIONE_MASSIMA)
    posizioneX.set(x * 100)
    posizioneY.set(y * 100)
    opacita.set(1)
  }

  function esci() {
    rotazioneX.set(0)
    rotazioneY.set(0)
    opacita.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={muovi}
      onPointerLeave={esci}
      whileHover={{ scale: 1.03 }}
      style={{ rotateX: rotazioneX, rotateY: rotazioneY, transformPerspective: 900 }}
      className={cn('relative will-change-transform', className)}
    >
      {children}
      <motion.div
        aria-hidden
        className="holo-riflesso pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ opacity: opacita, '--mx': mx, '--my': my } as MotionStyle}
      />
      {sopra}
    </motion.div>
  )
}
