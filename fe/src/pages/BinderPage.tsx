import { AnimatePresence, motion } from 'framer-motion'
import { Album, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '../components/Button'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { BinderAperto } from '../features/binder/BinderAperto'
import { Mensola } from '../features/binder/Mensola'
import { ModaleBinder } from '../features/binder/ModaleBinder'
import { useTitolo } from '../hooks/useTitolo'
import type { Binder } from '../types/api'

// Mensola (/binder) e binder aperto (/binder/:id) nella stessa pagina: passando dall'uno
// all'altro la pagina resta montata e cambia solo il contenuto, con le sue animazioni
export function BinderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // il binder resta anche a modale chiusa: durante l'uscita il titolo non cambia
  const [modale, setModale] = useState<{ aperta: boolean; binder: Binder | null }>({ aperta: false, binder: null })
  useTitolo(id ? 'Il mio binder' : 'I miei binder')

  const apriImpostazioni = (binder: Binder | null) => setModale({ aperta: true, binder })
  const chiudiModale = () => setModale((attuale) => ({ ...attuale, aperta: false }))

  return (
    <PaginaAnimata className="min-h-[70vh]">
      <AnimatePresence mode="wait" initial={false}>
        {id ? (
          <motion.div key={`binder-${id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BinderAperto id={id} onChiuso={() => navigate('/binder')} onImpostazioni={apriImpostazioni} />
          </motion.div>
        ) : (
          <motion.div key="mensola" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <section className="bg-notte-2 text-white">
              <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                <div>
                  <h1 className="flex items-center gap-3 text-4xl font-bold sm:text-5xl">
                    <Album aria-hidden className="size-9 text-giallo-400" />I miei binder
                  </h1>
                  <p className="mt-2 text-white">Album da riempire come vuoi: ogni carta nella tasca che preferisci.</p>
                </div>
                <Button variante="secondario" onClick={() => apriImpostazioni(null)}>
                  <Plus aria-hidden className="size-4" />
                  Nuovo binder
                </Button>
              </div>
            </section>
            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
              <Mensola
                onApri={(binder) => navigate(`/binder/${binder.id}`)}
                onNuovo={() => apriImpostazioni(null)}
                onImpostazioni={apriImpostazioni}
              />
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <ModaleBinder
        aperta={modale.aperta}
        binder={modale.binder}
        onChiudi={chiudiModale}
        onCreato={(binder) => {
          chiudiModale()
          navigate(`/binder/${binder.id}`)
        }}
        onEliminato={() => {
          chiudiModale()
          navigate('/binder')
        }}
      />
    </PaginaAnimata>
  )
}
