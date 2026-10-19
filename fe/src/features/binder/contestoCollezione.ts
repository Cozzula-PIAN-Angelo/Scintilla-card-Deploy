import { createContext, useContext } from 'react'
import type { Oggetto, Variante } from '../../types/api'

// ciò che le tasche usano della collezione
export interface ContestoCollezioneBinder {
  // senza variante (null) una copia qualsiasi; con la variante della tasca (master set) una copia di quella
  possiede(id: string, variante?: Variante | null): boolean
  // true solo a collezione nota e con l'impostazione attiva: finché carica, niente tasche in grigio
  mostraMancanti: boolean
  // "Ce l'ho": una copia della variante della tasca, oppure di quella suggerita
  ceLho(oggetto: Oggetto, variante?: Variante | null): void
}

export const ContestoCollezione = createContext<ContestoCollezioneBinder | null>(null)

// null fuori dal provider: le tasche restano come prima
export function useCollezioneBinder() {
  return useContext(ContestoCollezione)
}
