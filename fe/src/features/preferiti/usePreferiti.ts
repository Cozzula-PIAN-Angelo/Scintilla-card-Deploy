import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppSelector } from '../../app/hooks'
import { messaggioErrore, statoErrore } from '../../app/errori'
import type { Oggetto } from '../../types/api'
import { selectToken } from '../auth/authSlice'
import { useToast } from '../toast/useToast'
import { useAggiungiPreferitoMutation, useGetPreferitiIdsQuery, useRimuoviPreferitoMutation } from './preferitiApi'

export function usePreferiti() {
  const token = useAppSelector(selectToken)
  const { data: ids, isSuccess: idsCaricati } = useGetPreferitiIdsQuery(undefined, { skip: !token })
  const [aggiungi] = useAggiungiPreferitoMutation()
  const [rimuovi] = useRimuoviPreferitoMutation()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const insieme = useMemo(() => new Set(ids ?? []), [ids])
  const isPreferito = useCallback((id: string) => insieme.has(id), [insieme])

  const toggle = useCallback(
    async (oggetto: Oggetto) => {
      if (!token) {
        toast.info('Accedi per salvare le carte tra i preferiti')
        navigate('/login', { state: { da: location.pathname + location.search } })
        return
      }
      const eraPreferito = insieme.has(oggetto.id)
      try {
        if (eraPreferito) {
          await rimuovi(oggetto.id).unwrap()
        } else {
          await aggiungi(oggetto.id).unwrap()
          toast.successo(`«${oggetto.nome}» aggiunta ai preferiti`)
        }
      } catch (errore) {
        const stato = statoErrore(errore)
        // 409/404: stato già allineato; 401: ci pensa la gestione della sessione
        if (stato === 409 || stato === 404 || stato === 401) return
        toast.errore(messaggioErrore(errore, 'Non è stato possibile aggiornare i preferiti'))
      }
    },
    [token, insieme, aggiungi, rimuovi, navigate, location, toast],
  )

  return { isPreferito, toggle, idsCaricati: idsCaricati || !token }
}
