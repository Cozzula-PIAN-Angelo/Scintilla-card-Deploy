import { validaRegistrazione, type ErroriForm } from '../auth/validazione'

export interface DatiAccount {
  username: string
  email: string
  passwordAttuale: string
}

export interface DatiCambioPassword {
  passwordAttuale: string
  nuovaPassword: string
  conferma: string
}

// username ed email con le stesse regole della registrazione (ModificaAccountDTO del backend)
export function validaAccount(dati: DatiAccount): ErroriForm<keyof DatiAccount> {
  const { username, email } = validaRegistrazione({ username: dati.username, email: dati.email, password: 'segnaposto' })
  const errori: ErroriForm<keyof DatiAccount> = {}
  if (username) errori.username = username
  if (email) errori.email = email
  if (!dati.passwordAttuale) errori.passwordAttuale = 'Inserisci la password attuale per confermare'
  return errori
}

// la nuova password segue le regole della registrazione (8-72 caratteri, massimo 72 byte)
export function validaCambioPassword(dati: DatiCambioPassword): ErroriForm<keyof DatiCambioPassword> {
  const { password } = validaRegistrazione({ username: 'segnaposto', email: 'a@b.it', password: dati.nuovaPassword })
  const errori: ErroriForm<keyof DatiCambioPassword> = {}
  if (!dati.passwordAttuale) errori.passwordAttuale = 'Inserisci la password attuale'
  if (password) errori.nuovaPassword = password
  else if (dati.conferma !== dati.nuovaPassword) errori.conferma = 'Le due password non coincidono'
  return errori
}
