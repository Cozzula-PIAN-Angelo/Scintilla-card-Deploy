import { describe, expect, it } from 'vitest'
import type { Utente } from '../../types/api'
import reducer, { tokenImpostato, tokenRinnovato, utenteCaricato } from './authSlice'

const mario: Utente = { id: '1', username: 'mario', email: 'mario@esempio.it', ruoli: ['UTENTE'], avatarAggiornatoIl: null }

describe('authSlice', () => {
  // login: utente nuovo, /me lo ricarica
  it('tokenImpostato dimentica l\'utente', () => {
    const conUtente = reducer(reducer(undefined, tokenImpostato('vecchio')), utenteCaricato(mario))

    expect(reducer(conUtente, tokenImpostato('nuovo')).utente).toBeNull()
  })

  // cambio password: stesso utente, token nuovo. Senza utente il menu sparirebbe finché /me non torna
  it('tokenRinnovato tiene l\'utente', () => {
    const conUtente = reducer(reducer(undefined, tokenImpostato('vecchio')), utenteCaricato(mario))

    const dopo = reducer(conUtente, tokenRinnovato('nuovo'))

    expect(dopo.token).toBe('nuovo')
    expect(dopo.utente).toEqual(mario)
  })
})
