import { describe, expect, it } from 'vitest'
import { CHIAVE_TOKEN } from './storage'
import { sessioneDaChiudere, tokenDaAltraScheda } from './sessione'

describe('sessioneDaChiudere', () => {
  it('401 con un token: la sessione è scaduta', () => {
    expect(sessioneDaChiudere(401, '/me/collezione', 'token', 'token')).toBe(true)
  })

  // senza token svuotare la cache farebbe ripartire le stesse richieste, di nuovo 401: un ciclo
  it('401 senza token: niente da chiudere', () => {
    expect(sessioneDaChiudere(401, '/espansioni/smp/carte/stato', null, null)).toBe(false)
  })

  it('login e logout: un 401 non vuol dire sessione scaduta', () => {
    expect(sessioneDaChiudere(401, '/auth/login', 'token', 'token')).toBe(false)
    expect(sessioneDaChiudere(401, '/auth/logout', 'token', 'token')).toBe(false)
  })

  it('altri errori: no', () => {
    expect(sessioneDaChiudere(403, '/me/collezione', 'token', 'token')).toBe(false)
    expect(sessioneDaChiudere(undefined, '/me/collezione', 'token', 'token')).toBe(false)
  })

  // cambio password: una richiesta partita col token vecchio torna 401, ma la sessione ha già quello nuovo
  it('401 di un token già sostituito: la sessione resta', () => {
    expect(sessioneDaChiudere(401, '/me/collezione', 'nuovo', 'vecchio')).toBe(false)
  })
})

describe('tokenDaAltraScheda', () => {
  // un'altra scheda ha cambiato la password: questa prende il token nuovo invece di ricevere 401
  it('token nuovo salvato da un\'altra scheda: si adotta', () => {
    expect(tokenDaAltraScheda(CHIAVE_TOKEN, 'nuovo', 'vecchio')).toBe('nuovo')
  })

  it('stesso token o altra chiave: niente', () => {
    expect(tokenDaAltraScheda(CHIAVE_TOKEN, 'uguale', 'uguale')).toBeNull()
    expect(tokenDaAltraScheda('altra.chiave', 'nuovo', 'vecchio')).toBeNull()
  })

  // logout in un'altra scheda: non si rinnova niente (il token tolto non si adotta)
  it('token tolto da un\'altra scheda: niente', () => {
    expect(tokenDaAltraScheda(CHIAVE_TOKEN, null, 'vecchio')).toBeNull()
  })

  // senza sessione in questa scheda non si entra di nascosto: si aspetta il login o il caricamento
  it('questa scheda senza token: niente', () => {
    expect(tokenDaAltraScheda(CHIAVE_TOKEN, 'nuovo', null)).toBeNull()
  })
})
