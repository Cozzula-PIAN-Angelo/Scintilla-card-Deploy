import { useState, type FormEvent } from 'react'
import { erroriCampi, messaggioErrore, statoErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { useCambiaPasswordMutation } from '../auth/authApi'
import { AvvisoForm } from '../auth/AvvisoForm'
import type { ErroriForm } from '../auth/validazione'
import { useToast } from '../toast/useToast'
import { CampoPassword } from './CampoPassword'
import { validaCambioPassword, type DatiCambioPassword } from './validazioneAccount'

const VUOTO: DatiCambioPassword = { passwordAttuale: '', nuovaPassword: '', conferma: '' }

// cambio password: questa sessione resta aperta con il token nuovo, le altre vengono chiuse dal backend
export function FormPassword() {
  const [dati, setDati] = useState<DatiCambioPassword>(VUOTO)
  const [errori, setErrori] = useState<ErroriForm<keyof DatiCambioPassword>>({})
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null)
  const [cambiaPassword, { isLoading }] = useCambiaPasswordMutation()
  const toast = useToast()

  function cambia(campo: keyof DatiCambioPassword, valore: string) {
    setDati((d) => ({ ...d, [campo]: valore }))
    setErrori((e) => ({ ...e, [campo]: undefined }))
    setErroreGenerale(null)
  }

  async function invia(evento: FormEvent) {
    evento.preventDefault()
    const trovati = validaCambioPassword(dati)
    if (Object.keys(trovati).length > 0) {
      setErrori(trovati)
      return
    }
    try {
      await cambiaPassword({ passwordAttuale: dati.passwordAttuale, nuovaPassword: dati.nuovaPassword }).unwrap()
      setDati(VUOTO)
      toast.successo('Password cambiata: gli altri dispositivi sono stati disconnessi')
    } catch (errore) {
      const campi = erroriCampi(errore)
      if (Object.keys(campi).length > 0) setErrori(campi)
      else if (statoErrore(errore) === 400) setErrori({ passwordAttuale: messaggioErrore(errore) })
      else setErroreGenerale(messaggioErrore(errore, 'Non è stato possibile cambiare la password'))
    }
  }

  return (
    <form onSubmit={invia} noValidate className="space-y-4">
      <CampoPassword
        etichetta="Password attuale"
        name="passwordAttuale"
        autoComplete="current-password"
        value={dati.passwordAttuale}
        onChange={(e) => cambia('passwordAttuale', e.target.value)}
        errore={errori.passwordAttuale}
      />
      <CampoPassword
        etichetta="Nuova password"
        name="nuovaPassword"
        autoComplete="new-password"
        aiuto="Tra 8 e 72 caratteri"
        value={dati.nuovaPassword}
        onChange={(e) => cambia('nuovaPassword', e.target.value)}
        errore={errori.nuovaPassword}
      />
      <CampoPassword
        etichetta="Ripeti la nuova password"
        name="conferma"
        autoComplete="new-password"
        value={dati.conferma}
        onChange={(e) => cambia('conferma', e.target.value)}
        errore={errori.conferma}
      />
      <p className="text-sm text-testo/70">Gli altri dispositivi su cui hai fatto l'accesso verranno disconnessi.</p>
      <AvvisoForm messaggio={erroreGenerale} />
      <div className="flex justify-end">
        <Button type="submit" caricamento={isLoading}>
          Cambia password
        </Button>
      </div>
    </form>
  )
}
