import { Lock, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../../app/api'
import { erroriCampi, messaggioErrore, statoErrore } from '../../app/errori'
import { useAppDispatch } from '../../app/hooks'
import { Button } from '../../components/Button'
import { Campo } from '../../components/Campo'
import { Modale } from '../../components/Modale'
import { useToast } from '../toast/useToast'
import { useCancellaAccountMutation } from './authApi'
import { logoutLocale } from './authSlice'
import { AvvisoForm } from './AvvisoForm'
import { VisibilitaPassword } from './VisibilitaPassword'

interface Props {
  aperta: boolean
  onChiudi: () => void
}

// cancellazione del proprio account, confermata con la password
export function ModaleCancellaAccount({ aperta, onChiudi }: Props) {
  const [password, setPassword] = useState('')
  const [passwordVisibile, setPasswordVisibile] = useState(false)
  const [errorePassword, setErrorePassword] = useState<string | null>(null)
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null)
  const [cancella, { isLoading }] = useCancellaAccountMutation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const toast = useToast()

  // a ogni apertura il form riparte vuoto
  useEffect(() => {
    if (!aperta) return
    setPassword('')
    setPasswordVisibile(false)
    setErrorePassword(null)
    setErroreGenerale(null)
  }, [aperta])

  const invia = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!password) {
      setErrorePassword('Inserisci la password per confermare')
      return
    }
    try {
      await cancella({ password }).unwrap()
    } catch (errore) {
      // 400: password errata o mancante, va sotto il campo; 409: ultimo admin rimasto
      const campo = erroriCampi(errore).password ?? (statoErrore(errore) === 400 ? messaggioErrore(errore) : null)
      if (campo) setErrorePassword(campo)
      else setErroreGenerale(messaggioErrore(errore, "Non è stato possibile cancellare l'account"))
      return
    }
    // il token non vale più: uscita locale, come nel logout
    dispatch(logoutLocale())
    dispatch(api.util.resetApiState())
    toast.info('Il tuo account è stato cancellato. Grazie per essere passato da Scintilla!')
    onChiudi()
    navigate('/', { replace: true })
  }

  return (
    <Modale aperto={aperta} onChiudi={onChiudi} titolo="Cancellare il tuo account?">
      <form onSubmit={invia} noValidate className="space-y-5">
        <div className="space-y-2 text-sm text-testo">
          <p>Non potrai più accedere con questo account e l'operazione non si può annullare.</p>
          <p className="text-testo/70">
            Username ed email vengono rimossi (potrai riusarli per un nuovo account), insieme alle immagini di copertina
            dei binder. I preferiti e i binder restano solo in forma anonima, per le statistiche del sito.
          </p>
        </div>
        <Campo
          etichetta="Password"
          name="password"
          type={passwordVisibile ? 'text' : 'password'}
          autoComplete="current-password"
          autoFocus
          icona={<Lock className="size-5" />}
          suffisso={<VisibilitaPassword visibile={passwordVisibile} onCambia={() => setPasswordVisibile((v) => !v)} />}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setErrorePassword(null)
            setErroreGenerale(null)
          }}
          errore={errorePassword ?? undefined}
        />
        <AvvisoForm messaggio={erroreGenerale} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variante="fantasma" onClick={onChiudi}>
            Annulla
          </Button>
          <Button type="submit" variante="pericolo" caricamento={isLoading}>
            {!isLoading && <Trash2 aria-hidden className="size-4" />}
            Cancella account
          </Button>
        </div>
      </form>
    </Modale>
  )
}
