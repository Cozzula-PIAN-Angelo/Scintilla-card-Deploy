import { api } from '../../app/api'
import type { DatiLogin, DatiRegistrazione, RispostaLogin, Utente } from '../../types/api'
import { tokenImpostato, tokenRinnovato, utenteCaricato } from './authSlice'

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<RispostaLogin, DatiLogin>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      // con il token nello slice, AuthBootstrap attiva subito la query /me
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(tokenImpostato(data.token))
        } catch {
          // errore mostrato dalla pagina di login
        }
      },
    }),
    registra: build.mutation<Utente, DatiRegistrazione>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    // cancella (anonimizza) il proprio account; la password conferma che è davvero il titolare
    cancellaAccount: build.mutation<void, { password: string }>({
      query: (body) => ({ url: '/me', method: 'DELETE', body }),
    }),
    // username ed email; la risposta aggiorna subito l'utente nello slice (navbar, menu)
    modificaAccount: build.mutation<Utente, { username: string; email: string; passwordAttuale: string }>({
      query: (body) => ({ url: '/me/account', method: 'PATCH', body }),
      invalidatesTags: ['Profilo'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(utenteCaricato(data))
        } catch {
          // errore mostrato dal form
        }
      },
    }),
    // il token vecchio non vale più: quello nuovo della risposta tiene dentro questa sessione
    cambiaPassword: build.mutation<RispostaLogin, { passwordAttuale: string; nuovaPassword: string }>({
      query: (body) => ({ url: '/me/password', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(tokenRinnovato(data.token))
        } catch {
          // errore mostrato dal form
        }
      },
    }),
    me: build.query<Utente, void>({
      query: () => '/me',
      providesTags: ['Me'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(utenteCaricato(data))
        } catch {
          // un 401 è già gestito dalla baseQuery; gli altri errori li mostrano le route protette
        }
      },
    }),
  }),
})

export const {
  useLoginMutation,
  useRegistraMutation,
  useLogoutMutation,
  useCancellaAccountMutation,
  useModificaAccountMutation,
  useCambiaPasswordMutation,
  useMeQuery,
} = authApi
