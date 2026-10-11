import { api } from '../../app/api'
import type { Oggetto } from '../../types/api'

export const pokedexApi = api.injectEndpoints({
  endpoints: (build) => ({
    // alla prima apertura il backend importa da pokemontcg.io tutte le carte del Pokémon: la risposta
    // può richiedere qualche secondo. Niente maxRetries: il backend ritenta già da solo, e ogni nuova
    // richiesta consumerebbe un altro posto nel limite sugli import. Su un 502 resta il pulsante Riprova
    getCartePokemon: build.query<Oggetto[], number>({
      query: (numero) => `/pokedex/${numero}/carte`,
      providesTags: ['Oggetti'],
    }),
  }),
})

export const { useGetCartePokemonQuery } = pokedexApi
