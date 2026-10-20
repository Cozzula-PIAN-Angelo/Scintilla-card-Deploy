import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { AvanzamentoSet } from '../../types/api'
import { cn } from '../../utils/cn'
import { Barra } from './Barra'
import { gruppiSet, numeriMaster, percentuale, type OrdineSet } from './calcoli'
import { Sezione } from './Sezione'

const ORDINI: Array<{ valore: OrdineSet; etichetta: string }> = [
  { valore: 'completamento', etichetta: 'Più vicini al completamento' },
  { valore: 'data', etichetta: 'Per data' },
]

const CONTEGGI: Array<{ master: boolean; etichetta: string }> = [
  { master: false, etichetta: 'Carte' },
  { master: true, etichetta: 'Master set' },
]

const STILE_BOTTONE = 'rounded-full px-3 py-1 text-sm font-semibold transition-colors'

export function SezioneSet({ set }: { set: AvanzamentoSet[] }) {
  const [ordine, setOrdine] = useState<OrdineSet>('completamento')
  const [master, setMaster] = useState(false)
  const gruppi = gruppiSet(set, ordine, master)

  return (
    <Sezione titolo="Set">
      {set.length === 0 ? (
        <p className="text-testo/70">Nessun set iniziato.</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <div role="group" aria-label="Ordina i set" className="inline-flex flex-wrap gap-1 rounded-full bg-tenue p-1">
              {ORDINI.map((o) => (
                <button
                  key={o.valore}
                  type="button"
                  aria-pressed={ordine === o.valore}
                  onClick={() => setOrdine(o.valore)}
                  className={cn(STILE_BOTTONE, ordine === o.valore ? 'bg-blu-500 text-white' : 'text-testo-2 hover:bg-superficie')}
                >
                  {o.etichetta}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Cosa contare" className="inline-flex flex-wrap gap-1 rounded-full bg-tenue p-1">
              {CONTEGGI.map((c) => (
                <button
                  key={c.etichetta}
                  type="button"
                  aria-pressed={master === c.master}
                  onClick={() => setMaster(c.master)}
                  className={cn(STILE_BOTTONE, master === c.master ? 'bg-blu-500 text-white' : 'text-testo-2 hover:bg-superficie')}
                >
                  {c.etichetta}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
            {gruppi.map((g) => (
              <div key={g.serie ?? 'tutti'}>
                {g.serie && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accento">{g.serie}</h3>}
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
                  {g.set.map((s) => {
                    // numeri della riga: carte o voci del master set; null = master non noto (set mai aperto)
                    const n = master ? numeriMaster(s) : s
                    return (
                      <li key={s.id}>
                        <Link
                          to={`/espansioni/${s.id}`}
                          className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-tenue"
                        >
                          {s.simboloUrl ? (
                            <img src={s.simboloUrl} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} className="size-6 shrink-0 object-contain" />
                          ) : (
                            <span className="size-6 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 font-semibold text-testo">
                              <span className="truncate">{s.nome}</span>
                              {n && n.possedute >= n.totale && (
                                // oro su blu: il giallo da solo non si legge su superficie chiara
                                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-giallo-400 text-blu-900">
                                  <Check aria-label="Completato" strokeWidth={3} className="size-3" />
                                </span>
                              )}
                            </span>
                            {/* elenco unico per completamento: la serie si legge sotto il nome */}
                            {!g.serie && s.serie && <span className="block truncate text-xs text-testo/60">{s.serie}</span>}
                            {n ? (
                              <Barra
                                valore={n.possedute}
                                totale={n.totale}
                                className="mt-1.5"
                                colore={n.possedute >= n.totale ? 'bg-giallo-400' : undefined}
                              />
                            ) : (
                              <span className="mt-1 block text-sm text-testo/70">Apri il set per il master</span>
                            )}
                          </span>
                          {n && (
                            <span className="w-24 shrink-0 text-right text-sm text-testo/80">
                              {n.possedute} / {n.totale}
                              {master && <span className="sr-only"> varianti</span>}
                              <strong className="block text-testo">{percentuale(n.possedute, n.totale)}%</strong>
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </Sezione>
  )
}
