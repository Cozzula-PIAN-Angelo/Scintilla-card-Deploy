import { cn } from '../../utils/cn'
import type { Filtro } from './conteggi'

interface Props {
  possedute: number
  totale: number
  master: boolean
  onMaster: (attivo: boolean) => void
  filtro: Filtro
  onFiltro: (filtro: Filtro) => void
}

const FILTRI: Array<{ valore: Filtro; etichetta: string }> = [
  { valore: 'tutte', etichetta: 'Tutte' },
  { valore: 'possedute', etichetta: 'Possedute' },
  { valore: 'mancanti', etichetta: 'Mancanti' },
]

// avanzamento della collezione di un set o di un Pokémon, con Master set e filtro
export function BarraCollezione({ possedute, totale, master, onMaster, filtro, onFiltro }: Props) {
  const percentuale = totale > 0 ? Math.round((possedute / totale) * 100) : 0

  return (
    <section aria-label="La tua collezione" className="mb-8 rounded-3xl bg-superficie p-4 shadow-lg shadow-ombra/10 ring-1 ring-linea/5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-lg font-semibold text-testo">
          {possedute} / {totale} {master ? 'varianti' : 'carte'}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            role="switch"
            aria-checked={master}
            onClick={() => onMaster(!master)}
            className="flex items-center gap-2 text-sm font-semibold text-testo-2"
          >
            <span className={cn('relative h-6 w-11 rounded-full transition-colors', master ? 'bg-blu-500' : 'bg-tenue')}>
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                  master && 'translate-x-5',
                )}
              />
            </span>
            Master set
          </button>
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
