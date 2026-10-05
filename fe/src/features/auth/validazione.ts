import type { DatiLogin, DatiRegistrazione } from '../../types/api'

// stesse regole di RegistrazioneDTO e LoginDTO del backend
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ErroriForm<K extends string> = Partial<Record<K, string>>

export function validaRegistrazione(dati: DatiRegistrazione): ErroriForm<keyof DatiRegistrazione> {
  const errori: ErroriForm<keyof DatiRegistrazione> = {}
  const username = dati.username.trim()

  if (!username) errori.username = 'Lo username è obbligatorio'
  else if (username.length < 3 || username.length > 30) errori.username = 'Lo username deve avere tra 3 e 30 caratteri'
  else if (username.includes('@')) errori.username = 'Lo username non può contenere il carattere @'

  if (!dati.email.trim()) errori.email = "L'email è obbligatoria"
  else if (!EMAIL.test(dati.email.trim())) errori.email = "L'email non è valida"

  if (!dati.password) errori.password = 'La password è obbligatoria'
  else if (dati.password.length < 8 || dati.password.length > 72) {
    errori.password = 'La password deve avere tra 8 e 72 caratteri'
  } else if (new TextEncoder().encode(dati.password).length > 72) {
    // il limite vero di BCrypt è in byte: lettere accentate ed emoji ne occupano più di uno
    errori.password = 'Password troppo lunga: lettere accentate ed emoji occupano più spazio, accorciala'
  }
  return errori
}

export function validaLogin(dati: DatiLogin): ErroriForm<keyof DatiLogin> {
  const errori: ErroriForm<keyof DatiLogin> = {}
  if (!dati.identificativo.trim()) errori.identificativo = 'Inserisci email o username'
  if (!dati.password) errori.password = 'La password è obbligatoria'
  return errori
}
