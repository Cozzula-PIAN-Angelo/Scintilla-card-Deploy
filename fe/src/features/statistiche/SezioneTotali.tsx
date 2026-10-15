import type { Statistiche } from '../../types/api'
import { ETICHETTE, VARIANTI } from '../collezione/varianti'
import { Sezione } from './Sezione'

export function SezioneTotali({ totali }: { totali: Statistiche['totali'] }) {
  const numeri = [
    { etichetta: 'Carte diverse', valore: totali.carteDiverse },
    { etichetta: 'Copie', valore: totali.copie },
    { etichetta: 'Set iniziati', valore: totali.setIniziati },
    { etichetta: 'Set completati', valore: totali.setCompletati },
    { etichetta: 'Binder', valore: totali.binder },
    { etichetta: 'Carte nei binder', valore: totali.carteNeiBinder },
  ]
  return (
    <Sezione titolo="Totali">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {numeri.map((n) => (
          <div key={n.etichetta}>
            <dt className="text-sm font-semibold text-testo/70">{n.etichetta}</dt>
            <dd className="mt-1 text-2xl font-bold text-testo">{n.valore.toLocaleString('it-IT')}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mb-2 mt-6 text-sm font-semibold text-testo/70">Copie per variante</h3>
      <ul className="flex flex-wrap gap-2">
        {VARIANTI.map((v) => (
          <li key={v} className="rounded-full bg-tenue px-3 py-1 text-sm font-semibold text-testo">
            {ETICHETTE[v]}: {(totali.copiePerVariante[v] ?? 0).toLocaleString('it-IT')}
          </li>
        ))}
      </ul>
    </Sezione>
  )
}
