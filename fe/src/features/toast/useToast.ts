import { useMemo } from 'react'
import { useAppDispatch } from '../../app/hooks'
import { toastAggiunto } from './toastSlice'

export function useToast() {
  const dispatch = useAppDispatch()
  return useMemo(
    () => ({
      successo: (messaggio: string) => dispatch(toastAggiunto('successo', messaggio)),
      errore: (messaggio: string) => dispatch(toastAggiunto('errore', messaggio)),
      info: (messaggio: string) => dispatch(toastAggiunto('info', messaggio)),
    }),
    [dispatch],
  )
}
