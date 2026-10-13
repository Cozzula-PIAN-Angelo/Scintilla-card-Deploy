import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
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

// cassetto delle carte: colonna laterale richiudibile su schermi larghi
export function CassettoLaterale({ visibile }: { visibile: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {visibile && (
        <motion.aside
          key="cassetto"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '18rem', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          className="flex shrink-0 overflow-hidden"
        >
          <div className="flex h-full w-72 shrink-0 flex-col rounded-3xl bg-superficie p-4 shadow-lg shadow-ombra/10">
            <IntestazioneCassetto />
            <Cassetto />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

// cassetto su schermi stretti: foglio dal basso
export function CassettoDalBasso({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  return (
    <AnimatePresence>
      {aperto && (
        <>
          <motion.div
            aria-hidden
            className="fixed inset-0 z-[46] bg-ombra/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onChiudi}
          />
          <motion.div
            role="dialog"
            aria-label="Carte da inserire"
            className="fixed inset-x-0 bottom-0 z-[47] flex h-[72dvh] flex-col rounded-t-3xl bg-superficie p-4 shadow-2xl lg:hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3">
              <IntestazioneCassetto />
              <button
                type="button"
                onClick={onChiudi}
                aria-label="Chiudi"
                className="grid size-10 shrink-0 place-items-center rounded-full text-testo-2 hover:bg-tenue"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <Cassetto onScelta={onChiudi} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
