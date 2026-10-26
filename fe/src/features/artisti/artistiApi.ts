import { api } from '../../app/api'
import type { Artista, CarteProgressive, RichiestaCarte, StatoCarte, VetrinaArtisti } from '../../types/api'

export const artistiApi = api.injectEndpoints({
  endpoints: (build) => ({
    // elenco fisso (artisti.json del backend): cambia solo a ogni deploy
    getArtisti: build.query<Artista[], void>({
      query: () => '/artisti',
    }),
    // illustratori sul muro (cambiano ogni settimana) e le prime carte di ognuno per l'indice
    getVetrinaArtisti: build.query<VetrinaArtisti, void>({
      query: () => '/artisti/anteprime',
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

export const { useGetArtistiQuery, useGetCarteArtistaQuery, useGetStatoCarteArtistaQuery, useGetVetrinaArtistiQuery } = artistiApi
