import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { useToast } from '../toast/useToast'
import { useMeQuery } from './authApi'
import { avvisoSessioneGestito, selectSessioneScaduta, selectToken } from './authSlice'

// al caricamento, e dopo ogni login, ricarica l'utente con /me se c'è un token
export function AuthBootstrap() {
  const token = useAppSelector(selectToken)
  useMeQuery(undefined, { skip: !token })
  return null
}

// reagisce ai 401 intercettati dalla baseQuery: avvisa e porta al login
export function SessionWatcher() {
  const scaduta = useAppSelector(selectSessioneScaduta)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  useEffect(() => {
    if (!scaduta) return
    dispatch(avvisoSessioneGestito())
    toast.info('La sessione è scaduta: accedi di nuovo')
    if (location.pathname !== '/login') {
      navigate('/login', { state: { da: location.pathname + location.search } })
    }
  }, [scaduta, dispatch, navigate, location, toast])

  return null
}
