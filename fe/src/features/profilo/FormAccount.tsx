import { AtSign, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { erroriCampi, messaggioErrore, statoErrore } from '../../app/errori'
import { Button } from '../../components/Button'
import { Campo } from '../../components/Campo'
import type { Utente } from '../../types/api'
import { useModificaAccountMutation } from '../auth/authApi'
import { AvvisoForm } from '../auth/AvvisoForm'
import type { ErroriForm } from '../auth/validazione'
import { useToast } from '../toast/useToast'
import { CampoPassword } from './CampoPassword'
import { validaAccount, type DatiAccount } from './validazioneAccount'

// username ed email, confermati con la password attuale
export function FormAccount({ utente }: { utente: Utente }) {
  const [dati, setDati] = useState<DatiAccount>({ username: utente.username, email: utente.email, passwordAttuale: '' })
  const [errori, setErrori] = useState<ErroriForm<keyof DatiAccount>>({})
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null)
  const [modifica, { isLoading }] = useModificaAccountMutation()
  const toast = useToast()

  const invariato = dati.username.trim() === utente.username && dati.email.trim().toLowerCase() === utente.email

  function cambia(campo: keyof DatiAccount, valore: string) {
    setDati((d) => ({ ...d, [campo]: valore }))
    setErrori((e) => ({ ...e, [campo]: undefined }))
    setErroreGenerale(null)
  }

  async function invia(evento: FormEvent) {
    evento.preventDefault()
    const trovati = validaAccount(dati)
    if (Object.keys(trovati).length > 0) {
      setErrori(trovati)
      return
    }
    try {
      await modifica({ username: dati.username.trim(), email: dati.email.trim(), passwordAttuale: dati.passwordAttuale }).unwrap()
      setDati((d) => ({ ...d, passwordAttuale: '' }))
      toast.successo('Account aggiornato')
    } catch (errore) {
      // 400 "Password errata" sotto la password, 409 sotto il campo già usato, i limiti in alto
      const stato = statoErrore(errore)
      const messaggio = messaggioErrore(errore, "Non è stato possibile aggiornare l'account")
      const campi = erroriCampi(errore)
      if (Object.keys(campi).length > 0) setErrori(campi)
      else if (stato === 400) setErrori({ passwordAttuale: messaggio })
      else if (stato === 409) setErrori(messaggio.includes('username') ? { username: messaggio } : { email: messaggio })
      else setErroreGenerale(messaggio)
    }
  }

  return (
    <form onSubmit={invia} noValidate className="space-y-4">
      <Campo
        etichetta="Username"
        name="username"
        autoComplete="username"
        icona={<AtSign className="size-5" />}
        value={dati.username}
        onChange={(e) => cambia('username', e.target.value)}
        errore={errori.username}
      />
      <Campo
        etichetta="Email"
        name="email"
        type="email"
        autoComplete="email"
        icona={<Mail className="size-5" />}
        value={dati.email}
        onChange={(e) => cambia('email', e.target.value)}
        errore={errori.email}
      />
      <CampoPassword
        etichetta="Password attuale"
        name="passwordAttuale"
        autoComplete="current-password"
        aiuto="Serve a confermare che sei proprio tu"
        value={dati.passwordAttuale}
        onChange={(e) => cambia('passwordAttuale', e.target.value)}
        errore={errori.passwordAttuale}
      />
      <AvvisoForm messaggio={erroreGenerale} />
      <div className="flex justify-end">
        <Button type="submit" caricamento={isLoading} disabled={invariato}>
          Salva
        </Button>
      </div>
    </form>
  )
}
