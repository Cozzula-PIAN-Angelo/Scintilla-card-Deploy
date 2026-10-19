import { api } from '../../app/api'
import type { CarteProgressive, Espansione, RichiestaCarte } from '../../types/api'

export const espansioniApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEspansioni: build.query<Espansione[], void>({
      query: () => '/espansioni',
      providesTags: ['Espansioni'],
      extraOptions: { maxRetries: 2 },
    }),
    // alla prima apertura il backend risponde a pezzi (la pagina chiesta, presa al volo da pokemontcg.io) e scarica
    // il resto in background (vedi useCarteProgressive). Niente maxRetries: il backend ritenta già da solo.
    // Su un 502 resta il pulsante Riprova
    getCarteEspansione: build.query<CarteProgressive, RichiestaCarte<string>>({
      query: ({ chiave, pagina }) => ({
        url: `/espansioni/${encodeURIComponent(chiave)}/carte`,
        params: pagina === undefined ? undefined : { pagina },
      }),
      providesTags: ['Oggetti'],
    }),
  }),
})

export const { useGetEspansioniQuery, useGetCarteEspansioneQuery } = espansioniApi
