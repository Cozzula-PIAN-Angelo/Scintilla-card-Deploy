import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Button, LinkBottone } from '../components/Button'
import { GrigliaCartePaginata } from '../components/GrigliaCartePaginata'
import { ModaleCarta } from '../components/ModaleCarta'
import { PaginaAnimata } from '../components/PaginaAnimata'
import { StatoVuoto } from '../components/StatiPagina'
import { memoriaPokedex } from '../features/pokedex/memoriaPokedex'
import { generazioneDi, numeroFormattato, spriteUrl, trovaPokemon, type Pokemon } from '../features/pokedex/pokedex'
import { useGetCartePokemonQuery } from '../features/pokedex/pokedexApi'
import { usePreferiti } from '../features/preferiti/usePreferiti'
import { useTitolo } from '../hooks/useTitolo'
import type { Oggetto } from '../types/api'

// tutte le carte in cui compare un Pokémon, dalla più recente
export function PokemonPage() {
  const { numero: parametro } = useParams()
  const numero = Number(parametro)
  const pokemon = Number.isInteger(numero) ? trovaPokemon(numero) : undefined
  // currentData, non data: la pagina resta montata passando da un Pokémon all'altro, e data
  // conterrebbe ancora le carte del Pokémon precedente finché arrivano le nuove
  const { currentData: data, isFetching, isError, error, refetch } = useGetCartePokemonQuery(numero, { skip: !pokemon })
  const isLoading = data === undefined && !isError
  const { isPreferito, toggle } = usePreferiti()
  const [selezionato, setSelezionato] = useState<Oggetto | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
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

  const generazione = generazioneDi(pokemon.numero)
  const precedente = trovaPokemon(pokemon.numero - 1)
  const successivo = trovaPokemon(pokemon.numero + 1)
  const statoFrecce = { passiDalPokedex: passiDalPokedex === null ? null : passiDalPokedex + 1 }

  return (
    <PaginaAnimata className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Button variante="chiaro" dimensione="sm" onClick={tornaAlPokedex}>
          <ArrowLeft aria-hidden className="size-4" />
          Pokédex
        </Button>
        <nav aria-label="Pokémon vicini" className="flex gap-2">
          {precedente && <FrecciaPokemon pokemon={precedente} direzione="precedente" state={statoFrecce} />}
          {successivo && <FrecciaPokemon pokemon={successivo} direzione="successivo" state={statoFrecce} />}
        </nav>
      </div>

      <header className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="grid size-40 shrink-0 place-items-center rounded-3xl bg-white shadow-lg shadow-blu-900/10">
          <img src={spriteUrl(pokemon.numero)} alt="" width={96} height={96} className="sprite-pixel size-36" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-blu-500">
            {numeroFormattato(pokemon.numero)}
            {generazione && ` · Generazione ${generazione.sigla} · ${generazione.regione}`}
          </p>
          <h1 className="text-4xl font-bold text-blu-900">{pokemon.nome}</h1>
          <p className="mt-1 text-blu-900/70">
            {[pokemon.nomeInglese && `Sulle carte: ${pokemon.nomeInglese}`, data && (data.length === 1 ? '1 carta' : `${data.length} carte`)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      <GrigliaCartePaginata
        chiave={`pokemon-${pokemon.numero}`}
        carte={data}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        refetch={refetch}
        avvisoCaricamento={`Stiamo raccogliendo le carte di ${pokemon.nome}: la prima volta può volerci qualche secondo…`}
        erroreGenerico={`Non è stato possibile caricare le carte di ${pokemon.nome}.`}
        vuoto={{
          icona: <img src={spriteUrl(pokemon.numero)} alt="" className="sprite-pixel size-24" />,
          titolo: 'Nessuna carta',
          testo: `Non esistono ancora carte con ${pokemon.nome}.`,
        }}
        isPreferito={isPreferito}
        onTogglePreferito={toggle}
        onApri={setSelezionato}
      />

      <ModaleCarta
        oggetto={selezionato}
        preferito={selezionato ? isPreferito(selezionato.id) : false}
        onTogglePreferito={toggle}
        onChiudi={() => setSelezionato(null)}
      />
    </PaginaAnimata>
  )
}

interface PropsFreccia {
  pokemon: Pokemon
  direzione: 'precedente' | 'successivo'
  state: { passiDalPokedex: number | null }
}

// Pokémon precedente o successivo nel Pokédex, con il suo sprite
function FrecciaPokemon({ pokemon, direzione, state }: PropsFreccia) {
  const Icona = direzione === 'precedente' ? ChevronLeft : ChevronRight
  return (
    <Link
      to={`/pokedex/${pokemon.numero}`}
      state={state}
      aria-label={`Pokémon ${direzione}: ${pokemon.nome}`}
      className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-2 pr-3 text-sm font-semibold text-blu-700 shadow-md shadow-blu-900/10 transition-colors hover:bg-blu-50"
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
