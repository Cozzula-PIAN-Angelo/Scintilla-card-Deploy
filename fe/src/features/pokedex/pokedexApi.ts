import { api } from '../../app/api'
import type { CarteProgressive, RichiestaCarte, StatoCarte } from '../../types/api'

export const pokedexApi = api.injectEndpoints({
  endpoints: (build) => ({
    // alla prima apertura il backend risponde a pezzi (la pagina chiesta, presa al volo da pokemontcg.io) e scarica
    // il resto in background (vedi useCarteProgressive). Niente maxRetries: il backend ritenta già da solo.
    // Su un 502 resta il pulsante Riprova
    getCartePokemon: build.query<CarteProgressive, RichiestaCarte<number>>({
      query: ({ chiave, pagina }) => ({
        url: `/pokedex/${chiave}/carte`,
        params: pagina === undefined ? undefined : { pagina },
      }),
      providesTags: ['Oggetti'],
    }),
    // a che punto è lo scaricamento in background: niente pagine, niente pokemontcg.io (vedi useCarteProgressive)
    getStatoCartePokemon: build.query<StatoCarte, number>({
      query: (chiave) => `/pokedex/${chiave}/carte/stato`,
    }),
  }),
})

export const { useGetCartePokemonQuery, useGetStatoCartePokemonQuery } = pokedexApi
