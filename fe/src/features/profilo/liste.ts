import type { KeyboardEvent } from 'react'

// Invio in un campo di ricerca dentro le modali: cerca, non salva il form
export function senzaInvioNeiCampi(evento: KeyboardEvent) {
  if (evento.key === 'Enter' && evento.target instanceof HTMLInputElement) evento.preventDefault()
}

// liste ordinate del profilo (squadra, vetrina, binder in evidenza): sempre copie nuove, mai modificate sul posto

// in fondo, se non c'è già e c'è ancora posto; altrimenti la stessa lista
export function aggiungi<T>(lista: T[], voce: T, massimo: number, uguale: (a: T, b: T) => boolean = Object.is): T[] {
  if (lista.length >= massimo || lista.some((v) => uguale(v, voce))) return lista
  return [...lista, voce]
}

export function togli<T>(lista: T[], indice: number): T[] {
  return lista.filter((_, i) => i !== indice)
}

// la voce in posizione `da` passa in posizione `a`; posizioni fuori dalla lista: la stessa lista
export function sposta<T>(lista: T[], da: number, a: number): T[] {
  if (da < 0 || da >= lista.length || a < 0 || a >= lista.length) return lista
  const copia = [...lista]
  const [voce] = copia.splice(da, 1)
  copia.splice(a, 0, voce)
  return copia
}
