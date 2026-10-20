import { api, API_URL } from '../../app/api'
import type { Profilo } from '../../types/api'

// immagine profilo pubblica: con la versione nell'URL il browser la tiene in cache finché non cambia
export function avatarUrl(idUtente: string, versione: string): string {
  return `${API_URL}/avatar/${idUtente}?v=${encodeURIComponent(versione)}`
}

// le liste si inviano intere e ordinate e sostituiscono quelle salvate (PATCH: il CORS non ammette PUT)
export const profiloApi = api.injectEndpoints({
  endpoints: (build) => ({
    // anche Statistiche: binder e collezione la invalidano già, e il riepilogo del profilo ne dipende
    getProfilo: build.query<Profilo, void>({
      query: () => '/me/profilo',
      providesTags: ['Profilo', 'Statistiche'],
    }),
    modificaProfilo: build.mutation<Profilo, { bio: string | null; colore: string | null }>({
      query: (body) => ({ url: '/me/profilo', method: 'PATCH', body }),
      invalidatesTags: ['Profilo'],
    }),
    salvaVetrina: build.mutation<Profilo, string[]>({
      query: (ids) => ({ url: '/me/profilo/vetrina', method: 'PATCH', body: { ids } }),
      invalidatesTags: ['Profilo'],
    }),
    salvaBinderEvidenza: build.mutation<Profilo, string[]>({
      query: (ids) => ({ url: '/me/profilo/binder', method: 'PATCH', body: { ids } }),
      invalidatesTags: ['Profilo'],
    }),
    salvaSquadra: build.mutation<Profilo, number[]>({
      query: (numeri) => ({ url: '/me/profilo/squadra', method: 'PATCH', body: { numeri } }),
      invalidatesTags: ['Profilo'],
    }),
    // immagine già ritagliata e compressa dal browser: si inviano i byte, col loro Content-Type.
    // Anche Me: la navbar mostra la nuova immagine
    caricaAvatar: build.mutation<Profilo, Blob>({
      query: (immagine) => ({ url: '/me/profilo/avatar', method: 'POST', body: immagine, headers: { 'Content-Type': immagine.type } }),
      invalidatesTags: ['Profilo', 'Me'],
    }),
    rimuoviAvatar: build.mutation<Profilo, void>({
      query: () => ({ url: '/me/profilo/avatar', method: 'DELETE' }),
      invalidatesTags: ['Profilo', 'Me'],
    }),
  }),
})

export const {
  useGetProfiloQuery,
  useModificaProfiloMutation,
  useSalvaVetrinaMutation,
  useSalvaBinderEvidenzaMutation,
  useSalvaSquadraMutation,
  useCaricaAvatarMutation,
  useRimuoviAvatarMutation,
} = profiloApi
