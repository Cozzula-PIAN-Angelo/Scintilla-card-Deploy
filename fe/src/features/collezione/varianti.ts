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

// le sole rarità che nei set con dati hanno la reverse
const RARITA_CON_REVERSE = new Set(['Common', 'Uncommon', 'Rare', 'Rare Holo'])

// Varianti del master set: Normale più Reverse holo dove esiste, mai vuota. Copia di VariantiMaster.effettive nel
// backend, vanno cambiate insieme. Nei set senza nessuna variante letta (dal 2026 pokemontcg.io non le dà) decide la rarità
export function variantiMaster(carta: Pick<Oggetto, 'varianti' | 'rarita'>, senzaDati: boolean): Variante[] {
  const lette = carta.varianti ?? []
  if (lette.length > 0) {
    const master = VARIANTI.filter((v) => v !== 'PRIMA_EDIZIONE' && lette.includes(v))
    return master.length > 0 ? master : ['NORMALE']
  }
  return senzaDati && RARITA_CON_REVERSE.has(carta.rarita ?? '') ? ['NORMALE', 'REVERSE_HOLO'] : ['NORMALE']
}
