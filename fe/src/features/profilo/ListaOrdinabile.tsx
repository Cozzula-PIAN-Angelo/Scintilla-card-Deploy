import { Reorder } from 'framer-motion'
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { sposta, togli } from './liste'

interface Props<T> {
  voci: T[]
  chiave: (voce: T) => string
  onCambia: (voci: T[]) => void
  render: (voce: T, indice: number) => ReactNode
  // nome della voce per i lettori di schermo
  etichetta: (voce: T) => string
}

const FRECCIA = 'grid size-8 place-items-center rounded-full text-testo-2 transition-colors hover:bg-tenue disabled:opacity-30 disabled:hover:bg-transparent'

// lista da riordinare trascinando, o con le frecce (tastiera e telefono); ogni voce si può togliere
export function ListaOrdinabile<T>({ voci, chiave, onCambia, render, etichetta }: Props<T>) {
  return (
    <Reorder.Group axis="y" values={voci} onReorder={onCambia} className="space-y-2">
      {voci.map((voce, indice) => (
        <Reorder.Item
          key={chiave(voce)}
          value={voce}
          className="flex cursor-grab items-center gap-2 rounded-2xl bg-tenue/60 p-2 active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4 shrink-0 text-testo/40" />
          <div className="min-w-0 flex-1">{render(voce, indice)}</div>
          <button
            type="button"
            aria-label={`Sposta ${etichetta(voce)} prima`}
            disabled={indice === 0}
            onClick={() => onCambia(sposta(voci, indice, indice - 1))}
            className={FRECCIA}
          >
            <ChevronUp aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Sposta ${etichetta(voce)} dopo`}
            disabled={indice === voci.length - 1}
            onClick={() => onCambia(sposta(voci, indice, indice + 1))}
            className={FRECCIA}
          >
            <ChevronDown aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Togli ${etichetta(voce)}`}
            onClick={() => onCambia(togli(voci, indice))}
            className="grid size-8 place-items-center rounded-full text-testo-2 transition-colors hover:bg-rosso-700 hover:text-white"
          >
            <X aria-hidden className="size-4" />
          </button>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  )
}
