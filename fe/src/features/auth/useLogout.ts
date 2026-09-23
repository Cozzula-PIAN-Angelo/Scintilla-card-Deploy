import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../../app/api'
import { useAppDispatch } from '../../app/hooks'
import { useToast } from '../toast/useToast'
import { useLogoutMutation } from './authApi'
import { logoutLocale } from './authSlice'

export function useLogout() {
  const [logout, { isLoading }] = useLogoutMutation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const toast = useToast()

  const esci = useCallback(async () => {
    try {
      await logout().unwrap()
    } catch {
      // anche se il server non risponde, l'uscita locale avviene comunque
    }
    dispatch(logoutLocale())
    dispatch(api.util.resetApiState())
    toast.info('Sei uscito. A presto!')
    navigate('/')
  }, [logout, dispatch, navigate, toast])

  return { esci, inUscita: isLoading }
}
