import { api } from '../../app/api'
import type { Pagina, Utente } from '../../types/api'

export const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    getUtenti: build.query<Pagina<Utente>, { page: number; size: number }>({
      query: (params) => ({ url: '/utenti', params }),
      providesTags: ['Utenti'],
    }),
    // 'Me': se l'admin cambia i propri ruoli, il profilo in memoria va ricaricato
    assegnaAdmin: build.mutation<void, string>({
      query: (idUtente) => ({ url: `/utenti/${idUtente}/ruoli/admin`, method: 'POST' }),
      invalidatesTags: ['Utenti', 'Me'],
    }),
    revocaAdmin: build.mutation<void, string>({
      query: (idUtente) => ({ url: `/utenti/${idUtente}/ruoli/admin`, method: 'DELETE' }),
      invalidatesTags: ['Utenti', 'Me'],
    }),
    // cancella (anonimizza) l'account di un utente: sparisce dall'elenco, i suoi dati restano anonimi
    cancellaUtente: build.mutation<void, string>({
      query: (idUtente) => ({ url: `/utenti/${idUtente}`, method: 'DELETE' }),
      invalidatesTags: ['Utenti'],
    }),
  }),
})

export const { useGetUtentiQuery, useAssegnaAdminMutation, useRevocaAdminMutation, useCancellaUtenteMutation } = adminApi
