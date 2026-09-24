import { Lock, Mail, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { erroriCampi, messaggioErrore, statoErrore } from '../app/errori'
import { useAppSelector } from '../app/hooks'
import { Button } from '../components/Button'
import { Campo } from '../components/Campo'
import { useLoginMutation, useRegistraMutation } from '../features/auth/authApi'
import { selectToken } from '../features/auth/authSlice'
import { AvvisoForm } from '../features/auth/AvvisoForm'
import { LayoutAuth } from '../features/auth/LayoutAuth'
import { validaRegistrazione, type ErroriForm } from '../features/auth/validazione'
import { VisibilitaPassword } from '../features/auth/VisibilitaPassword'
import { useToast } from '../features/toast/useToast'
import { useTitolo } from '../hooks/useTitolo'
import type { DatiRegistrazione } from '../types/api'

type Errori = ErroriForm<keyof DatiRegistrazione>

// il 409 del backend ("Lo username ... è già in uso" / "L'email ... è già registrata") va sotto il campo giusto
function erroriDaConflitto(messaggio: string): Errori {
  const testo = messaggio.toLowerCase()
  if (testo.includes('username')) return { username: messaggio }
  if (testo.includes('email')) return { email: messaggio }
  return {}
}

export function RegisterPage() {
  useTitolo('Registrati')
  const token = useAppSelector(selectToken)
  const navigate = useNavigate()
  const toast = useToast()

  const [dati, setDati] = useState<DatiRegistrazione>({ username: '', email: '', password: '' })
  const [errori, setErrori] = useState<Errori>({})
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null)
  const [passwordVisibile, setPasswordVisibile] = useState(false)
  const [registra, { isLoading: inRegistrazione }] = useRegistraMutation()
  const [login, { isLoading: inAccesso }] = useLoginMutation()

  if (token) return <Navigate to="/" replace />

  const aggiorna = (campo: keyof DatiRegistrazione, valore: string) => {
    setDati((precedenti) => ({ ...precedenti, [campo]: valore }))
    setErrori((precedenti) => ({ ...precedenti, [campo]: undefined }))
    setErroreGenerale(null)
  }

  const invia = async (evento: FormEvent) => {
    evento.preventDefault()
    const erroriClient = validaRegistrazione(dati)
    setErrori(erroriClient)
    if (Object.keys(erroriClient).length > 0) return

    const inviati = { username: dati.username.trim(), email: dati.email.trim(), password: dati.password }
    try {
      await registra(inviati).unwrap()
    } catch (errore) {
      const messaggio = messaggioErrore(errore)
      const perCampo = statoErrore(errore) === 409 ? erroriDaConflitto(messaggio) : (erroriCampi(errore) as Errori)
      setErrori(perCampo)
      if (Object.keys(perCampo).length === 0) setErroreGenerale(messaggio)
      return
    }

    // registrazione riuscita: accesso automatico con le stesse credenziali
    try {
      await login({ identificativo: inviati.email, password: inviati.password }).unwrap()
      toast.successo(`Benvenuto su Scintilla, ${inviati.username}!`)
      navigate('/', { replace: true })
    } catch {
      toast.successo('Registrazione completata! Ora puoi accedere.')
      navigate('/login', { state: { identificativo: inviati.email } })
    }
  }

  return (
    <LayoutAuth titolo="Crea il tuo account" sottotitolo="Registrati e inizia a collezionare i tuoi preferiti.">
      <form onSubmit={invia} noValidate className="space-y-5">
        <Campo
          etichetta="Username"
          name="username"
          autoComplete="username"
          autoFocus
          icona={<User className="size-5" />}
          aiuto="Da 3 a 30 caratteri, senza @"
          value={dati.username}
          onChange={(e) => aggiorna('username', e.target.value)}
          errore={errori.username}
        />
        <Campo
          etichetta="Email"
          name="email"
          type="email"
          autoComplete="email"
          icona={<Mail className="size-5" />}
          value={dati.email}
          onChange={(e) => aggiorna('email', e.target.value)}
          errore={errori.email}
        />
        <Campo
          etichetta="Password"
          name="password"
          type={passwordVisibile ? 'text' : 'password'}
          autoComplete="new-password"
          icona={<Lock className="size-5" />}
          aiuto="Almeno 8 caratteri"
          suffisso={<VisibilitaPassword visibile={passwordVisibile} onCambia={() => setPasswordVisibile((v) => !v)} />}
          value={dati.password}
          onChange={(e) => aggiorna('password', e.target.value)}
          errore={errori.password}
        />
        <AvvisoForm messaggio={erroreGenerale} />
        <Button type="submit" variante="primario" dimensione="lg" caricamento={inRegistrazione || inAccesso} className="w-full">
          Registrati
        </Button>
        <p className="text-center text-sm text-testo/70">
          Hai già un account?{' '}
          <Link to="/login" className="font-semibold text-testo-2 underline-offset-4 hover:underline">
            Accedi
          </Link>
        </p>
      </form>
    </LayoutAuth>
  )
}
