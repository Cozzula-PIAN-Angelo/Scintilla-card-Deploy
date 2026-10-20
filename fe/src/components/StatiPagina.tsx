import { motion } from 'framer-motion'
import { RotateCw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

interface PropsVuoto {
  icona: ReactNode
  titolo: string
  testo: string
  azione?: ReactNode
}

// stato vuoto illustrato: una tasca vuota del binder, con l'icona al posto della carta che manca
export function StatoVuoto({ icona, titolo, testo, azione }: PropsVuoto) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-md flex-col items-center py-16 text-center"
    >
      <div className="mb-8 grid aspect-[63/88] w-32 -rotate-3 place-items-center rounded-[6%/4.3%] border-2 border-dashed border-linea/25 bg-superficie/40 text-testo-2 [&_svg]:size-12">
        {icona}
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
