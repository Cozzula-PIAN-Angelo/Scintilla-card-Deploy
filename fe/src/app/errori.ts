import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { ErroreApi } from '../types/api'

function isErroreFetch(errore: unknown): errore is FetchBaseQueryError {
  return typeof errore === 'object' && errore !== null && 'status' in errore
}

function datiErrore(errore: unknown): Partial<ErroreApi> | undefined {
  if (!isErroreFetch(errore)) return undefined
  const dati = errore.data
  return typeof dati === 'object' && dati !== null ? (dati as Partial<ErroreApi>) : undefined
}

export function statoErrore(errore: unknown): number | string | undefined {
  return isErroreFetch(errore) ? errore.status : undefined
}

// messaggio da mostrare all'utente: quello del backend se c'è, altrimenti uno generico
export function messaggioErrore(errore: unknown, predefinito = 'Si è verificato un errore imprevisto'): string {
  if (!isErroreFetch(errore)) return predefinito
  if (errore.status === 'FETCH_ERROR') return 'Impossibile contattare il server: controlla che il backend sia avviato.'
  if (errore.status === 'TIMEOUT_ERROR') return 'Il server non ha risposto in tempo, riprova.'
  return datiErrore(errore)?.message ?? predefinito
}

// errori di validazione campo per campo ({campo: messaggio})
export function erroriCampi(errore: unknown): Record<string, string> {
  return datiErrore(errore)?.errors ?? {}
}
