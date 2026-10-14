// frecce del dettaglio carta: carta precedente e successiva nella lista da cui la carta è stata aperta.
// Una freccia senza handler è disattivata (prima o ultima carta)
export interface SfoglioCarte {
  onPrecedente?: () => void
  onSuccessiva?: () => void
  // posizione della carta (da 1) per il contatore; null se la carta non è più nella lista
  numero: number | null
  totale: number
}

// `indice` è la posizione attuale della carta aperta (-1 se è uscita dalla lista, es. tolta dai
// preferiti), `ultimoIndice` quella che aveva quando è stata aperta: se la carta è uscita, la
// successiva è quella che ne ha preso il posto
export function sfoglioCarte<T>(
  lista: readonly T[],
  indice: number,
  ultimoIndice: number,
  vai: (elemento: T, indice: number) => void,
): SfoglioCarte {
  const presente = indice >= 0
  const posto = presente ? indice : Math.min(ultimoIndice, lista.length)
  const precedente = posto - 1
  const successiva = presente ? indice + 1 : posto
  const valido = (i: number) => posto >= 0 && i >= 0 && i < lista.length
  return {
    onPrecedente: valido(precedente) ? () => vai(lista[precedente], precedente) : undefined,
    onSuccessiva: valido(successiva) ? () => vai(lista[successiva], successiva) : undefined,
    numero: presente ? indice + 1 : null,
    totale: lista.length,
  }
}
