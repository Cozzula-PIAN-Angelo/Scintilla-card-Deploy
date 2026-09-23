import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAppSelector } from '../../app/hooks'
import { Loader } from '../../components/Loader'
import { StatoErrore } from '../../components/StatiPagina'
import { useMeQuery } from './authApi'
import { selectIsAdmin, selectToken, selectUtente } from './authSlice'

// comune alle due route: senza token al login, con token ma utente non ancora caricato un loader
function useVerificaSessione() {
  const token = useAppSelector(selectToken)
  const utente = useAppSelector(selectUtente)
  const location = useLocation()
  const { isError, refetch } = useMeQuery(undefined, { skip: !token })

  if (!token) {
    return <Navigate to="/login" replace state={{ da: location.pathname + location.search }} />
  }
  if (!utente) {
    return isError ? (
      <div className="px-4 py-24">
        <StatoErrore messaggio="Non è stato possibile verificare la sessione." onRiprova={refetch} />
      </div>
    ) : (
      <Loader etichetta="Verifica della sessione…" className="py-32" />
    )
  }
  return null
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const blocco = useVerificaSessione()
  return blocco ?? children
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const blocco = useVerificaSessione()
  const isAdmin = useAppSelector(selectIsAdmin)
  if (blocco) return blocco
  return isAdmin ? children : <Navigate to="/" replace />
}
