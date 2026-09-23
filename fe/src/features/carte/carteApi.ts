import { api } from '../../app/api'
import { statoErrore } from '../../app/errori'
import type { CartaEsterna, Oggetto, Pagina } from '../../types/api'

export interface ParametriRicerca {
  nome: string
  page: number
  size: number
}

export const carteApi = api.injectEndpoints({
  endpoints: (build) => ({
    cercaCarte: build.query<Pagina<CartaEsterna>, ParametriRicerca>({
      query: (params) => ({ url: '/carte/ricerca', params }),
      providesTags: ['Ricerca'],
      extraOptions: { maxRetries: 2 },
    }),

    importaCarta: build.mutation<Oggetto, { idEsterno: string; prezzo?: number }>({
      query: ({ idEsterno, prezzo }) => ({
        url: `/carte/importa/${encodeURIComponent(idEsterno)}`,
        method: 'POST',
        body: prezzo === undefined ? undefined : { prezzo },
      }),
      extraOptions: { maxRetries: 2 },
      invalidatesTags: ['Oggetti'],
      // la carta diventa subito "Nel catalogo" in tutte le ricerche in cache, senza rifare la chiamata esterna
      async onQueryStarted({ idEsterno }, { dispatch, queryFulfilled, getState }) {
        try {
          await queryFulfilled
        } catch (risultato) {
          // 409: era già stata importata, va segnata comunque
          if (statoErrore((risultato as { error?: unknown }).error) !== 409) return
        }
        for (const { endpointName, originalArgs } of carteApi.util.selectInvalidatedBy(getState(), ['Ricerca'])) {
          if (endpointName !== 'cercaCarte') continue
          dispatch(
            carteApi.util.updateQueryData('cercaCarte', originalArgs as ParametriRicerca, (pagina) => {
              const carta = pagina.content.find((c) => c.idEsterno === idEsterno)
              if (carta) carta.giaImportata = true
            }),
          )
        }
      },
    }),
  }),
})

export const { useCercaCarteQuery, useImportaCartaMutation } = carteApi
