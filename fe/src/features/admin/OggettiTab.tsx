import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { messaggioErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { ImmagineCarta } from '../../components/ImmagineCarta'
import { Loader } from '../../components/Loader'
import { Modale } from '../../components/Modale'
import { Paginazione } from '../../components/Paginazione'
import { StatoErrore, StatoVuoto } from '../../components/StatiPagina'
import type { Oggetto } from '../../types/api'
import { cn } from '../../utils/cn'
import { formattaData, formattaPrezzo } from '../../utils/formato'
import { useCancellaOggettoMutation, useGetOggettiQuery } from '../oggetti/oggettiApi'
import { useToast } from '../toast/useToast'
import { ModaleOggetto } from './ModaleOggetto'

const PER_PAGINA = 10

export function OggettiTab() {
  const [pagina, setPagina] = useState(0)
  const { data, isLoading, isFetching, isError, error, refetch } = useGetOggettiQuery({
    page: pagina,
    size: PER_PAGINA,
    sort: 'createdAt,desc',
  })
  const [cancella, { isLoading: inCancellazione }] = useCancellaOggettoMutation()
  const toast = useToast()

  const [formAperto, setFormAperto] = useState(false)
  const [inModifica, setInModifica] = useState<Oggetto | null>(null)
  const [daCancellare, setDaCancellare] = useState<Oggetto | null>(null)

  useEffect(() => {
    if (data && pagina > 0 && pagina >= data.totalPages) setPagina(Math.max(0, data.totalPages - 1))
  }, [data, pagina])

  const apriCreazione = () => {
    setInModifica(null)
    setFormAperto(true)
  }

  const apriModifica = (oggetto: Oggetto) => {
    setInModifica(oggetto)
    setFormAperto(true)
  }

  const confermaCancellazione = async () => {
    if (!daCancellare) return
    try {
      await cancella(daCancellare.id).unwrap()
      toast.successo(`«${daCancellare.nome}» eliminato`)
      setDaCancellare(null)
    } catch (e) {
      toast.errore(messaggioErrore(e, 'Eliminazione non riuscita'))
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-blu-900">Oggetti del catalogo</h2>
          {data && <p className="text-sm text-blu-900/70">{data.totalElements} in totale</p>}
        </div>
        <Button variante="secondario" onClick={apriCreazione}>
          <Plus aria-hidden className="size-4" />
          Nuovo oggetto
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <StatoErrore messaggio={messaggioErrore(error)} onRiprova={refetch} />
      ) : !data || data.content.length === 0 ? (
        <StatoVuoto
          icona={<Layers aria-hidden className="size-16" />}
          titolo="Nessun oggetto"
          testo="Crea un oggetto a mano o importa una carta dalla tab «Importa carte»."
        />
      ) : (
        <>
          <div className={cn('overflow-x-auto rounded-3xl bg-white shadow-lg shadow-blu-900/10 transition-opacity', isFetching && 'opacity-60')}>
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-blu-50 text-xs uppercase tracking-wide text-blu-700">
                <tr>
                  <th scope="col" className="px-5 py-4">Carta</th>
                  <th scope="col" className="px-5 py-4">Nome</th>
                  <th scope="col" className="px-5 py-4">Prezzo</th>
                  <th scope="col" className="px-5 py-4">Creato il</th>
                  <th scope="col" className="px-5 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {data.content.map((oggetto) => (
                    <motion.tr
                      key={oggetto.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="border-t border-blu-50 transition-colors hover:bg-blu-50/50"
                    >
                      <td className="px-5 py-3">
                        <ImmagineCarta src={oggetto.immagineUrlPiccola ?? oggetto.immagineUrl} alt={oggetto.nome} className="aspect-[63/88] w-12 rounded-lg" />
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-blu-900">{oggetto.nome}</p>
                        {oggetto.idEsterno && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blu-700">
                            <BadgeCheck aria-hidden className="size-3.5" />
                            Importata ({oggetto.idEsterno})
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-giallo-400 px-3 py-1 font-bold text-blu-900">{formattaPrezzo(oggetto.prezzo)}</span>
                      </td>
                      <td className="px-5 py-3 text-blu-900/70">{formattaData(oggetto.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variante="chiaro" dimensione="sm" onClick={() => apriModifica(oggetto)} aria-label={`Modifica ${oggetto.nome}`}>
                            <Pencil aria-hidden className="size-4" />
                          </Button>
                          <Button variante="pericolo" dimensione="sm" onClick={() => setDaCancellare(oggetto)} aria-label={`Elimina ${oggetto.nome}`}>
                            <Trash2 aria-hidden className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <Paginazione pagina={pagina} totalePagine={data.totalPages} onCambia={setPagina} />
        </>
      )}

      <ModaleOggetto aperto={formAperto} oggetto={inModifica} onChiudi={() => setFormAperto(false)} />

      <Modale aperto={daCancellare !== null} onChiudi={() => setDaCancellare(null)} titolo="Eliminare l'oggetto?">
        <p className="text-blu-900">
          Stai per eliminare <strong>«{daCancellare?.nome}»</strong>. Sparirà anche dai preferiti degli utenti. L'operazione
          non si può annullare.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variante="fantasma" onClick={() => setDaCancellare(null)}>
            Annulla
          </Button>
          <Button variante="pericolo" onClick={confermaCancellazione} caricamento={inCancellazione}>
            <Trash2 aria-hidden className="size-4" />
            Elimina
          </Button>
        </div>
      </Modale>
    </div>
  )
}
