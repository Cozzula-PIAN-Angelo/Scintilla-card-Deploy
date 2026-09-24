import { motion } from 'framer-motion'
import { RotateCw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Scintilla, Stella } from './Forme'

interface PropsVuoto {
  icona: ReactNode
  titolo: string
  testo: string
  azione?: ReactNode
}

// stato vuoto illustrato: icona grande in un cerchio con stelline che fluttuano
export function StatoVuoto({ icona, titolo, testo, azione }: PropsVuoto) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-md flex-col items-center py-16 text-center"
    >
      <div className="relative mb-8">
        <div className="grid size-36 place-items-center rounded-full bg-superficie text-accento shadow-xl shadow-blu-500/20 ring-8 ring-superficie/60">
          {icona}
        </div>
        <Stella className="absolute -left-6 top-2 w-9 animate-fluttua fill-giallo-400" />
        <Scintilla className="absolute -right-4 top-10 w-7 animate-fluttua fill-rosso-500 [animation-delay:1s]" />
        <Stella className="absolute -bottom-2 right-2 w-6 animate-fluttua fill-blu-500 [animation-delay:2s]" />
      </div>
      <h2 className="text-2xl font-semibold text-testo">{titolo}</h2>
      <p className="mt-2 text-testo/70">{testo}</p>
      {azione && <div className="mt-6">{azione}</div>}
    </motion.div>
  )
}

interface PropsErrore {
  messaggio: string
  onRiprova?: () => void
}

export function StatoErrore({ messaggio, onRiprova }: PropsErrore) {
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl bg-superficie p-8 text-center shadow-lg">
      <div className="grid size-14 place-items-center rounded-full bg-rosso-700 text-white">
        <TriangleAlert aria-hidden className="size-7" />
      </div>
      <p className="font-medium text-testo">{messaggio}</p>
      {onRiprova && (
        <Button variante="primario" onClick={onRiprova}>
          <RotateCw aria-hidden className="size-4" />
          Riprova
        </Button>
      )}
    </div>
  )
}
