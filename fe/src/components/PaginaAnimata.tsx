import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { transizionePagina } from '../theme/motion'

export function PaginaAnimata({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main variants={transizionePagina} initial="iniziale" animate="entrata" exit="uscita" className={className}>
      {children}
    </motion.main>
  )
}
