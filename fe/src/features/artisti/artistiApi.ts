import { api } from '../../app/api'
import type { Artista, Oggetto } from '../../types/api'

export const artistiApi = api.injectEndpoints({
  endpoints: (build) => ({
    // elenco fisso (artisti.json del backend): cambia solo a ogni deploy
    getArtisti: build.query<Artista[], void>({
      query: () => '/artisti',
    }),
    // alla prima apertura il backend importa da pokemontcg.io tutte le carte dell'artista: la risposta
    // può richiedere fino a un minuto. Niente maxRetries: il backend ritenta già da solo, e ogni nuova
    // richiesta consumerebbe un altro posto nel limite sugli import. Su un 502 resta il pulsante Riprova
    getCarteArtista: build.query<Oggetto[], string>({
      query: (slug) => `/artisti/${encodeURIComponent(slug)}/carte`,
      providesTags: ['Oggetti'],
    }),
  }),
})

export const { useGetArtistiQuery, useGetCarteArtistaQuery } = artistiApi
