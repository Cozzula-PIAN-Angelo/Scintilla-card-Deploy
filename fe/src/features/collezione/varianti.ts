import type { Oggetto, Variante } from '../../types/api'

// in questo ordine: è quello dello spec e quello usato a parità di pregio
export const VARIANTI: Variante[] = ['NORMALE', 'REVERSE_HOLO', 'PRIMA_EDIZIONE']

export const ETICHETTE: Record<Variante, string> = {
  NORMALE: 'Normale',
  REVERSE_HOLO: 'Reverse holo',
  PRIMA_EDIZIONE: '1ª edizione',
}

function pregio(variante: Variante): number {
  return variante === 'REVERSE_HOLO' ? 2 : 1
}

// la più pregiata; a parità vince la prima nell'ordine di VARIANTI. null se la lista è vuota
export function piuPregiata(varianti: Variante[]): Variante | null {
  let migliore: Variante | null = null
  for (const v of VARIANTI) {
    if (!varianti.includes(v)) continue
    if (migliore === null || pregio(v) > pregio(migliore)) migliore = v
  }
  return migliore
}

// variante del "+" rapido: la copia che si trova nella bustina. NORMALE se esiste; altrimenti (carta solo reverse
// o solo 1ª edizione, per esempio) la più pregiata tra le suggerite. NORMALE anche se le varianti sono sconosciute o vuote
export function varianteRapida(oggetto: Oggetto): Variante {
  const suggerite = oggetto.varianti ?? []
  if (suggerite.includes('NORMALE')) return 'NORMALE'
  return piuPregiata(suggerite) ?? 'NORMALE'
}
