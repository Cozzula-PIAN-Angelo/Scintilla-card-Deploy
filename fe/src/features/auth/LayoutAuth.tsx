import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { CarteSfondo } from '../../components/CarteSfondo'
import { MarchioIcona } from '../../components/Marchio'
import { PaginaAnimata } from '../../components/PaginaAnimata'
import { useUltimeCarte } from '../oggetti/useUltimeCarte'

interface Props {
  titolo: string
  sottotitolo: string
  children: ReactNode
}

export function LayoutAuth({ titolo, sottotitolo, children }: Props) {
  const carte = useUltimeCarte()
  return (
    <PaginaAnimata className="sfondo-hero relative flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden px-4 py-16">
      <CarteSfondo carte={carte} />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 22, delay: 0.1 } }}
        className="relative w-full max-w-md rounded-3xl bg-superficie p-8 shadow-2xl shadow-ombra/50 sm:p-10"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ rotate: -30, scale: 0 }}
            animate={{ rotate: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 14, delay: 0.25 } }}
            className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-blu-500 shadow-md shadow-ombra/30"
          >
            <MarchioIcona className="h-11" />
          </motion.div>
          <h1 className="text-3xl font-bold text-testo">{titolo}</h1>
          <p className="mt-2 text-testo/70">{sottotitolo}</p>
        </div>
        {children}
      </motion.div>
    </PaginaAnimata>
  )
}
