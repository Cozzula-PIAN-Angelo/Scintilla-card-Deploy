import { api } from '../../app/api'
import type { AnteprimaSet, CarteProgressive, Espansione, RichiestaCarte, StatoCarte } from '../../types/api'

export const espansioniApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEspansioni: build.query<Espansione[], void>({
      query: () => '/espansioni',
      providesTags: ['Espansioni'],
      extraOptions: { maxRetries: 2 },
    }),
    // vetrina della home: i set fisici più recenti già scaricati, con carte di punta e rarità. Si aggiorna con la descrizione
    getAnteprime: build.query<AnteprimaSet[], void>({
      query: () => '/espansioni/anteprime',
      providesTags: ['Espansioni'],
      extraOptions: { maxRetries: 2 },
    }),
    // la riga dei set digitali (TCG Pocket): al più quattro, senza hero
    getAnteprimeDigitali: build.query<AnteprimaSet[], void>({
      query: () => ({ url: '/espansioni/anteprime', params: { digitali: true } }),
      providesTags: ['Espansioni'],
      extraOptions: { maxRetries: 2 },
    }),
    // descrizione del set nella hero (solo admin); null o vuota la toglie
    modificaEspansione: build.mutation<Espansione, { id: string; descrizione: string | null }>({
      query: ({ id, descrizione }) => ({ url: `/espansioni/${encodeURIComponent(id)}`, method: 'PATCH', body: { descrizione } }),
      invalidatesTags: ['Espansioni'],
    }),
    // alla prima apertura il backend risponde a pezzi (la pagina chiesta, presa al volo da TCGdex) e scarica
    // il resto in background (vedi useCarteProgressive). Niente maxRetries: il backend ritenta già da solo.
    // Su un 502 resta il pulsante Riprova
    getCarteEspansione: build.query<CarteProgressive, RichiestaCarte<string>>({
      query: ({ chiave, pagina }) => ({
        url: `/espansioni/${encodeURIComponent(chiave)}/carte`,
        params: pagina === undefined ? undefined : { pagina },
      }),
      providesTags: ['Oggetti'],
    }),
    // a che punto è lo scaricamento in background: niente pagine, niente TCGdex (vedi useCarteProgressive)
    getStatoCarteEspansione: build.query<StatoCarte, string>({
      query: (chiave) => `/espansioni/${encodeURIComponent(chiave)}/carte/stato`,
    }),
  }),
})

export const {
  useGetEspansioniQuery,
  useGetAnteprimeQuery,
  useGetAnteprimeDigitaliQuery,
  useModificaEspansioneMutation,
  useGetCarteEspansioneQuery,
  useGetStatoCarteEspansioneQuery,
} = espansioniApi
