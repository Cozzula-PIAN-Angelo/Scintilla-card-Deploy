import { describe, expect, it } from 'vitest'
import type { CarteProgressive } from '../../types/api'
import { argomentoCarte, inAttesa, intervalloPolling, modalitaDopo, paginaDaPrecaricare, pagineTotali } from './carteProgressive'

const risposta = (completo: boolean): CarteProgressive => ({ completo, totale: 0, carte: [], fallito: false })

describe('modalitaDopo', () => {
  it('dalla prima risposta', () => {
    expect(modalitaDopo('sconosciuta', risposta(false))).toBe('a-pezzi')
    expect(modalitaDopo('sconosciuta', risposta(true))).toBe('completa')
    expect(modalitaDopo('a-pezzi', risposta(true))).toBe('completa')
  })

  it("senza risposta resta com'era", () => {
    expect(modalitaDopo('a-pezzi', undefined)).toBe('a-pezzi')
  })

  // la cache può ridare una vecchia risposta a pezzi: tornare indietro farebbe un ciclo infinito di render
  it('completa non torna mai a pezzi', () => {
    expect(modalitaDopo('completa', risposta(false))).toBe('completa')
  })

  // il controllo leggero dice quando lo scaricamento è finito, anche se la pagina in cache è ancora a pezzi
  it('lo stato completo chiude la modalità a pezzi', () => {
    expect(modalitaDopo('a-pezzi', risposta(false), { completo: true, fallito: false })).toBe('completa')
    expect(modalitaDopo('a-pezzi', risposta(false), { completo: false, fallito: false })).toBe('a-pezzi')
  })
})

describe('argomentoCarte', () => {
  it('sconosciuta: senza pagina', () => {
    expect(argomentoCarte('sv8', 'sconosciuta', 3)).toEqual({ chiave: 'sv8' })
  })

  it("a pezzi: la pagina dell'URL; la prima riusa la richiesta senza pagina (niente doppione)", () => {
    expect(argomentoCarte('sv8', 'a-pezzi', 3)).toEqual({ chiave: 'sv8', pagina: 3 })
    expect(argomentoCarte('sv8', 'a-pezzi', 0)).toEqual({ chiave: 'sv8' })
  })

  it('completa: una voce di cache diversa da quella della prima risposta', () => {
    expect(argomentoCarte('sv8', 'completa', 3)).toEqual({ chiave: 'sv8', intera: true })
  })
})

describe('pagineTotali', () => {
  it('lista intera: dalle carte ricevute', () => {
    expect(pagineTotali(30)).toBe(2)
  })

  it('a pezzi: dal totale del server', () => {
    expect(pagineTotali(24, 252)).toBe(11)
    expect(pagineTotali(0, 0)).toBe(0)
  })
})

describe('intervalloPolling', () => {
  it('a pezzi ogni 3 secondi', () => {
    expect(intervalloPolling(true, false)).toBe(3000)
  })

  it('completo o fallito: niente richieste ripetute', () => {
    expect(intervalloPolling(false, false)).toBe(0)
    expect(intervalloPolling(true, true)).toBe(0)
  })
})

describe('inAttesa', () => {
  const base = { carte: [] as never[], isError: false, aPezzi: true, totaleServer: 0, fallito: false }

  it('senza carte ancora arrivate', () => {
    expect(inAttesa({ ...base, carte: undefined })).toBe(true)
    expect(inAttesa({ ...base, carte: undefined, isError: true })).toBe(false)
  })

  it('a pezzi senza totale (artista sconosciuto): si aspetta lo scaricamento', () => {
    expect(inAttesa(base)).toBe(true)
    expect(inAttesa({ ...base, fallito: true })).toBe(false)
  })

  it('a pezzi con un totale ma la pagina vuota (oltre la fine): non si aspetta per sempre', () => {
    expect(inAttesa({ ...base, totaleServer: 120 })).toBe(false)
  })
})

// la pagina successiva si chiede in anticipo: cliccando «avanti» è già pronta
describe('paginaDaPrecaricare', () => {
  it('a pezzi: la successiva, se c’è', () => {
    expect(paginaDaPrecaricare('a-pezzi', 0, 252, false)).toBe(1)
    expect(paginaDaPrecaricare('a-pezzi', 10, 252, false)).toBeUndefined()
  })

  it('completa, sconosciuta o fallita: nessuna', () => {
    expect(paginaDaPrecaricare('completa', 0, 252, false)).toBeUndefined()
    expect(paginaDaPrecaricare('sconosciuta', 0, undefined, false)).toBeUndefined()
    expect(paginaDaPrecaricare('a-pezzi', 0, 252, true)).toBeUndefined()
  })
})
