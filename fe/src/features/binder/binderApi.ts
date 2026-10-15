import { api } from '../../app/api'
import type { Binder, BinderDettaglio, CriterioOrdine, DatiBinder, Oggetto, Pagina, SlotBinder } from '../../types/api'
import { inserisci, sposta, togli, type Posizione } from './disposizione'

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

    // la nuova disposizione arriva dal server: niente aggiornamento anticipato
    riordinaBinder: build.mutation<SlotBinder[], { binderId: string; criterio: CriterioOrdine }>({
      query: ({ binderId, criterio }) => ({ url: `/me/binder/${binderId}/riordina`, method: 'POST', body: { criterio } }),
      async onQueryStarted({ binderId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(binderApi.util.updateQueryData('getBinderDettaglio', binderId, (dettaglio) => { dettaglio.slot = data }))
        } catch {
          // l'errore lo mostra chi ha chiamato
        }
      },
    }),
    // rimette tutte le tasche com'erano (Annulla del riordino)
    ripristinaBinder: build.mutation<SlotBinder[], { binderId: string; slot: SlotBinder[] }>({
      query: ({ binderId, slot }) => ({
        url: `/me/binder/${binderId}/slot`,
        method: 'PATCH',
        body: slot.map((s) => ({ pagina: s.pagina, posizione: s.posizione, oggettoId: s.oggetto.id })),
      }),
      // tra riordino e Annulla possono essere entrate o uscite carte: il conteggio nella lista cambia
      invalidatesTags: [{ type: 'Binder', id: 'LISTA' }],
      async onQueryStarted({ binderId, slot }, { dispatch, queryFulfilled }) {
        const patch = dispatch(binderApi.util.updateQueryData('getBinderDettaglio', binderId, (dettaglio) => { dettaglio.slot = slot }))
        queryFulfilled.catch(patch.undo)
      },
    }),

    // Le tre operazioni sulle tasche aggiornano subito il binder aperto e tornano indietro
    // solo se la richiesta fallisce; la lista si ricarica per il conteggio delle carte. Dopo un inserimento
    // si rilegge anche il binder: il dettaglio porta le copie possedute della carta nuova
    // con faiSpazio le regole sono quelle di disposizione.ts, le stesse del backend
    inserisciCarta: build.mutation<void, { binderId: string; oggetto: Oggetto; faiSpazio?: boolean } & Posizione>({
      query: ({ binderId, pagina, posizione, oggetto, faiSpazio }) => ({
        url: `/me/binder/${binderId}/slot`,
        method: 'POST',
        body: { pagina, posizione, oggettoId: oggetto.id, faiSpazio },
      }),
      invalidatesTags: (_risultato, _errore, { binderId }) => [{ type: 'Binder', id: 'LISTA' }, { type: 'Binder', id: binderId }],
      async onQueryStarted({ binderId, pagina, posizione, oggetto, faiSpazio }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          binderApi.util.updateQueryData('getBinderDettaglio', binderId, (dettaglio) => {
            if (faiSpazio) {
              const { tasche, pagine } = dettaglio.binder
              dettaglio.slot = inserisci(dettaglio.slot, tasche, pagine, { pagina, posizione }, oggetto) ?? dettaglio.slot
              return
            }
            const esistente = dettaglio.slot.find((s) => s.pagina === pagina && s.posizione === posizione)
            if (esistente) esistente.oggetto = oggetto
            else dettaglio.slot.push({ pagina, posizione, oggetto })
          }),
        )
        queryFulfilled.catch(patch.undo)
      },
    }),
    svuotaTasca: build.mutation<void, { binderId: string; faiSpazio?: boolean } & Posizione>({
      query: ({ binderId, pagina, posizione, faiSpazio }) => ({
        url: `/me/binder/${binderId}/slot/${pagina}/${posizione}`,
        method: 'DELETE',
        params: faiSpazio ? { faiSpazio } : undefined,
      }),
      // il dettaglio si rilegge a operazioni finite: una GET partita prima non sovrascrive la modifica
      invalidatesTags: (_risultato, _errore, { binderId }) => [{ type: 'Binder', id: 'LISTA' }, { type: 'Binder', id: binderId }],
      async onQueryStarted({ binderId, pagina, posizione, faiSpazio }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          binderApi.util.updateQueryData('getBinderDettaglio', binderId, (dettaglio) => {
            if (faiSpazio) {
              dettaglio.slot = togli(dettaglio.slot, dettaglio.binder.tasche, dettaglio.binder.pagine, { pagina, posizione })
              return
            }
            dettaglio.slot = dettaglio.slot.filter((s) => s.pagina !== pagina || s.posizione !== posizione)
          }),
        )
        queryFulfilled.catch(patch.undo)
      },
    }),
    // arrivo occupato: le due carte si scambiano; con faiSpazio la carta si mette prima di quella d'arrivo
    spostaCarta: build.mutation<void, { binderId: string; da: Posizione; a: Posizione; faiSpazio?: boolean }>({
      query: ({ binderId, da, a, faiSpazio }) => ({
        url: `/me/binder/${binderId}/slot/sposta`,
        method: 'POST',
        body: { daPagina: da.pagina, daPosizione: da.posizione, aPagina: a.pagina, aPosizione: a.posizione, faiSpazio },
      }),
      invalidatesTags: (_risultato, _errore, { binderId }) => [{ type: 'Binder', id: binderId }],
      async onQueryStarted({ binderId, da, a, faiSpazio }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          binderApi.util.updateQueryData('getBinderDettaglio', binderId, (dettaglio) => {
            if (faiSpazio) {
              dettaglio.slot = sposta(dettaglio.slot, dettaglio.binder.tasche, dettaglio.binder.pagine, da, a)
              return
            }
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

    // ricerca per nome nel catalogo, per il cassetto delle carte. Non chiamarlo cercaCarte: quel nome
    // è già di carteApi (ricerca admin su pokemontcg.io) e RTK Query terrebbe solo il primo registrato
    cercaCatalogo: build.query<Pagina<Oggetto>, { q: string; page: number }>({
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
  useRiordinaBinderMutation,
  useRipristinaBinderMutation,
  useCercaCatalogoQuery,
} = binderApi
