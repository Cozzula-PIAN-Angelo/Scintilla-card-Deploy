import { api } from '../../app/api'
import type { DatiLogin, DatiRegistrazione, RispostaLogin, Utente } from '../../types/api'
import { tokenImpostato, utenteCaricato } from './authSlice'

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

export const { useLoginMutation, useRegistraMutation, useLogoutMutation, useCancellaAccountMutation, useMeQuery } = authApi
