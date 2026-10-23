import { fasciaDellaVariante, testoFascia } from '../features/oggetti/fasciaPrezzo'
import { useGetPrezziCartaQuery } from '../features/oggetti/oggettiApi'
import type { Oggetto, Variante } from '../types/api'
import { Skeleton } from './Skeleton'

// sotto il prezzo del dettaglio: minimo e massimo di Cardmarket per la variante mostrata, letti al momento.
// Finché arrivano una riga d'attesa; se non arrivano (TCGdex giù, carta senza dati o creata a mano) niente
export function FasciaPrezzoCarta({ oggetto, variante }: { oggetto: Oggetto; variante: Variante | null | undefined }) {
  const { data, isLoading } = useGetPrezziCartaQuery(oggetto.id, { skip: !oggetto.idEsterno })
  if (!oggetto.idEsterno) return null
  if (isLoading) return <Skeleton className="h-9 w-56 rounded-lg" />
  const fascia = data ? fasciaDellaVariante(data, variante) : null
  if (!fascia) return null
  const testo = testoFascia(fascia)
  return (
    <div
      className="space-y-0.5 text-sm"
      title="Minimo: l'offerta più bassa. Massimo: il valore più alto tra media, trend e medie a 1, 7 e 30 giorni"
    >
      <p className="text-testo/80">
        <span className="font-semibold text-testo tabular-nums">{testo.fascia}</span> su Cardmarket
        {variante === 'REVERSE_HOLO' && ' (Reverse)'}
      </p>
      {testo.dettagli && <p className="text-xs tabular-nums text-testo/70">{testo.dettagli}</p>}
    </div>
  )
}
