import { Minus, Plus } from 'lucide-react'
import type { Oggetto, Variante } from '../../types/api'
import { cn } from '../../utils/cn'
import { ETICHETTE, VARIANTI } from './varianti'

interface Props {
  oggetto: Oggetto
  perVariante: Map<Variante, number>
  onModifica: (variante: Variante, delta: number) => void
  // variante di cui la carta grande mostra l'effetto
  selezionata: Variante | null
  onSeleziona: (variante: Variante) => void
}

// Sezione "Collezione" del dettaglio: una riga per variante con "− quantità +". Le suggerite sono
// sempre visibili (anche a 0), le possedute non suggerite pure; le altre stanno in "+ altra variante"
export function SezioneCollezione({ oggetto, perVariante, onModifica, selezionata, onSeleziona }: Props) {
  const suggerite = oggetto.varianti ?? []
  const righe = VARIANTI.filter((v) => suggerite.includes(v) || (perVariante.get(v) ?? 0) > 0)
  const restanti = VARIANTI.filter((v) => !righe.includes(v))

  return (
    <section aria-label="Collezione" className="space-y-2 rounded-2xl bg-tenue p-3">
      <h3 className="text-sm font-semibold text-testo">Collezione</h3>
      <ul className="space-y-1.5">
        {righe.map((variante) => {
          const quantita = perVariante.get(variante) ?? 0
          const etichetta = ETICHETTE[variante]
          return (
            <li key={variante} className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-pressed={selezionata === variante}
                onClick={() => onSeleziona(variante)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                  selezionata === variante ? 'bg-blu-500 text-white' : 'text-testo-2 hover:bg-superficie',
                )}
              >
                {etichetta}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={quantita === 0}
                  aria-label={`Togli una copia ${etichetta}`}
                  onClick={() => onModifica(variante, -1)}
                  className="grid size-8 place-items-center rounded-full bg-superficie text-testo-2 shadow transition-colors hover:bg-blu-500 hover:text-white disabled:opacity-40 disabled:hover:bg-superficie disabled:hover:text-testo-2"
                >
                  <Minus aria-hidden className="size-4" />
                </button>
                {/* a schermo solo il numero, il lettore di schermo legge anche la variante */}
                <span aria-live="polite" aria-atomic className="w-8 text-center text-sm font-semibold tabular-nums text-testo">
                  <span aria-hidden>{quantita}</span>
                  <span className="sr-only">{quantita === 1 ? `1 copia ${etichetta}` : `${quantita} copie ${etichetta}`}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Aggiungi una copia ${etichetta}`}
                  onClick={() => onModifica(variante, 1)}
                  className="grid size-8 place-items-center rounded-full bg-superficie text-testo-2 shadow transition-colors hover:bg-blu-500 hover:text-white"
                >
                  <Plus aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {restanti.length > 0 && (
        // scegliere una variante fa +1 e il menu torna sul segnaposto
        <select
          aria-label="Aggiungi un'altra variante"
          value=""
          onChange={(evento) => {
            const variante = evento.target.value as Variante
            if (variante) onModifica(variante, 1)
          }}
          className="w-full rounded-full bg-superficie px-3 py-1.5 text-sm font-semibold text-testo-2"
        >
          <option value="">+ altra variante</option>
          {restanti.map((v) => (
            <option key={v} value={v}>
              {ETICHETTE[v]}
            </option>
          ))}
        </select>
      )}
    </section>
  )
}
