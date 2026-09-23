import { Lock, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { erroriCampi, messaggioErrore, statoErrore } from '../app/errori'
import { useAppSelector } from '../app/hooks'
import { Button } from '../components/Button'
import { Campo } from '../components/Campo'
import { useLoginMutation } from '../features/auth/authApi'
import { selectToken } from '../features/auth/authSlice'
import { AvvisoForm } from '../features/auth/AvvisoForm'
import { LayoutAuth } from '../features/auth/LayoutAuth'
import { validaLogin, type ErroriForm } from '../features/auth/validazione'
import { VisibilitaPassword } from '../features/auth/VisibilitaPassword'
import { useToast } from '../features/toast/useToast'
import { useTitolo } from '../hooks/useTitolo'
import type { DatiLogin } from '../types/api'

interface StatoNavigazione {
  da?: string
  identificativo?: string
}

export function LoginPage() {
  useTitolo('Accedi')
  const token = useAppSelector(selectToken)
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const stato = (location.state ?? {}) as StatoNavigazione

  const [dati, setDati] = useState<DatiLogin>({ identificativo: stato.identificativo ?? '', password: '' })
  const [errori, setErrori] = useState<ErroriForm<keyof DatiLogin>>({})
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null)
  const [passwordVisibile, setPasswordVisibile] = useState(false)
  const [login, { isLoading }] = useLoginMutation()

  // già autenticato (anche subito dopo il login): si va alla pagina di provenienza
  if (token) return <Navigate to={stato.da ?? '/'} replace />

  const aggiorna = (campo: keyof DatiLogin, valore: string) => {
    setDati((precedenti) => ({ ...precedenti, [campo]: valore }))
    setErrori((precedenti) => ({ ...precedenti, [campo]: undefined }))
    setErroreGenerale(null)
  }

  const invia = async (evento: FormEvent) => {
    evento.preventDefault()
    const erroriClient = validaLogin(dati)
    setErrori(erroriClient)
    if (Object.keys(erroriClient).length > 0) return

    try {
      await login({ identificativo: dati.identificativo.trim(), password: dati.password }).unwrap()
      toast.successo('Bentornato su Scintilla!')
      navigate(stato.da ?? '/', { replace: true })
    } catch (errore) {
      setErrori(erroriCampi(errore))
      setErroreGenerale(
        statoErrore(errore) === 401 ? 'Credenziali non valide: controlla email/username e password.' : messaggioErrore(errore),
      )
    }
  }

  return (
    <LayoutAuth titolo="Bentornato!" sottotitolo="Accedi per salvare le tue carte preferite.">
      <form onSubmit={invia} noValidate className="space-y-5">
        <Campo
          etichetta="Email o username"
          name="identificativo"
          autoComplete="username"
          autoFocus
          icona={<User className="size-5" />}
          value={dati.identificativo}
          onChange={(e) => aggiorna('identificativo', e.target.value)}
          errore={errori.identificativo}
        />
        <Campo
          etichetta="Password"
          name="password"
          type={passwordVisibile ? 'text' : 'password'}
          autoComplete="current-password"
          icona={<Lock className="size-5" />}
          suffisso={<VisibilitaPassword visibile={passwordVisibile} onCambia={() => setPasswordVisibile((v) => !v)} />}
          value={dati.password}
          onChange={(e) => aggiorna('password', e.target.value)}
          errore={errori.password}
        />
        <AvvisoForm messaggio={erroreGenerale} />
        <Button type="submit" variante="primario" dimensione="lg" caricamento={isLoading} className="w-full">
          Accedi
        </Button>
        <p className="text-center text-sm text-blu-900/70">
          Non hai un account?{' '}
          <Link to="/register" className="font-semibold text-blu-700 underline-offset-4 hover:underline">
            Registrati
          </Link>
        </p>
      </form>
    </LayoutAuth>
  )
}
