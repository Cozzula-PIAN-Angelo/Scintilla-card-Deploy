import { LayoutGrid, PanelLeft, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import type { FiltroStato } from './indice'
import type { VistaPokedex } from './useVistaPokedex'

interface Props {
  ricerca: string
  onRicerca: (valore: string) => void
  stato: FiltroStato
  onStato: (stato: FiltroStato) => void
  vista: VistaPokedex
  onVista: (vista: VistaPokedex) => void
  // il filtro della collezione solo con l'accesso
  conCollezione: boolean
  children?: ReactNode
}

const VOCI_STATO: Array<{ valore: FiltroStato; etichetta: string }> = [
  { valore: 'tutti', etichetta: 'Tutti' },
  { valore: 'presi', etichetta: "Ce l'ho" },
  { valore: 'mancanti', etichetta: 'Mi mancano' },
]

const VOCI_VISTA = [
  { valore: 'scheda', etichetta: 'Scheda', Icona: PanelLeft },
  { valore: 'griglia', etichetta: 'Griglia', Icona: LayoutGrid },
] as const

// ricerca, filtro della collezione e vista; sotto, su una riga loro, i salti alle generazioni (children)
export function BarraPokedex({ ricerca, onRicerca, stato, onStato, vista, onVista, conCollezione, children }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative block min-w-0 max-w-md flex-1 basis-56">
        <span className="sr-only">Cerca un Pokémon</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-accento" />
        <input
          type="search"
          value={ricerca}
          onChange={(e) => onRicerca(e.target.value)}
          placeholder="Nome o numero…"
          className="w-full rounded-full bg-superficie py-3 pl-12 pr-5 text-testo shadow-md shadow-ombra/10 ring-1 ring-linea/10 outline-none placeholder:text-testo/50 focus:ring-2 focus:ring-blu-500"
        />
      </label>
      {conCollezione && <Segmenti etichetta="Quali Pokémon" voci={VOCI_STATO} valore={stato} onCambia={onStato} />}
      {children && <div className="order-last w-full min-w-0">{children}</div>}
      <Segmenti etichetta="Vista" voci={VOCI_VISTA} valore={vista} onCambia={onVista} className="ml-auto" />
    </div>
  )
}

interface PropsSegmenti<T extends string> {
  etichetta: string
  voci: ReadonlyArray<{ valore: T; etichetta: string; Icona?: typeof Search }>
  valore: T
  onCambia: (valore: T) => void
  className?: string
}

// bottoni affiancati in una pillola: quello scelto è pieno
function Segmenti<T extends string>({ etichetta, voci, valore, onCambia, className }: PropsSegmenti<T>) {
  return (
    <div role="group" aria-label={etichetta} className={cn('flex shrink-0 rounded-full bg-superficie p-1 shadow-md shadow-ombra/10 ring-1 ring-linea/10', className)}>
      {voci.map(({ valore: v, etichetta: e, Icona }) => (
        <button
          key={v}
          type="button"
          aria-pressed={valore === v}
          onClick={() => onCambia(v)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-3.5',
            valore === v ? 'bg-blu-900 text-white scuro:bg-giallo-400 scuro:text-blu-900' : 'text-testo-2 hover:bg-tenue',
          )}
        >
          {Icona && <Icona aria-hidden className="size-4" />}
          {/* da telefono la vista è solo l'icona, così sta accanto alla ricerca */}
          <span className={cn(Icona && 'sr-only sm:not-sr-only')}>{e}</span>
        </button>
      ))}
    </div>
  )
}
