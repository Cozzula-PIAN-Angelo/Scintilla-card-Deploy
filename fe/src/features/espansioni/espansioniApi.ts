import { api } from '../../app/api'
import type { Espansione, Oggetto } from '../../types/api'

export const espansioniApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEspansioni: build.query<Espansione[], void>({
      query: () => '/espansioni',
      providesTags: ['Espansioni'],
      extraOptions: { maxRetries: 2 },
    }),
    // alla prima apertura il backend importa il set da pokemontcg.io: la risposta può
    // richiedere qualche secondo, e se l'API esterna è giù arriva un 502 che si ritenta
    getCarteEspansione: build.query<Oggetto[], string>({
      query: (id) => `/espansioni/${encodeURIComponent(id)}/carte`,
      providesTags: ['Oggetti'],
      extraOptions: { maxRetries: 2 },
    }),
  }),
})

export const { useGetEspansioniQuery, useGetCarteEspansioneQuery } = espansioniApi
