import { AnimatePresence, motion } from 'framer-motion'
import { Layers, PackageSearch, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { OggettiTab } from '../features/admin/OggettiTab'
import { UtentiTab } from '../features/admin/UtentiTab'
import { ImportaCarteTab } from '../features/carte/ImportaCarteTab'
import { useTitolo } from '../hooks/useTitolo'
import { molla } from '../theme/motion'
import { cn } from '../utils/cn'

type IdTab = 'importa' | 'oggetti' | 'utenti'

const TAB: Array<{ id: IdTab; etichetta: string; icona: LucideIcon }> = [
  { id: 'importa', etichetta: 'Importa carte', icona: PackageSearch },
  { id: 'oggetti', etichetta: 'Oggetti', icona: Layers },
  { id: 'utenti', etichetta: 'Utenti', icona: Users },
]

export function AdminPage() {
  useTitolo('Amministrazione')
  // tab attiva nell'URL (?tab=oggetti): sopravvive al refresh
  const [params, setParams] = useSearchParams()
  const attiva: IdTab = TAB.find((t) => t.id === params.get('tab'))?.id ?? 'importa'

  return (
    <PaginaAnimata className="min-h-[70vh]">
      <section className="bg-notte-2 text-white">
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <h1 className="flex items-center gap-3 text-4xl font-bold sm:text-5xl">
            <ShieldCheck aria-hidden className="size-9 text-giallo-400" />
            Amministrazione
          </h1>
          <p className="mt-2 text-white">Importa nuove carte, gestisci il catalogo e i permessi degli utenti.</p>

          <div role="tablist" aria-label="Sezioni di amministrazione" className="mt-8 flex gap-2 overflow-x-auto pb-4">
            {TAB.map((tab) => {
              const selezionata = tab.id === attiva
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selezionata}
                  aria-controls={`pannello-${tab.id}`}
                  onClick={() => setParams({ tab: tab.id })}
                  className={cn(
                    'relative flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors',
                    selezionata ? 'text-blu-900' : 'text-white hover:bg-white/10',
                  )}
                >
                  {selezionata && (
                    <motion.span layoutId="tab-admin" transition={molla} className="absolute inset-0 rounded-full bg-white shadow-lg" />
                  )}
                  <tab.icona aria-hidden className={cn('relative size-4', selezionata && 'text-blu-500')} />
                  <span className="relative">{tab.etichetta}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={attiva}
            role="tabpanel"
            id={`pannello-${attiva}`}
            aria-labelledby={`tab-${attiva}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {attiva === 'importa' && <ImportaCarteTab />}
            {attiva === 'oggetti' && <OggettiTab />}
            {attiva === 'utenti' && <UtentiTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PaginaAnimata>
  )
}
