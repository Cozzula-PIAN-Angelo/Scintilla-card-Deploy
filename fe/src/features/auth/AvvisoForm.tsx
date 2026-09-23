import { AnimatePresence, motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'

// errore generale del form (es. credenziali errate), non legato a un campo
export function AvvisoForm({ messaggio }: { messaggio: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {messaggio && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <p className="flex items-start gap-2 rounded-xl bg-rosso-700 px-4 py-3 text-sm font-medium text-white">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {messaggio}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
