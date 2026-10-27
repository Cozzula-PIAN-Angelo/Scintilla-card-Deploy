import { ArrowLeft, BookPlus, ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Button, LinkBottone } from '../components/Button'
import { GrigliaCartePaginata } from '../components/GrigliaCartePaginata'
import { ModaleCarta } from '../components/ModaleCarta'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { StatoVuoto } from '../components/StatiPagina'
import { ModaleBinder } from '../features/binder/ModaleBinder'
import { BarraCollezione } from '../features/collezione/BarraCollezione'
import { AvvisoCarteInArrivo } from '../features/collezione/AvvisoCarteInArrivo'
import { useCollezionePagina } from '../features/collezione/useCollezionePagina'
import { useCarteProgressive } from '../features/oggetti/useCarteProgressive'
import { memoriaPokedex } from '../features/pokedex/memoriaPokedex'
import { generazioneDi, numeroFormattato, spriteUrl, trovaPokemon, type Pokemon } from '../features/pokedex/pokedex'
import { useGetCartePokemonQuery, useGetStatoCartePokemonQuery } from '../features/pokedex/pokedexApi'
import { StatoCollezione, TitoloPokemon } from '../features/pokedex/IntestazioneScheda'
import { Pedana } from '../features/pokedex/Pedana'
import { usePokemonPosseduti } from '../features/pokedex/usePokemonPosseduti'
import { VentaglioCarte } from '../features/pokedex/VentaglioCarte'
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { useCartaSelezionata } from '../hooks/useCartaSelezionata'
import { useRitornoElenco, type StatoRitorno } from '../hooks/useRitornoElenco'
import { useTitolo } from '../hooks/useTitolo'

