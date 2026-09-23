import type { Transition, Variants } from 'framer-motion'

// Varianti condivise. Con prefers-reduced-motion attivo, MotionConfig reducedMotion="user"
// (in main.tsx) salta trasformazioni e layout: di queste animazioni resta solo l'opacità.

export const molla: Transition = { type: 'spring', stiffness: 420, damping: 24 }

export const transizionePagina: Variants = {
  iniziale: { opacity: 0, y: 18 },
  entrata: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  uscita: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
}

export const griglia: Variants = {
  nascosto: {},
  visibile: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

export const elementoGriglia: Variants = {
  nascosto: { opacity: 0, y: 28, scale: 0.94 },
  visibile: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 24 } },
  uscita: { opacity: 0, scale: 0.85, transition: { duration: 0.25 } },
}
