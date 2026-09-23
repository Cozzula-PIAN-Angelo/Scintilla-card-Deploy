import { api } from '../../app/api'
import type { Oggetto } from '../../types/api'

export const pokedexApi = api.injectEndpoints({
  endpoints: (build) => ({
    // alla prima apertura il backend importa da pokemontcg.io tutte le carte del Pokémon: la risposta
    // può richiedere qualche secondo, e se l'API esterna è giù arriva un 502 che si ritenta
    getCartePokemon: build.query<Oggetto[], number>({
      query: (numero) => `/pokedex/${numero}/carte`,
      providesTags: ['Oggetti'],
      extraOptions: { maxRetries: 2 },
    }),
  }),
})

export const { useGetCartePokemonQuery } = pokedexApi
