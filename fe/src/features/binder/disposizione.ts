import type { Oggetto, SlotBinder } from '../../types/api'

export interface Posizione {
  pagina: number
  posizione: number
}

// Regole di "Fai spazio", copia di Disposizione.java nel backend: servono solo all'aggiornamento
// immediato del binder aperto, la disposizione vera la decide il server. Si ragiona sull'indice
// lineare pagina * tasche + posizione; le funzioni restituiscono una lista nuova

type Tasche = Map<number, Oggetto>

const indice = (p: Posizione, tasche: number) => p.pagina * tasche + p.posizione

function inMappa(slot: SlotBinder[], tasche: number): Tasche {
  return new Map(slot.map((s) => [indice(s, tasche), s.oggetto]))
}

function inLista(mappa: Tasche, tasche: number): SlotBinder[] {
  return [...mappa.entries()]
    .sort(([a], [b]) => a - b)
    .map(([i, oggetto]) => ({ pagina: Math.floor(i / tasche), posizione: i % tasche, oggetto }))
}

// primo indice libero dopo `i`, oppure `totale` se non ce ne sono
function primoBuco(mappa: Tasche, i: number, totale: number) {
  let j = i + 1
  while (j < totale && mappa.has(j)) j++
  return j
}

function inserisciInMappa(mappa: Tasche, totale: number, i: number, oggetto: Oggetto): Tasche | null {
  const nuova = new Map(mappa)
  if (nuova.has(i)) {
    const buco = primoBuco(nuova, i, totale)
    if (buco === totale) return null
    for (let k = buco - 1; k >= i; k--) nuova.set(k + 1, nuova.get(k)!)
  }
  nuova.set(i, oggetto)
  return nuova
}

function togliDaMappa(mappa: Tasche, totale: number, i: number): Tasche {
  const nuova = new Map(mappa)
  if (!nuova.delete(i)) return nuova
  const buco = primoBuco(nuova, i, totale)
  for (let k = i + 1; k < buco; k++) nuova.set(k - 1, nuova.get(k)!)
  nuova.delete(buco - 1)
  return nuova
}

// tasca occupata: le carte avanzano fino al primo buco dopo. null = nessun buco dopo, binder pieno
export function inserisci(slot: SlotBinder[], tasche: number, pagine: number, dove: Posizione, oggetto: Oggetto): SlotBinder[] | null {
  const nuova = inserisciInMappa(inMappa(slot, tasche), pagine * tasche, indice(dove, tasche), oggetto)
  return nuova && inLista(nuova, tasche)
}

// le carte dopo arretrano fino al buco successivo
export function togli(slot: SlotBinder[], tasche: number, pagine: number, dove: Posizione): SlotBinder[] {
  return inLista(togliDaMappa(inMappa(slot, tasche), pagine * tasche, indice(dove, tasche)), tasche)
}

// su una tasca vuota la carta va lì; su una occupata finisce subito prima della carta che c'era
export function sposta(slot: SlotBinder[], tasche: number, pagine: number, da: Posizione, a: Posizione): SlotBinder[] {
  const totale = pagine * tasche
  const mappa = inMappa(slot, tasche)
  const d = indice(da, tasche)
  const i = indice(a, tasche)
  const carta = mappa.get(d)
  if (!carta || d === i) return slot
  if (!mappa.has(i)) {
    const nuova = new Map(mappa)
    nuova.delete(d)
    nuova.set(i, carta)
    return inLista(nuova, tasche)
  }
  // la carta d'arrivo arretra di una tasca se sta nel gruppo che si richiude dopo la partenza
  const buco = primoBuco(mappa, d, totale)
  const dove = i > d && i < buco ? i - 1 : i
  // dopo il togli c'è sempre un buco dopo `dove`: l'inserimento non può fallire
  return inLista(inserisciInMappa(togliDaMappa(mappa, totale, d), totale, dove, carta)!, tasche)
}
