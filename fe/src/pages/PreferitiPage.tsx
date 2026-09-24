import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { messaggioErrore } from '../app/errori'
import { LinkBottone } from '../components/Button'
import { ModaleCarta } from '../components/ModaleCarta'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { Paginazione } from '../components/Paginazione'
import { SelectOrdinamento } from '../components/SelectOrdinamento'
import { GrigliaSkeleton } from '../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../components/StatiPagina'
import { GrigliaOggetti } from '../features/oggetti/GrigliaOggetti'
import { ORDINAMENTI_PREFERITI, ORDINAMENTO_PREDEFINITO } from '../features/oggetti/ordinamenti'
import { useGetPreferitiQuery } from '../features/preferiti/preferitiApi'
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { useParametriPagina } from '../hooks/useParametriPagina'
import { useTitolo } from '../hooks/useTitolo'
import type { Oggetto } from '../types/api'

const PER_PAGINA = 12
const VALORI_ORDINAMENTO = ORDINAMENTI_PREFERITI.map((o) => o.valore)

export function PreferitiPage() {
  useTitolo('I miei preferiti')
  const { pagina, ordinamento, vaiAPagina, cambiaOrdinamento } = useParametriPagina(ORDINAMENTO_PREDEFINITO, VALORI_ORDINAMENTO)
  const { data, isLoading, isFetching, isError, error, refetch } = useGetPreferitiQuery({
    page: pagina,
    size: PER_PAGINA,
    sort: ordinamento,
  })
  const { isPreferito, toggle, idsCaricati } = usePreferiti()
  const [selezionato, setSelezionato] = useState<Oggetto | null>(null)

  // la lista segue gli id aggiornati in modo ottimistico: una carta tolta esce subito con l'animazione
  const visibili = (data?.content ?? []).filter((preferito) => !idsCaricati || isPreferito(preferito.oggetto.id))

  // pagina svuotata dalle rimozioni: si torna alla precedente
  useEffect(() => {
    if (data && pagina > 0 && (pagina >= data.totalPages || data.content.length === 0)) {
      vaiAPagina(Math.max(0, Math.min(pagina - 1, data.totalPages - 1)))
    }
  }, [data, pagina, vaiAPagina])

  const vuoto = !isLoading && !isError && visibili.length === 0 && !isFetching

  return (
    <PaginaAnimata className="min-h-[70vh]">
      <section className="bg-notte-2 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-12 sm:px-6">
          <h1 className="flex items-center gap-3 text-4xl font-bold sm:text-5xl">
            <Heart aria-hidden className="size-9 fill-rosso-500 text-rosso-500" />I miei preferiti
          </h1>
          <p className="text-white">Le carte che hai salvato, pronte da ammirare.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {data && data.totalElements > 0 && (
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-testo">
              {data.totalElements === 1 ? '1 carta salvata' : `${data.totalElements} carte salvate`}
            </p>
            <SelectOrdinamento valore={ordinamento} opzioni={ORDINAMENTI_PREFERITI} onCambia={cambiaOrdinamento} />
          </div>
        )}

        {isLoading ? (
          <GrigliaSkeleton />
        ) : isError ? (
          <StatoErrore messaggio={messaggioErrore(error, 'Non è stato possibile caricare i preferiti.')} onRiprova={refetch} />
        ) : vuoto ? (
          <StatoVuoto
            icona={<Heart aria-hidden className="size-16 fill-rosso-500 text-rosso-500" />}
            titolo="Nessuna carta tra i preferiti"
            testo="Tocca il cuore su una carta del catalogo per ritrovarla qui."
            azione={
              <LinkBottone to="/" variante="primario" dimensione="lg">
                Vai al catalogo
              </LinkBottone>
            }
          />
        ) : (
          <>
            <GrigliaOggetti
              chiave={`${pagina}-${ordinamento}`}
              elementi={visibili.map((preferito) => ({ oggetto: preferito.oggetto, aggiuntoIl: preferito.aggiuntoIl }))}
              isPreferito={isPreferito}
              onTogglePreferito={toggle}
              onApri={setSelezionato}
            />
            {data && <Paginazione pagina={pagina} totalePagine={data.totalPages} onCambia={vaiAPagina} />}
          </>
        )}
      </section>

      <ModaleCarta
        oggetto={selezionato}
        preferito={selezionato ? isPreferito(selezionato.id) : false}
        onTogglePreferito={toggle}
        onChiudi={() => setSelezionato(null)}
      />
    </PaginaAnimata>
  )
}
