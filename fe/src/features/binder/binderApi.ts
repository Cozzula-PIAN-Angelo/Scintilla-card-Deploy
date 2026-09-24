import { api } from '../../app/api'
import type { Binder, BinderDettaglio, DatiBinder, Oggetto, Pagina } from '../../types/api'

interface Posizione {
  pagina: number
  posizione: number
}

export const binderApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBinder: build.query<Binder[], void>({
      query: () => '/me/binder',
      providesTags: [{ type: 'Binder', id: 'LISTA' }],
    }),
    getBinderDettaglio: build.query<BinderDettaglio, string>({
      query: (id) => `/me/binder/${id}`,
      providesTags: (_risultato, _errore, id) => [{ type: 'Binder', id }],
    }),

    creaBinder: build.mutation<Binder, DatiBinder>({
      query: (body) => ({ url: '/me/binder', method: 'POST', body }),
      invalidatesTags: [{ type: 'Binder', id: 'LISTA' }],
    }),
    // il backend sostituisce tutte le impostazioni: si inviano sempre tutte
    modificaBinder: build.mutation<Binder, { id: string; dati: DatiBinder }>({
      query: ({ id, dati }) => ({ url: `/me/binder/${id}`, method: 'PATCH', body: dati }),
      invalidatesTags: (_risultato, _errore, { id }) => [{ type: 'Binder', id: 'LISTA' }, { type: 'Binder', id }],
    }),
    cancellaBinder: build.mutation<void, string>({
      query: (id) => ({ url: `/me/binder/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Binder', id: 'LISTA' }],
    }),

    // immagine già compressa dal browser: si inviano i byte, col loro Content-Type
    caricaImmagineBinder: build.mutation<Binder, { id: string; immagine: Blob }>({
      query: ({ id, immagine }) => ({
        url: `/me/binder/${id}/immagine`,
        method: 'POST',
        body: immagine,
        headers: { 'Content-Type': immagine.type },
      }),
      invalidatesTags: (_risultato, _errore, { id }) => [{ type: 'Binder', id: 'LISTA' }, { type: 'Binder', id }],
    }),
    rimuoviImmagineBinder: build.mutation<Binder, string>({
      query: (id) => ({ url: `/me/binder/${id}/immagine`, method: 'DELETE' }),
      invalidatesTags: (_risultato, _errore, id) => [{ type: 'Binder', id: 'LISTA' }, { type: 'Binder', id }],
    }),

    // Le tre operazioni sulle tasche aggiornano subito il binder aperto e tornano indietro
    // solo se la richiesta fallisce; la lista si ricarica per il conteggio delle carte
    inserisciCarta: build.mutation<void, { binderId: string; oggetto: Oggetto } & Posizione>({
      query: ({ binderId, pagina, posizione, oggetto }) => ({
        url: `/me/binder/${binderId}/slot`,
        method: 'POST',
        body: { pagina, posizione, oggettoId: oggetto.id },
      }),
      invalidatesTags: [{ type: 'Binder', id: 'LISTA' }],
      async onQueryStarted({ binderId, pagina, posizione, oggetto }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          binderApi.util.updateQueryData('getBinderDettaglio', binderId, (dettaglio) => {
            const esistente = dettaglio.slot.find((s) => s.pagina === pagina && s.posizione === posizione)
            if (esistente) esistente.oggetto = oggetto
            else dettaglio.slot.push({ pagina, posizione, oggetto })
          }),
        )
        queryFulfilled.catch(patch.undo)
      },
    }),
    svuotaTasca: build.mutation<void, { binderId: string } & Posizione>({
      query: ({ binderId, pagina, posizione }) => ({ url: `/me/binder/${binderId}/slot/${pagina}/${posizione}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Binder', id: 'LISTA' }],
      async onQueryStarted({ binderId, pagina, posizione }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          binderApi.util.updateQueryData('getBinderDettaglio', binderId, (dettaglio) => {
            dettaglio.slot = dettaglio.slot.filter((s) => s.pagina !== pagina || s.posizione !== posizione)
          }),
        )
        queryFulfilled.catch(patch.undo)
      },
    }),
    // arrivo occupato: le due carte si scambiano
    spostaCarta: build.mutation<void, { binderId: string; da: Posizione; a: Posizione }>({
      query: ({ binderId, da, a }) => ({
        url: `/me/binder/${binderId}/slot/sposta`,
        method: 'POST',
        body: { daPagina: da.pagina, daPosizione: da.posizione, aPagina: a.pagina, aPosizione: a.posizione },
      }),
      async onQueryStarted({ binderId, da, a }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          binderApi.util.updateQueryData('getBinderDettaglio', binderId, (dettaglio) => {
            const partenza = dettaglio.slot.find((s) => s.pagina === da.pagina && s.posizione === da.posizione)
            if (!partenza) return
            const arrivo = dettaglio.slot.find((s) => s.pagina === a.pagina && s.posizione === a.posizione)
            if (arrivo) {
              const carta = arrivo.oggetto
              arrivo.oggetto = partenza.oggetto
              partenza.oggetto = carta
            } else {
              partenza.pagina = a.pagina
              partenza.posizione = a.posizione
            }
          }),
        )
        queryFulfilled.catch(patch.undo)
      },
    }),

    // ricerca per nome nel catalogo, per il cassetto delle carte
    cercaCarte: build.query<Pagina<Oggetto>, { q: string; page: number }>({
      query: ({ q, page }) => ({ url: '/oggetti', params: { q, page, size: 24, sort: 'nome,asc' } }),
      providesTags: ['Oggetti'],
    }),
  }),
})

export const {
  useGetBinderQuery,
  useGetBinderDettaglioQuery,
  useCreaBinderMutation,
  useModificaBinderMutation,
  useCancellaBinderMutation,
  useCaricaImmagineBinderMutation,
  useRimuoviImmagineBinderMutation,
  useInserisciCartaMutation,
  useSvuotaTascaMutation,
  useSpostaCartaMutation,
  useCercaCarteQuery,
} = binderApi
