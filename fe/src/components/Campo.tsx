import { AnimatePresence, motion } from 'framer-motion'
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../utils/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etichetta: string
  errore?: string
  icona?: ReactNode
  suffisso?: ReactNode
  aiuto?: string
}

export function Campo({ etichetta, errore, icona, suffisso, aiuto, id, className, ...resto }: Props) {
  const idGenerato = useId()
  const idCampo = id ?? idGenerato
  const idErrore = `${idCampo}-errore`
  const idAiuto = `${idCampo}-aiuto`
  const descrizione = [errore ? idErrore : null, aiuto ? idAiuto : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={idCampo} className="block text-sm font-semibold text-testo">
        {etichetta}
      </label>
      <div className="relative">
        {icona && (
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-testo-2">
            {icona}
          </span>
        )}
        <input
          id={idCampo}
          aria-invalid={errore ? true : undefined}
          aria-describedby={descrizione}
          className={cn(
            'w-full rounded-xl border-2 bg-superficie px-4 py-3 text-testo outline-none transition',
            'placeholder:text-testo/65 focus:ring-4',
            icona ? 'pl-11' : undefined,
            suffisso ? 'pr-12' : undefined,
            errore
              ? 'border-errore focus:ring-rosso-500/20'
              : 'border-blu-500/80 focus:border-blu-500 focus:ring-blu-500/25',
            className,
          )}
          {...resto}
        />
        {suffisso && <span className="absolute right-2 top-1/2 -translate-y-1/2">{suffisso}</span>}
      </div>
      {aiuto && !errore && (
        <p id={idAiuto} className="text-xs text-testo/70">
          {aiuto}
        </p>
      )}
      <AnimatePresence initial={false}>
        {errore && (
          <motion.p
            id={idErrore}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm font-medium text-errore"
          >
            {errore}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
