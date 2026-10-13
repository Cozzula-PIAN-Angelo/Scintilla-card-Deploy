import { useContestoBinder } from '../contesto'
import { ElencoCarte } from '../ElencoCarte'

export function IntestazioneCassetto() {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-semibold text-testo">Aggiungi carte</h2>
      <p className="text-xs text-testo/70">Trascina una carta in una tasca, oppure toccala e poi tocca la tasca.</p>
    </div>
  )
}

export function Cassetto({ onScelta }: { onScelta?: () => void }) {
  const binder = useContestoBinder()
  return (
    <div className="min-h-0 flex-1">
      <ElencoCarte
        selezionata={binder.inMano?.tipo === 'carta' ? binder.inMano.oggetto.id : null}
        onScegli={(oggetto) => {
          const giaInMano = binder.inMano?.tipo === 'carta' && binder.inMano.oggetto.id === oggetto.id
          binder.prendi(giaInMano ? null : { tipo: 'carta', oggetto })
          if (!giaInMano) onScelta?.()
        }}
        onTrascina={(oggetto) => binder.iniziaTrascinamento({ tipo: 'carta', oggetto })}
        onFineTrascinamento={binder.fineTrascinamento}
      />
    </div>
  )
}
