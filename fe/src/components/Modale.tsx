import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../utils/cn'

interface Props {
  aperto: boolean
  onChiudi: () => void
  titolo?: string
  children: ReactNode
  larghezza?: string
}

export function Modale({ aperto, onChiudi, titolo, children, larghezza = 'max-w-lg' }: Props) {
  const idTitolo = useId()
  const pannello = useRef<HTMLDivElement>(null)
  const chiudiRef = useRef(onChiudi)
  chiudiRef.current = onChiudi

  useEffect(() => {
    if (!aperto) return
    const elementoPrecedente = document.activeElement as HTMLElement | null
    const overflowPrecedente = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    pannello.current?.focus()

    const tasto = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') chiudiRef.current()
    }
    document.addEventListener('keydown', tasto)
    return () => {
      document.removeEventListener('keydown', tasto)
      document.body.style.overflow = overflowPrecedente
      elementoPrecedente?.focus()
    }
  }, [aperto])

  return createPortal(
    <AnimatePresence>
      {aperto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div aria-hidden className="fixed inset-0 bg-ombra/70 backdrop-blur-sm" onClick={onChiudi} />
          <motion.div
            ref={pannello}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titolo ? idTitolo : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } }}
            exit={{ opacity: 0, scale: 0.94, y: 16, transition: { duration: 0.18 } }}
            className={cn(
              'relative my-auto w-full rounded-3xl bg-superficie p-6 shadow-2xl shadow-ombra/40 outline-none sm:p-8',
              larghezza,
            )}
          >
            <button
              type="button"
              onClick={onChiudi}
              aria-label="Chiudi"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-testo-2 transition-colors hover:bg-tenue"
            >
              <X aria-hidden className="size-5" />
            </button>
            {titolo && (
              <h2 id={idTitolo} className="mb-5 pr-10 text-2xl font-semibold text-testo">
                {titolo}
              </h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
