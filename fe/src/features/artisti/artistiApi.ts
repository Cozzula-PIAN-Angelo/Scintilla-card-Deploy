import { API_URL, api } from '../../app/api'
import type { Artista, CartaSimbolo, CarteProgressive, RichiestaCarte, StatoCarte, VetrinaArtisti } from '../../types/api'

export const artistiApi = api.injectEndpoints({
  endpoints: (build) => ({
    // elenco fisso (artisti.json del backend): cambia solo a ogni deploy
    getArtisti: build.query<Artista[], void>({
      query: () => '/artisti',
    }),
    // illustratori sul muro (cambiano ogni settimana) e le prime carte di ognuno per l'indice
    getVetrinaArtisti: build.query<VetrinaArtisti, void>({
      query: () => '/artisti/anteprime',
      providesTags: ['VetrinaArtisti'],
    }),
    // solo admin: la carta simbolo di un illustratore per il muro
    getCartaSimbolo: build.query<CartaSimbolo, string>({
      query: (slug) => `/artisti/${encodeURIComponent(slug)}/carta-simbolo`,
      providesTags: ['CartaSimbolo'],
    }),
    scegliCartaSimbolo: build.mutation<void, { slug: string; idEsterno: string }>({
      query: ({ slug, idEsterno }) => ({ url: `/artisti/${encodeURIComponent(slug)}/carta-simbolo`, method: 'PATCH', body: { idEsterno } }),
      onQueryStarted: (_, { dispatch, queryFulfilled }) => aggiornaMuro(queryFulfilled, dispatch),
    }),
    // torna la scelta automatica
    togliCartaSimbolo: build.mutation<void, string>({
      query: (slug) => ({ url: `/artisti/${encodeURIComponent(slug)}/carta-simbolo`, method: 'DELETE' }),
      onQueryStarted: (_, { dispatch, queryFulfilled }) => aggiornaMuro(queryFulfilled, dispatch),
    }),
    // alla prima apertura il backend risponde a pezzi (la pagina chiesta, presa al volo da TCGdex) e scarica
    // il resto in background (vedi useCarteProgressive). Niente maxRetries: il backend ritenta già da solo.
    // Su un 502 resta il pulsante Riprova
    getCarteArtista: build.query<CarteProgressive, RichiestaCarte<string>>({
      query: ({ chiave, pagina }) => ({
        url: `/artisti/${encodeURIComponent(chiave)}/carte`,
        params: pagina === undefined ? undefined : { pagina },
      }),
      providesTags: ['Oggetti'],
    }),
    // a che punto è lo scaricamento in background: niente pagine, niente TCGdex (vedi useCarteProgressive)
    getStatoCarteArtista: build.query<StatoCarte, string>({
      query: (chiave) => `/artisti/${encodeURIComponent(chiave)}/carte/stato`,
    }),
  }),
})

export const {
  useGetArtistiQuery,
  useGetCarteArtistaQuery,
  useGetStatoCarteArtistaQuery,
  useGetVetrinaArtistiQuery,
  useGetCartaSimboloQuery,
  useScegliCartaSimboloMutation,
  useTogliCartaSimboloMutation,
} = artistiApi

// dopo una scelta dell'admin: il browser tiene il muro un'ora (Cache-Control di /artisti/anteprime), quindi prima
// lo si riscarica davvero, poi la pagina lo rilegge
async function aggiornaMuro(fatto: Promise<unknown>, dispatch: (azione: unknown) => unknown) {
  try {
    await fatto
  } catch {
    return
  }
  await fetch(`${API_URL}/artisti/anteprime`, { cache: 'reload' }).catch(() => undefined)
  dispatch(artistiApi.util.invalidateTags(['VetrinaArtisti', 'CartaSimbolo']))
}
