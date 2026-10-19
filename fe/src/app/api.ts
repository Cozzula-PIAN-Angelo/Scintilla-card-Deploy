import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { sessioneScaduta } from '../features/auth/authSlice'
import { sessioneDaChiudere } from './sessione'

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const baseQueryGrezza = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const { token } = (getState() as { auth: { token: string | null } }).auth
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// L'API esterna delle carte fallisce spesso in modo casuale (il backend risponde 502):
// si ritenta solo quel caso, e solo per gli endpoint che lo chiedono con extraOptions.maxRetries
const baseQueryConRetry = retry(baseQueryGrezza, {
  retryCondition: (errore, _args, { attempt, extraOptions }) => {
    const massimo = (extraOptions as unknown as { maxRetries?: number } | undefined)?.maxRetries ?? 0
    return (errore as FetchBaseQueryError).status === 502 && attempt <= massimo
  },
})

const baseQueryConSessione: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  { maxRetries?: number }
> = async (args, apiBase, extraOptions) => {
  const risultato = await baseQueryConRetry(args, apiBase, extraOptions ?? {})
  const url = typeof args === 'string' ? args : args.url

  // 401 con un token: logout locale, cache svuotata; il SessionWatcher porta al login (vedi sessioneDaChiudere)
  const { token } = (apiBase.getState() as { auth: { token: string | null } }).auth
  if (sessioneDaChiudere(risultato.error?.status, url, token)) {
    apiBase.dispatch(sessioneScaduta())
    apiBase.dispatch(api.util.resetApiState())
  }
  return risultato
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryConSessione,
  tagTypes: ['Espansioni', 'Oggetti', 'Preferiti', 'PreferitiIds', 'Me', 'Utenti', 'Ricerca', 'Binder', 'Collezione', 'Statistiche'],
  endpoints: () => ({}),
})
