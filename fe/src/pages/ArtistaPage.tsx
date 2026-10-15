import { ArrowLeft, BookPlus, Palette } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { statoErrore } from '../app/errori'
import { Button, LinkBottone } from '../components/Button'
import { GrigliaCartePaginata } from '../components/GrigliaCartePaginata'
import { ModaleCarta } from '../components/ModaleCarta'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { StatoVuoto } from '../components/StatiPagina'
import { coautori, elencoNomi, SLUG_SCONOSCIUTO } from '../features/artisti/artisti'
import { useGetArtistiQuery, useGetCarteArtistaQuery } from '../features/artisti/artistiApi'
import { AvatarArtista } from '../features/artisti/AvatarArtista'
import { memoriaArtisti } from '../features/artisti/memoriaArtisti'
import { ModaleBinder } from '../features/binder/ModaleBinder'
import { BarraCollezione } from '../features/collezione/BarraCollezione'
import { useCollezionePagina } from '../features/collezione/useCollezionePagina'
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { useCartaSelezionata } from '../hooks/useCartaSelezionata'
import { useTitolo } from '../hooks/useTitolo'
import type { Oggetto } from '../types/api'

// tutte le carte illustrate da un artista, dalla più recente
export function ArtistaPage() {
  const { slug = '' } = useParams()
  const { data: elenco } = useGetArtistiQuery()
  const artista = elenco?.find((a) => a.slug === slug)
  // currentData, non data: passando da un artista all'altro (link nel dettaglio carta) la pagina resta
  // montata, e data conterrebbe ancora le carte dell'artista precedente finché arrivano le nuove
  const { currentData: data, isFetching, isError, error, refetch } = useGetCarteArtistaQuery(slug)
  const isLoading = data === undefined && !isError
  const { isPreferito, toggle } = usePreferiti()
  const filtroPagina = useMemo(() => (slug ? { artista: slug } : null), [slug])
  const { collezione, carte, barra, vuotoFiltro } = useCollezionePagina(filtroPagina, data)
  const { apri, aperta, modale } = useCartaSelezionata({ isPreferito, toggle }, collezione, carte)
  const location = useLocation()
  const navigate = useNavigate()
  const [checklistAperta, setChecklistAperta] = useState(false)
  const nonTrovato = (elenco !== undefined && !artista) || statoErrore(error) === 404
  useTitolo(artista?.nome ?? (nonTrovato ? 'Artista non trovato' : 'Artisti'))

  // arrivati dall'elenco: l'indietro del browser lo ritrova nella stessa posizione
  const daElenco = (location.state as { daElenco?: boolean } | null)?.daElenco === true

  useEffect(() => {
    memoriaArtisti.ultimo = slug
  }, [slug])

  const notaPer = useMemo(
    () => (oggetto: Oggetto) => {
      const altri = coautori(oggetto, slug)
      return oggetto.artisti.length > 1 && altri.length > 0 ? `con ${elencoNomi(altri.map((a) => a.nome))}` : undefined
    },
    [slug],
  )

  if (nonTrovato) {
    return (
      <PaginaAnimata className="min-h-[70vh] px-4">
        <StatoVuoto
          icona={<Palette aria-hidden className="size-16" />}
          titolo="Artista non trovato"
          testo="Non c'è un artista con questo nome."
          azione={
            <LinkBottone to="/artisti" variante="primario" dimensione="lg">
              Torna agli artisti
            </LinkBottone>
          }
        />
      </PaginaAnimata>
    )
  }

  const nome = artista?.nome ?? ''
  const numeroCarte = data?.length ?? artista?.carte

  return (
    <PaginaAnimata className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Button variante="chiaro" dimensione="sm" onClick={() => (daElenco ? navigate(-1) : navigate('/artisti'))}>
          <ArrowLeft aria-hidden className="size-4" />
          Artisti
        </Button>
      </div>

      <header className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {artista && <AvatarArtista artista={artista} dimensione="grande" />}
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-accento">Artista</p>
          <h1 className="text-4xl font-bold text-testo">{nome}</h1>
          {numeroCarte !== undefined && (
            <p className="mt-1 text-testo/70">{numeroCarte === 1 ? '1 carta' : `${numeroCarte} carte`}</p>
          )}
          {slug === SLUG_SCONOSCIUTO && (
            <p className="mt-2 max-w-xl text-sm text-testo/70">
              Soprattutto carte recenti a cui pokemontcg.io non ha ancora assegnato un artista, più Energie e Allenatori.
            </p>
          )}
        </div>
        {/* barra presente = utente loggato. Artista sconosciuto: non è un artista vero, niente checklist */}
        {barra && slug !== SLUG_SCONOSCIUTO && data && data.length > 0 && (
          <Button variante="chiaro" dimensione="sm" onClick={() => setChecklistAperta(true)} className="sm:ml-auto">
            <BookPlus aria-hidden className="size-4" />
            Crea binder checklist
          </Button>
        )}
      </header>

      {data && slug !== SLUG_SCONOSCIUTO && (
        <ModaleBinder
          aperta={checklistAperta}
          binder={null}
          checklist={{ artista: slug, nome, carte: data.length }}
          onChiudi={() => setChecklistAperta(false)}
          onCreato={(binder) => navigate(`/binder/${binder.id}`)}
        />
      )}

      {barra && <BarraCollezione {...barra} />}

      <GrigliaCartePaginata
        chiave={`artista-${slug}`}
        carte={carte}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        refetch={refetch}
        avvisoCaricamento={`Stiamo raccogliendo le carte di ${nome || "quest'artista"}: la prima volta può volerci fino a un minuto…`}
        erroreGenerico={`Non è stato possibile caricare le carte di ${nome || "quest'artista"}.`}
        vuoto={{
          icona: <Palette aria-hidden className="size-16" />,
          titolo: 'Nessuna carta',
          testo: `Non ci sono ancora carte di ${nome || "quest'artista"}.`,
        }}
        isPreferito={isPreferito}
        onTogglePreferito={toggle}
        onApri={apri}
        cartaAperta={aperta}
        collezione={collezione}
        vuotoFiltro={vuotoFiltro}
        notaPer={notaPer}
      />

      <ModaleCarta {...modale} />
    </PaginaAnimata>
  )
}
