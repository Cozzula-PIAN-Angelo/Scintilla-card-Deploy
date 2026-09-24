import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { toastRimosso, type Toast, type TipoToast } from '../features/toast/toastSlice'
import { cn } from '../utils/cn'

const DURATA_MS = 4000

const STILI: Record<TipoToast, { classe: string; icona: typeof Info; barra: string }> = {
  successo: { classe: 'bg-blu-900 text-white scuro:ring-1 scuro:ring-white/15', icona: CircleCheck, barra: 'bg-giallo-400' },
  errore: { classe: 'bg-rosso-700 text-white', icona: TriangleAlert, barra: 'bg-white/70' },
  info: { classe: 'bg-superficie text-testo ring-1 ring-linea/10', icona: Info, barra: 'bg-blu-500' },
}

export function ToastViewport() {
  const toasts = useAppSelector((state) => state.toast)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ElementoToast key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ElementoToast({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch()
  const stile = STILI[toast.tipo]
  const Icona = stile.icona

  useEffect(() => {
    const timer = window.setTimeout(() => dispatch(toastRimosso(toast.id)), DURATA_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, toast.id])

  return (
    <motion.div
      layout
      role={toast.tipo === 'errore' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 24 } }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      className={cn(
        'pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl shadow-ombra/30',
        stile.classe,
      )}
    >
      <div className="flex items-start gap-3 p-4 pr-11">
        <Icona aria-hidden className={cn('mt-0.5 size-5 shrink-0', toast.tipo === 'successo' && 'text-giallo-400')} />
        <p className="text-sm font-medium">{toast.messaggio}</p>
      </div>
      <button
        type="button"
        onClick={() => dispatch(toastRimosso(toast.id))}
        aria-label="Chiudi la notifica"
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full opacity-80 transition-opacity hover:opacity-100"
      >
        <X aria-hidden className="size-4" />
      </button>
      <motion.div
        aria-hidden
        className={cn('absolute bottom-0 left-0 h-1 w-full origin-left', stile.barra)}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: DURATA_MS / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}
