import { ArrowLeft, BookPlus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
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
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { useCartaSelezionata } from '../hooks/useCartaSelezionata'
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
  useTitolo(pokemon?.nome ?? 'Pokémon non trovato')

  // quante pagine di Pokémon ci sono nella cronologia dopo il Pokédex: 1 arrivando dall'indice,
  // +1 per ogni Pokémon aperto con le frecce; null con un link diretto
  const passiDalPokedex = (location.state as { passiDalPokedex?: number | null } | null)?.passiDalPokedex ?? null

  useEffect(() => {
    if (pokemon) memoriaPokedex.ultimo = pokemon.numero
  }, [pokemon])

  const tornaAlPokedex = () => {
    if (passiDalPokedex) navigate(-passiDalPokedex)
    else navigate('/pokedex')
  }

  if (!pokemon) {
    return (
      <PaginaAnimata className="min-h-[70vh] px-4">
        <StatoVuoto
          icona={<Sparkles aria-hidden className="size-16" />}
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

  // a pezzi il totale lo dice pokemontcg.io
  const numeroCarte = data?.length ?? risposta.totaleServer
  const generazione = generazioneDi(pokemon.numero)
  const precedente = trovaPokemon(pokemon.numero - 1)
  const successivo = trovaPokemon(pokemon.numero + 1)
  const statoFrecce = { passiDalPokedex: passiDalPokedex === null ? null : passiDalPokedex + 1 }
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

      <header className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="grid size-40 shrink-0 place-items-center rounded-3xl bg-superficie shadow-lg shadow-ombra/10">
          <img src={spriteUrl(pokemon.numero)} alt="" width={96} height={96} className="sprite-pixel size-36" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-accento">
            {numeroFormattato(pokemon.numero)}
            {generazione && ` · Generazione ${generazione.sigla} · ${generazione.regione}`}
          </p>
          <h1 className="text-4xl font-bold text-testo">{pokemon.nome}</h1>
          <p className="mt-1 text-testo/70">
            {[pokemon.nomeInglese && `Sulle carte: ${pokemon.nomeInglese}`, numeroCarte !== undefined && (numeroCarte === 1 ? '1 carta' : `${numeroCarte} carte`)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {/* collezione presente = utente loggato. A pezzi il bottone si vede ma aspetta tutte le carte */}
        {collezione && (risposta.aPezzi ? (risposta.totaleServer ?? 0) > 0 : data && data.length > 0) && (
          <Button
            variante="chiaro"
            dimensione="sm"
            onClick={() => setChecklistAperta(true)}
            className="sm:ml-auto"
            disabled={risposta.aPezzi}
            title={risposta.aPezzi ? 'Disponibile quando tutte le carte sono pronte' : undefined}
          >
            <BookPlus aria-hidden className="size-4" />
            Crea binder checklist
            {risposta.aPezzi && <span className="sr-only">: disponibile quando tutte le carte sono pronte</span>}
          </Button>
        )}
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
  state: { passiDalPokedex: number | null }
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
