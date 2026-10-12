import type { Oggetto, Variante } from '../../types/api'

// in questo ordine: è quello dello spec e quello usato a parità di pregio
export const VARIANTI: Variante[] = ['NORMALE', 'REVERSE_HOLO', 'HOLO', 'PRIMA_EDIZIONE', 'PRIMA_EDIZIONE_HOLO']

export const ETICHETTE: Record<Variante, string> = {
  NORMALE: 'Normale',
  REVERSE_HOLO: 'Reverse holo',
  HOLO: 'Holo',
  PRIMA_EDIZIONE: '1ª edizione',
  PRIMA_EDIZIONE_HOLO: '1ª edizione holo',
}

function pregio(variante: Variante): number {
  if (variante === 'HOLO' || variante === 'PRIMA_EDIZIONE_HOLO') return 3
  if (variante === 'REVERSE_HOLO') return 2
  return 1
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

// variante del "+" rapido: la copia che si trova nella bustina. NORMALE se esiste; altrimenti (carta solo holo,
// per esempio) la più pregiata tra le suggerite. NORMALE anche se le varianti sono sconosciute o vuote
export function varianteRapida(oggetto: Oggetto): Variante {
  const suggerite = oggetto.varianti ?? []
  if (suggerite.includes('NORMALE')) return 'NORMALE'
  return piuPregiata(suggerite) ?? 'NORMALE'
}
