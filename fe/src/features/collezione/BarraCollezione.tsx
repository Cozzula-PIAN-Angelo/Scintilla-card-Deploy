import { cn } from '../../utils/cn'
import type { Filtro } from './conteggi'

interface Props {
  possedute: number
  totale: number
  filtro: Filtro
  onFiltro: (filtro: Filtro) => void
}

const FILTRI: Array<{ valore: Filtro; etichetta: string }> = [
  { valore: 'tutte', etichetta: 'Tutte' },
  { valore: 'possedute', etichetta: 'Possedute' },
  { valore: 'mancanti', etichetta: 'Mancanti' },
]

// avanzamento della collezione di un set o di un Pokémon, con filtro
export function BarraCollezione({ possedute, totale, filtro, onFiltro }: Props) {
  const percentuale = totale > 0 ? Math.round((possedute / totale) * 100) : 0

  return (
    <section aria-label="La tua collezione" className="mb-8 rounded-3xl bg-superficie p-4 shadow-lg shadow-ombra/10 ring-1 ring-linea/5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-lg font-semibold text-testo">
          {possedute} / {totale} carte
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div role="group" aria-label="Filtra le carte" className="flex gap-1 rounded-full bg-tenue p-1">
            {FILTRI.map(({ valore, etichetta }) => (
              <button
                key={valore}
                type="button"
                aria-pressed={filtro === valore}
                onClick={() => onFiltro(valore)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                  filtro === valore ? 'bg-blu-500 text-white' : 'text-testo-2 hover:bg-superficie',
                )}
              >
                {etichetta}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Avanzamento della collezione"
        aria-valuemin={0}
        aria-valuenow={possedute}
        aria-valuemax={totale}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-tenue"
      >
        <div className="h-full rounded-full bg-giallo-400 transition-[width] duration-500" style={{ width: `${percentuale}%` }} />
      </div>
    </section>
  )
}
