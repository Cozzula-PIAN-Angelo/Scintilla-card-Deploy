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

export type Cornice = 'piena' | 'ex' | 'normale'

// rarità di pokemontcg.io con la carta a tutto disegno (full art): l'holo copre tutta l'immagine
const RARITA_CORNICE_PIENA = new Set([
  'Illustration Rare',
  'Special Illustration Rare',
  'Ultra Rare',
  'Hyper Rare',
  'Rare Ultra',
  'Rare Secret',
  'Rare Rainbow',
  'Rare Shiny GX',
  'Shiny Ultra Rare',
  'Trainer Gallery Rare Holo',
])

// rarità con la cornice ex: il disegno occupa tutta la metà alta, il riquadro del testo sta sotto
const RARITA_CORNICE_EX = new Set([
  'Double Rare',
  'Rare Holo V',
  'Rare Holo VMAX',
  'Rare Holo VSTAR',
  'Rare Holo EX',
  'Rare Holo GX',
])

// tipo di cornice della carta, da cui dipende la maschera dell'holo. Tutto il resto (anche rarità null o '') è normale.
// Le misure delle maschere vengono da carte Scarlatto e Violetto: sulle cornici di altre ere possono non combaciare
export function cornice(oggetto: Pick<Oggetto, 'rarita'>): Cornice {
  const rarita = oggetto.rarita ?? ''
  if (RARITA_CORNICE_PIENA.has(rarita)) return 'piena'
  if (RARITA_CORNICE_EX.has(rarita)) return 'ex'
  return 'normale'
}
