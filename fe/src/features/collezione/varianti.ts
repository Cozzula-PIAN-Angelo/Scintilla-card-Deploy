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

// cornice misurata: 'normale' (disegno in una finestra) o 'ex' (disegno su tutta la metà alta)
export type Cornice = 'normale' | 'ex'

// id di set pokemontcg.io del Scarlatto e Violetto principale: sv1..sv10 e i mezzi set (sv3pt5, sv4pt5, sv6pt5,
// sv8pt5, zsv10pt5, rsv10pt5). Esclusi svp (promo) e sve (energie)
const SET_SCARLATTO_VIOLETTO = /^(z|r)?sv\d/

const RARITA_CORNICE_NORMALE = new Set(['Common', 'Uncommon', 'Rare'])

// tipo di cornice della carta, da cui dipendono le maschere di holo e reverse; null = nessuna maschera, l'effetto
// copre tutta la carta. Le maschere sono misurate sui pixel di carte Pokémon Scarlatto e Violetto: si applicano solo
// dove la cornice è nota e verificata (meglio una carta che brilla tutta che una maschera storta). Condizioni:
// set Scarlatto e Violetto principale, categoria Pokémon, nessun sottotipo Tera (disegno a tutta carta),
// rarità Common/Uncommon/Rare (cornice normale) o Double Rare (cornice ex). Tutto il resto, comprese rarità
// null o '', non ha maschera. Per altre ere, Allenatori o Energie si aggiungono misurandoli uno alla volta
export function cornice(oggetto: Pick<Oggetto, 'idEsterno' | 'categoria' | 'sottotipi' | 'rarita'>): Cornice | null {
  const idSet = (oggetto.idEsterno ?? '').split('-')[0]
  if (!SET_SCARLATTO_VIOLETTO.test(idSet)) return null
  if (oggetto.categoria !== 'Pokémon') return null
  if ((oggetto.sottotipi ?? []).includes('Tera')) return null
  const rarita = oggetto.rarita ?? ''
  if (RARITA_CORNICE_NORMALE.has(rarita)) return 'normale'
  if (rarita === 'Double Rare') return 'ex'
  return null
}
