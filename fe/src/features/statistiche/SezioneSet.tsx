import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { AvanzamentoSet } from '../../types/api'
import { cn } from '../../utils/cn'
import { Barra } from './Barra'
import { gruppiSet, percentuale, type OrdineSet } from './calcoli'
import { Sezione } from './Sezione'

const ORDINI: Array<{ valore: OrdineSet; etichetta: string }> = [
  { valore: 'completamento', etichetta: 'Più vicini al completamento' },
  { valore: 'data', etichetta: 'Per data' },
]

export function SezioneSet({ set }: { set: AvanzamentoSet[] }) {
  const [ordine, setOrdine] = useState<OrdineSet>('completamento')
  const gruppi = gruppiSet(set, ordine)

  return (
    <Sezione titolo="Set">
      {set.length === 0 ? (
        <p className="text-testo/70">Nessun set iniziato.</p>
      ) : (
        <>
          <div role="group" aria-label="Ordina i set" className="mb-5 inline-flex flex-wrap gap-1 rounded-full bg-tenue p-1">
            {ORDINI.map((o) => (
              <button
                key={o.valore}
                type="button"
                aria-pressed={ordine === o.valore}
                onClick={() => setOrdine(o.valore)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                  ordine === o.valore ? 'bg-blu-500 text-white' : 'text-testo-2 hover:bg-superficie',
                )}
              >
                {o.etichetta}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            {gruppi.map((g) => (
              <div key={g.serie ?? 'tutti'}>
                {g.serie && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accento">{g.serie}</h3>}
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
                  {g.set.map((s) => (
                    <li key={s.id}>
                      <Link to={`/espansioni/${s.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-tenue">
                        {s.simboloUrl ? (
                          <img src={s.simboloUrl} alt="" className="size-6 shrink-0 object-contain" />
                        ) : (
                          <span className="size-6 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 font-semibold text-testo">
                            <span className="truncate">{s.nome}</span>
                            {s.possedute >= s.totale && (
                              // oro su blu: il giallo da solo non si legge su superficie chiara
                              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-giallo-400 text-blu-900">
                                <Check aria-label="Completato" strokeWidth={3} className="size-3" />
                              </span>
                            )}
                          </span>
                          {/* elenco unico per completamento: la serie si legge sotto il nome */}
                          {!g.serie && s.serie && <span className="block truncate text-xs text-testo/60">{s.serie}</span>}
                          <Barra valore={s.possedute} totale={s.totale} className="mt-1.5" colore={s.possedute >= s.totale ? 'bg-giallo-400' : undefined} />
                        </span>
                        <span className="w-24 shrink-0 text-right text-sm text-testo/80">
                          {s.possedute} / {s.totale}
                          <strong className="block text-testo">{percentuale(s.possedute, s.totale)}%</strong>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </Sezione>
  )
}