// tutte le carte in cui compare un Pokémon, dalla più recente
export function PokemonPage() {
  const { numero: parametro } = useParams()
  const numero = Number(parametro)
  const pokemon = Number.isInteger(numero) ? trovaPokemon(numero) : undefined
  // currentData, non data: la pagina resta montata passando da un Pokémon all'altro, e data
  // conterrebbe ancora le carte del Pokémon precedente finché arrivano le nuove
  const risposta = useCarteProgressive(useGetCartePokemonQuery, useGetStatoCartePokemonQuery, numero, { skip: !pokemon })
  const { isLoading, isFetching, isError, error, refetch } = risposta
  // lista intera solo quando tutte le carte sono scaricate: barra, filtri e binder ne hanno bisogno
  const data = risposta.aPezzi ? undefined : risposta.carte
  const { isPreferito, toggle } = usePreferiti()
  const filtroPagina = useMemo(() => (pokemon ? { pokemon: pokemon.numero } : null), [pokemon])
  const { collezione, carte, barra, vuotoFiltro } = useCollezionePagina(filtroPagina, data)
  const carteGriglia = risposta.aPezzi ? risposta.carte : carte
  const { apri, aperta, modale } = useCartaSelezionata({ isPreferito, toggle }, collezione, carteGriglia)
  const location = useLocation()
  const navigate = useNavigate()
  const [checklistAperta, setChecklistAperta] = useState(false)
  const posseduti = usePokemonPosseduti()
  useTitolo(pokemon?.nome ?? 'Pokémon non trovato')

  const { torna: tornaAlPokedex, statoAvanti: statoFrecce } = useRitornoElenco('/pokedex')

  useEffect(() => {
    if (pokemon) memoriaPokedex.ultimo = pokemon.numero
  }, [pokemon])

  if (!pokemon) {
    return (
      <PaginaAnimata className="min-h-[70vh] px-4">
        <StatoVuoto
          icona={<SearchX aria-hidden className="size-16" />}
          titolo="Pokémon non trovato"
          testo="Nel Pokédex non c'è un Pokémon con questo numero."
          azione={
            <LinkBottone to="/pokedex" variante="primario" dimensione="lg">
              Torna al Pokédex
            </LinkBottone>
          }
        />
      </PaginaAnimata>
    )
  }

  // a pezzi il totale lo dice TCGdex
  const numeroCarte = data?.length ?? risposta.totaleServer
  const generazione = generazioneDi(pokemon.numero)
  const preso = posseduti?.insieme.has(pokemon.numero) ?? false
  const precedente = trovaPokemon(pokemon.numero - 1)
  const successivo = trovaPokemon(pokemon.numero + 1)
  // il filtro della collezione segue le frecce, la pagina no: ogni Pokémon riparte dalla prima
  const filtro = new URLSearchParams(location.search).get('filtro')
  const ricercaFrecce = filtro ? `?${new URLSearchParams({ filtro })}` : ''

  return (
    <PaginaAnimata className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Button variante="chiaro" dimensione="sm" onClick={tornaAlPokedex}>
          <ArrowLeft aria-hidden className="size-4" />
          Pokédex
        </Button>
        <nav aria-label="Pokémon vicini" className="flex gap-2">
          {precedente && <FrecciaPokemon pokemon={precedente} direzione="precedente" ricerca={ricercaFrecce} state={statoFrecce} />}
          {successivo && <FrecciaPokemon pokemon={successivo} direzione="successivo" ricerca={ricercaFrecce} state={statoFrecce} />}
        </nav>
      </div>

      {/* la scheda del Pokédex dei giochi, in grande: sprite animato sulla pedana, nome e se ce l'hai */}
      <header className="sfondo-hero animate-gradiente relative mb-10 grid items-center gap-6 overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-ombra/25 sm:grid-cols-[auto_1fr] sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:gap-10">
        <Pedana numero={pokemon.numero} sagoma={posseduti !== null && !preso} className="h-56 justify-self-center sm:h-64 lg:h-72" />
        <div className="min-w-0">
          <TitoloPokemon
            pokemon={pokemon}
            livello="h1"
            dettagli={[
              generazione && `Generazione ${generazione.sigla} · ${generazione.regione}`,
              pokemon.nomeInglese && `Sulle carte: ${pokemon.nomeInglese}`,
              numeroCarte !== undefined && (numeroCarte === 1 ? '1 carta' : `${numeroCarte} carte`),
            ]}
          />
          {posseduti && <StatoCollezione preso={preso} className="mt-4" />}
          {/* collezione presente = utente loggato. A pezzi il bottone si vede ma aspetta tutte le carte */}
          {collezione && (risposta.aPezzi ? (risposta.totaleServer ?? 0) > 0 : data && data.length > 0) && (
            <Button
              variante="secondario"
              onClick={() => setChecklistAperta(true)}
              className="mt-6"
              disabled={risposta.aPezzi}
              title={risposta.aPezzi ? 'Disponibile quando tutte le carte sono pronte' : undefined}
            >
              <BookPlus aria-hidden className="size-4" />
              Crea binder checklist
              {risposta.aPezzi && <span className="sr-only">: disponibile quando tutte le carte sono pronte</span>}
            </Button>
          )}
        </div>
        {/* da desktop le ultime carte a ventaglio, come nella scheda dell'indice; sotto c'è la griglia intera */}
        <VentaglioCarte carte={risposta.carte ?? []} inAttesa={isLoading} className="hidden pr-4 lg:flex" />
      </header>

      {data && (
        <ModaleBinder
          aperta={checklistAperta}
          binder={null}
          checklist={{ numeroPokedex: pokemon.numero, nome: pokemon.nome, carte: data.length }}
          onChiudi={() => setChecklistAperta(false)}
          onCreato={(binder) => navigate(`/binder/${binder.id}`)}
        />
      )}

      {risposta.aPezzi ? <AvvisoCarteInArrivo fallito={risposta.fallito} /> : barra && <BarraCollezione {...barra} />}

      <GrigliaCartePaginata
        chiave={`pokemon-${pokemon.numero}`}
        carte={carteGriglia}
        totaleServer={risposta.totaleServer}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        refetch={refetch}
        erroreGenerico={`Non è stato possibile caricare le carte di ${pokemon.nome}.`}
        vuoto={{
          icona: <img src={spriteUrl(pokemon.numero)} alt="" className="sprite-pixel size-24" />,
          titolo: 'Nessuna carta',
          testo: `Non esistono ancora carte con ${pokemon.nome}.`,
        }}
        isPreferito={isPreferito}
        onTogglePreferito={toggle}
        onApri={apri}
        cartaAperta={aperta}
        collezione={collezione}
        vuotoFiltro={vuotoFiltro}
      />

      <ModaleCarta {...modale} />
    </PaginaAnimata>
  )
}

interface PropsFreccia {
  pokemon: Pokemon
  direzione: 'precedente' | 'successivo'
  // query string da portare nel link (il filtro della collezione), vuota se non c'è
  ricerca: string
  state: StatoRitorno
}

// Pokémon precedente o successivo nel Pokédex, con il suo sprite
function FrecciaPokemon({ pokemon, direzione, ricerca, state }: PropsFreccia) {
  const Icona = direzione === 'precedente' ? ChevronLeft : ChevronRight
  return (
    <Link
      to={`/pokedex/${pokemon.numero}${ricerca}`}
      state={state}
      aria-label={`Pokémon ${direzione}: ${pokemon.nome}`}
      className="flex items-center gap-1.5 rounded-full bg-superficie py-1 pl-2 pr-3 text-sm font-semibold text-testo-2 shadow-md shadow-ombra/10 transition-colors hover:bg-tenue"
    >
      {direzione === 'precedente' && <Icona aria-hidden className="size-4" />}
      <img src={spriteUrl(pokemon.numero)} alt="" width={96} height={96} className="sprite-pixel size-8" />
      <span className="hidden sm:inline">
        {numeroFormattato(pokemon.numero)} {pokemon.nome}
      </span>
      {direzione === 'successivo' && <Icona aria-hidden className="size-4" />}
    </Link>
  )
}
