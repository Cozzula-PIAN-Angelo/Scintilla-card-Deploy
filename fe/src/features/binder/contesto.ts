import { createContext, useContext } from 'react'
import type { Oggetto } from '../../types/api'

export interface Posizione {
  pagina: number
  posizione: number
}

// una carta presa dal cassetto oppure da una tasca del binder
export type Sorgente = { tipo: 'carta'; oggetto: Oggetto } | ({ tipo: 'tasca'; oggetto: Oggetto } & Posizione)

export interface ContestoBinder {
  // carta scelta con un tocco, in attesa della tasca di destinazione (alternativa al trascinamento)
  inMano: Sorgente | null
  prendi: (sorgente: Sorgente | null) => void
  // carta che si sta trascinando: il dataTransfer non è leggibile durante il dragover
  trascinata: Sorgente | null
  iniziaTrascinamento: (sorgente: Sorgente) => void
  fineTrascinamento: () => void
  // tasca con il menu aperto (guarda, sposta, togli)
  tascaAttiva: Posizione | null
  attivaTasca: (posizione: Posizione | null) => void
  rilascia: (arrivo: Posizione, sorgente: Sorgente) => void
  togli: (posizione: Posizione) => void
  guarda: (oggetto: Oggetto) => void
}

export const Contesto = createContext<ContestoBinder | null>(null)

export function useContestoBinder() {
  const contesto = useContext(Contesto)
  if (!contesto) throw new Error('useContestoBinder va usato dentro un binder aperto')
  return contesto
}

export function stessaPosizione(a: Posizione | null, b: Posizione | null) {
  return a !== null && b !== null && a.pagina === b.pagina && a.posizione === b.posizione
}

// il dataTransfer serve comunque: senza dati Firefox non avvia il trascinamento
export const TIPO_TRASCINAMENTO = 'application/x-scintilla-carta'
