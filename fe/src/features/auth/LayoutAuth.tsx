import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { FormeFluttuanti, Scintilla } from '../../components/Forme'
import { PaginaAnimata } from '../../components/PaginaAnimata'

interface Props {
  titolo: string
  sottotitolo: string
  children: ReactNode
}

export function LayoutAuth({ titolo, sottotitolo, children }: Props) {
  return (
    <PaginaAnimata className="sfondo-hero relative flex min-h-[calc(100vh-5rem)] animate-gradiente items-center justify-center overflow-hidden px-4 py-16">
      <FormeFluttuanti />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 22, delay: 0.1 } }}
        className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-blu-900/50 sm:p-10"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ rotate: -30, scale: 0 }}
            animate={{ rotate: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 14, delay: 0.25 } }}
            className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-blu-500 shadow-lg shadow-blu-500/40"
          >
            <Scintilla className="w-8 fill-giallo-400" />
          </motion.div>
          <h1 className="text-3xl font-bold text-blu-900">{titolo}</h1>
          <p className="mt-2 text-blu-900/70">{sottotitolo}</p>
        </div>
        {children}
      </motion.div>
    </PaginaAnimata>
  )
}
