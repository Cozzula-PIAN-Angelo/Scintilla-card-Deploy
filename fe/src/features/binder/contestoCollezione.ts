import { createContext, useContext } from 'react'
import type { Oggetto } from '../../types/api'

// ciò che le tasche usano della collezione
export interface ContestoCollezioneBinder {
  possiede(id: string): boolean
  // true solo a collezione nota e con l'impostazione attiva: finché carica, niente tasche in grigio
  mostraMancanti: boolean
  // "Ce l'ho": una copia della variante suggerita
  ceLho(oggetto: Oggetto): void
}

export const ContestoCollezione = createContext<ContestoCollezioneBinder | null>(null)

// null fuori dal provider: le tasche restano come prima
export function useCollezioneBinder() {
  return useContext(ContestoCollezione)
}
