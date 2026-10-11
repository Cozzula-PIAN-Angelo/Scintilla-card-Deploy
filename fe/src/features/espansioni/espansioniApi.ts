import { api } from '../../app/api'
import type { Espansione, Oggetto } from '../../types/api'

export const espansioniApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEspansioni: build.query<Espansione[], void>({
      query: () => '/espansioni',
      providesTags: ['Espansioni'],
      extraOptions: { maxRetries: 2 },
    }),
    // alla prima apertura il backend importa il set da pokemontcg.io: la risposta può richiedere
    // qualche secondo. Niente maxRetries: il backend ritenta già da solo, e ogni nuova richiesta
    // consumerebbe un altro posto nel limite sugli import. Su un 502 resta il pulsante Riprova
    getCarteEspansione: build.query<Oggetto[], string>({
      query: (id) => `/espansioni/${encodeURIComponent(id)}/carte`,
      providesTags: ['Oggetti'],
    }),
  }),
})

export const { useGetEspansioniQuery, useGetCarteEspansioneQuery } = espansioniApi
