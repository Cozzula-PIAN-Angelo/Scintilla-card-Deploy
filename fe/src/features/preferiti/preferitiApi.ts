import { api } from '../../app/api'
import { statoErrore } from '../../app/errori'
import type { Pagina, ParametriPagina, Preferito } from '../../types/api'

export const preferitiApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPreferitiIds: build.query<string[], void>({
      query: () => '/me/preferiti/ids',
      providesTags: ['PreferitiIds'],
    }),
    getPreferiti: build.query<Pagina<Preferito>, ParametriPagina>({
      query: (params) => ({ url: '/me/preferiti', params }),
      providesTags: ['Preferiti'],
    }),

    // aggiornamento ottimistico: il cuore cambia subito, e torna indietro solo se la richiesta fallisce
    aggiungiPreferito: build.mutation<Preferito, string>({
      query: (idOggetto) => ({ url: `/oggetti/${idOggetto}/preferiti`, method: 'POST' }),
      invalidatesTags: ['Preferiti'],
      async onQueryStarted(idOggetto, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          preferitiApi.util.updateQueryData('getPreferitiIds', undefined, (ids) => {
            if (!ids.includes(idOggetto)) ids.push(idOggetto)
          }),
        )
        try {
          await queryFulfilled
        } catch (risultato) {
          // 409: era già nei preferiti, lo stato ottimistico è corretto
          if (statoErrore((risultato as { error?: unknown }).error) !== 409) patch.undo()
        }
      },
    }),

    rimuoviPreferito: build.mutation<void, string>({
      query: (idOggetto) => ({ url: `/oggetti/${idOggetto}/preferiti`, method: 'DELETE' }),
      invalidatesTags: ['Preferiti'],
      async onQueryStarted(idOggetto, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          preferitiApi.util.updateQueryData('getPreferitiIds', undefined, (ids) =>
            ids.filter((id) => id !== idOggetto),
          ),
        )
        try {
          await queryFulfilled
        } catch (risultato) {
          // 404: non era più nei preferiti, lo stato ottimistico è corretto
          if (statoErrore((risultato as { error?: unknown }).error) !== 404) patch.undo()
        }
      },
    }),
  }),
})

export const {
  useGetPreferitiIdsQuery,
  useGetPreferitiQuery,
  useAggiungiPreferitoMutation,
  useRimuoviPreferitoMutation,
} = preferitiApi
