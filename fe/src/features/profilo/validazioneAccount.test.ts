import { describe, expect, it } from 'vitest'
import { validaAccount, validaCambioPassword } from './validazioneAccount'

describe('validaAccount', () => {
  const validi = { username: 'mario', email: 'mario@esempio.it', passwordAttuale: 'vecchia123' }

  it('username troppo corto dopo il trim', () => {
    expect(validaAccount({ ...validi, username: ' ab ' })).toHaveProperty('username')
  })

  it('username con la chiocciola', () => {
    expect(validaAccount({ ...validi, username: 'ma@rio' })).toHaveProperty('username')
  })

  it('email non valida', () => {
    expect(validaAccount({ ...validi, email: 'mario' })).toHaveProperty('email')
  })

  it('serve la password attuale', () => {
    expect(validaAccount({ ...validi, passwordAttuale: '' })).toHaveProperty('passwordAttuale')
  })

  it('valori validi', () => {
    expect(validaAccount(validi)).toEqual({})
  })
})

describe('validaCambioPassword', () => {
  const validi = { passwordAttuale: 'vecchia123', nuovaPassword: 'nuovissima1', conferma: 'nuovissima1' }

  it('nuova password troppo corta', () => {
    expect(validaCambioPassword({ ...validi, nuovaPassword: 'corta', conferma: 'corta' })).toHaveProperty('nuovaPassword')
  })

  it('nuova password oltre i 72 byte', () => {
    const lunga = 'è'.repeat(40)
    expect(validaCambioPassword({ ...validi, nuovaPassword: lunga, conferma: lunga })).toHaveProperty('nuovaPassword')
  })

  it('conferma diversa', () => {
    expect(validaCambioPassword({ ...validi, conferma: 'nuovissima2' })).toHaveProperty('conferma')
  })

  it('serve la password attuale', () => {
    expect(validaCambioPassword({ ...validi, passwordAttuale: '' })).toHaveProperty('passwordAttuale')
  })

  it('valori validi', () => {
    expect(validaCambioPassword(validi)).toEqual({})
  })
})
