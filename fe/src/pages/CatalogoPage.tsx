import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { messaggioErrore } from '../app/errori'
import { ModaleCarta } from '../components/ModaleCarta'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { Paginazione } from '../components/Paginazione'
import { SelectOrdinamento } from '../components/SelectOrdinamento'
import { GrigliaSkeleton } from '../components/Skeleton'
import { StatoErrore, StatoVuoto } from '../components/StatiPagina'
import { GrigliaOggetti } from '../features/oggetti/GrigliaOggetti'
import { Hero } from '../features/oggetti/Hero'
import { useGetOggettiQuery } from '../features/oggetti/oggettiApi'
import { ORDINAMENTI_CATALOGO, ORDINAMENTO_PREDEFINITO } from '../features/oggetti/ordinamenti'
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { useParametriPagina } from '../hooks/useParametriPagina'
import { useTitolo } from '../hooks/useTitolo'
import type { Oggetto } from '../types/api'

const PER_PAGINA = 12
const VALORI_ORDINAMENTO = ORDINAMENTI_CATALOGO.map((o) => o.valore)

export function CatalogoPage() {
  useTitolo('Catalogo')
  const { pagina, ordinamento, vaiAPagina, cambiaOrdinamento } = useParametriPagina(ORDINAMENTO_PREDEFINITO, VALORI_ORDINAMENTO)
  const { data, isLoading, isFetching, isError, error, refetch } = useGetOggettiQuery({
    page: pagina,
    size: PER_PAGINA,
    sort: ordinamento,
  })
  const { isPreferito, toggle } = usePreferiti()
  const [selezionato, setSelezionato] = useState<Oggetto | null>(null)
  const sezione = useRef<HTMLElement>(null)

  // pagina oltre l'ultima (URL modificato a mano o carte cancellate): si torna all'ultima valida
  useEffect(() => {
    if (data && pagina > 0 && pagina >= data.totalPages) vaiAPagina(Math.max(0, data.totalPages - 1))
  }, [data, pagina, vaiAPagina])

  const scorriAlCatalogo = () => sezione.current?.scrollIntoView({ block: 'start' })

  const cambiaPagina = (nuova: number) => {
    vaiAPagina(nuova)
    scorriAlCatalogo()
  }

  return (
    <PaginaAnimata>
      <Hero vetrina={data?.content.filter((o) => o.immagineUrl).slice(0, 3) ?? []} onEsplora={scorriAlCatalogo} />

      <section ref={sezione} id="catalogo" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-4xl font-bold text-blu-900">
              Il catalogo
              <Sparkles aria-hidden className="size-7 text-blu-500" />
            </h2>
            {data && (
              <p className="mt-1 text-blu-900/70">
                {data.totalElements === 1 ? '1 carta disponibile' : `${data.totalElements} carte disponibili`}
              </p>
            )}
          </div>
          <SelectOrdinamento valore={ordinamento} opzioni={ORDINAMENTI_CATALOGO} onCambia={cambiaOrdinamento} />
        </div>

        {isLoading ? (
          <GrigliaSkeleton />
        ) : isError ? (
          <StatoErrore messaggio={messaggioErrore(error, 'Non è stato possibile caricare il catalogo.')} onRiprova={refetch} />
        ) : !data || data.content.length === 0 ? (
          <StatoVuoto
            icona={<Sparkles aria-hidden className="size-16" />}
            titolo="Il catalogo è ancora vuoto"
            testo="Le prime carte arriveranno presto: torna a trovarci!"
          />
        ) : (
          <>
            <GrigliaOggetti
              chiave={`${pagina}-${ordinamento}`}
              elementi={data.content.map((oggetto) => ({ oggetto }))}
              isPreferito={isPreferito}
              onTogglePreferito={toggle}
              onApri={setSelezionato}
              inAggiornamento={isFetching}
            />
            <Paginazione pagina={pagina} totalePagine={data.totalPages} onCambia={cambiaPagina} />
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
