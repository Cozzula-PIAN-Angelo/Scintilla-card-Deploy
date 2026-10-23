import { api } from '../../app/api'
import type { DatiOggetto, Oggetto, Pagina, ParametriPagina, PrezziCarta } from '../../types/api'

export const oggettiApi = api.injectEndpoints({
  endpoints: (build) => ({
    // conImmagine: solo carte con un'immagine (hero e pagine di accesso)
    getOggetti: build.query<Pagina<Oggetto>, ParametriPagina & { conImmagine?: boolean }>({
      query: (params) => ({ url: '/oggetti', params }),
      providesTags: ['Oggetti'],
    }),
    // fascia di prezzo di Cardmarket nel dettaglio della carta (il backend la tiene qualche ora in memoria)
    getPrezziCarta: build.query<PrezziCarta, string>({
      query: (id) => `/oggetti/${id}/prezzi`,
    }),
    creaOggetto: build.mutation<Oggetto, DatiOggetto>({
      query: (body) => ({ url: '/oggetti', method: 'POST', body }),
      invalidatesTags: ['Statistiche', 'Oggetti'],
    }),
    modificaOggetto: build.mutation<Oggetto, { id: string; dati: Partial<DatiOggetto> }>({
      query: ({ id, dati }) => ({ url: `/oggetti/${id}`, method: 'PATCH', body: dati }),
      invalidatesTags: ['Statistiche', 'Oggetti', 'Preferiti'],
    }),
    // un oggetto cancellato sparisce anche dai preferiti e, se era una carta importata,
    // torna importabile nella ricerca
    cancellaOggetto: build.mutation<void, string>({
      query: (id) => ({ url: `/oggetti/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Statistiche', 'Oggetti', 'Preferiti', 'PreferitiIds', 'Ricerca'],
    }),
  }),
})

export const { useGetOggettiQuery, useGetPrezziCartaQuery, useCreaOggettoMutation, useModificaOggettoMutation, useCancellaOggettoMutation } =
  oggettiApi
