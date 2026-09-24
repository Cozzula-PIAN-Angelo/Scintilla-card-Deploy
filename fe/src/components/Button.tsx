import { motion, type HTMLMotionProps } from 'framer-motion'
import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { molla } from '../theme/motion'
import { cn } from '../utils/cn'

export type Variante = 'primario' | 'secondario' | 'pericolo' | 'chiaro' | 'fantasma' | 'suScuro'
export type Dimensione = 'sm' | 'md' | 'lg'

const VARIANTI: Record<Variante, string> = {
  primario: 'bg-blu-500 text-white shadow-lg shadow-blu-500/30 hover:bg-blu-700',
  secondario: 'bg-giallo-400 text-blu-900 shadow-lg shadow-giallo-400/40 hover:shadow-giallo-400/60',
  pericolo: 'bg-rosso-700 text-white shadow-lg shadow-rosso-500/30',
  chiaro: 'bg-superficie text-testo-2 shadow-md shadow-ombra/10 hover:bg-tenue scuro:ring-1 scuro:ring-white/10',
  fantasma: 'bg-transparent text-testo-2 hover:bg-tenue',
  // per sfondi blu scuri (navbar)
  suScuro: 'bg-transparent text-white ring-1 ring-white/40 hover:bg-white/10',
}

const DIMENSIONI: Record<Dimensione, string> = {
  sm: 'gap-1.5 px-3.5 py-2 text-sm',
  md: 'gap-2 px-5 py-2.5 text-sm',
  lg: 'gap-2.5 px-7 py-3.5 text-base',
}

export function classiBottone(variante: Variante = 'primario', dimensione: Dimensione = 'md', extra?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-full font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTI[variante],
    DIMENSIONI[dimensione],
    extra,
  )
}

interface PropsBottone extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variante?: Variante
  dimensione?: Dimensione
  caricamento?: boolean
  children?: ReactNode
}

export function Button({
  variante,
  dimensione,
  caricamento = false,
  disabled,
  className,
  children,
  type = 'button',
  ...resto
}: PropsBottone) {
  const inattivo = disabled || caricamento
  return (
    <motion.button
      type={type}
      disabled={inattivo}
      aria-busy={caricamento || undefined}
      whileHover={inattivo ? undefined : { y: -2, scale: 1.04 }}
      whileTap={inattivo ? undefined : { scale: 0.94 }}
      transition={molla}
      className={classiBottone(variante, dimensione, className)}
      {...resto}
    >
      {caricamento && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
      {children}
    </motion.button>
  )
}

interface PropsLinkBottone extends Omit<LinkProps, 'className'> {
  variante?: Variante
  dimensione?: Dimensione
  // classi di layout (es. flex-1), applicate al contenitore animato
  className?: string
}

// link con l'aspetto e il rimbalzo di un Button: l'animazione sta su un contenitore,
// così le props del Link non si scontrano con quelle di motion
export function LinkBottone({ variante, dimensione, className, ...resto }: PropsLinkBottone) {
  return (
    <motion.span
      whileHover={{ y: -2, scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      transition={molla}
      className={cn('inline-flex', className)}
    >
      <Link className={classiBottone(variante, dimensione, 'w-full')} {...resto} />
    </motion.span>
  )
}
