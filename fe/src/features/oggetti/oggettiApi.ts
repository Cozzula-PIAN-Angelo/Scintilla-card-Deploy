import { api } from '../../app/api'
import type { DatiOggetto, Oggetto, Pagina, ParametriPagina } from '../../types/api'

export const oggettiApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOggetti: build.query<Pagina<Oggetto>, ParametriPagina>({
      query: (params) => ({ url: '/oggetti', params }),
      providesTags: ['Oggetti'],
    }),
    creaOggetto: build.mutation<Oggetto, DatiOggetto>({
      query: (body) => ({ url: '/oggetti', method: 'POST', body }),
      invalidatesTags: ['Oggetti'],
    }),
    modificaOggetto: build.mutation<Oggetto, { id: string; dati: Partial<DatiOggetto> }>({
      query: ({ id, dati }) => ({ url: `/oggetti/${id}`, method: 'PATCH', body: dati }),
      invalidatesTags: ['Oggetti', 'Preferiti'],
    }),
    // un oggetto cancellato sparisce anche dai preferiti e, se era una carta importata,
    // torna importabile nella ricerca
    cancellaOggetto: build.mutation<void, string>({
      query: (id) => ({ url: `/oggetti/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Oggetti', 'Preferiti', 'PreferitiIds', 'Ricerca'],
    }),
  }),
})

export const { useGetOggettiQuery, useCreaOggettoMutation, useModificaOggettoMutation, useCancellaOggettoMutation } =
  oggettiApi
