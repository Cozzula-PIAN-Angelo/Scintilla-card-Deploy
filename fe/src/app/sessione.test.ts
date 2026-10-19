import { describe, expect, it } from 'vitest'
import { sessioneDaChiudere } from './sessione'

describe('sessioneDaChiudere', () => {
  it('401 con un token: la sessione è scaduta', () => {
    expect(sessioneDaChiudere(401, '/me/collezione', 'token')).toBe(true)
  })

  // senza token svuotare la cache farebbe ripartire le stesse richieste, di nuovo 401: un ciclo
  it('401 senza token: niente da chiudere', () => {
    expect(sessioneDaChiudere(401, '/espansioni/smp/carte/stato', null)).toBe(false)
  })

  it('login e logout: un 401 non vuol dire sessione scaduta', () => {
    expect(sessioneDaChiudere(401, '/auth/login', 'token')).toBe(false)
    expect(sessioneDaChiudere(401, '/auth/logout', 'token')).toBe(false)
  })

  it('altri errori: no', () => {
    expect(sessioneDaChiudere(403, '/me/collezione', 'token')).toBe(false)
    expect(sessioneDaChiudere(undefined, '/me/collezione', 'token')).toBe(false)
  })
})
