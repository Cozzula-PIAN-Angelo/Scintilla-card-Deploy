import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { liberaImmaginiBinder } from '../binder/immagine'
import { useToast } from '../toast/useToast'
import { useMeQuery } from './authApi'
import { avvisoSessioneGestito, selectSessioneScaduta, selectToken } from './authSlice'

// al caricamento, e dopo ogni login, ricarica l'utente con /me se c'è un token
export function AuthBootstrap() {
  const token = useAppSelector(selectToken)
  useMeQuery(undefined, { skip: !token })

  // senza token (logout, account cancellato, sessione scaduta) le immagini dei binder in memoria
  // appartengono all'utente uscito
  useEffect(() => {
    if (!token) liberaImmaginiBinder()
  }, [token])

  return null
}

// Reagisce ai 401 intercettati dalla baseQuery: avvisa e basta. Sulle pagine protette il login lo
// chiede ProtectedRoute (il token non c'è più); su quelle pubbliche si resta dove si è: chi stava
// guardando la vetrina non deve essere portato via solo perché la sessione è scaduta
export function SessionWatcher() {
  const scaduta = useAppSelector(selectSessioneScaduta)
  const dispatch = useAppDispatch()
  const toast = useToast()

  useEffect(() => {
    if (!scaduta) return
    dispatch(avvisoSessioneGestito())
    toast.info('La sessione è scaduta: accedi di nuovo per preferiti e binder')
  }, [scaduta, dispatch, toast])

  return null
}
