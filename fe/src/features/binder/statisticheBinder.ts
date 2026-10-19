import type { SlotBinder, Variante } from '../../types/api'

export interface StatisticheBinder {
  // tasche occupate su tasche totali
  piene: number
  totale: number
  // tasche con una carta che l'utente possiede, nella variante della tasca se ce l'ha (la stessa carta in due tasche conta due volte)
  possedute: number
  // somma dei prezzi delle carte possedute nelle tasche, in €: una stima
  valore: number
}

// statistiche del binder aperto: interno copertina (doppia pagina) e barra del binder (telefono)
export function statisticheBinder(
  slot: SlotBinder[],
  totale: number,
  possiede: (id: string, variante: Variante | null) => boolean,
): StatisticheBinder {
  const possedute = slot.filter((s) => possiede(s.oggetto.id, s.variante))
  return {
    piene: slot.length,
    totale,
    possedute: possedute.length,
    valore: possedute.reduce((somma, s) => somma + s.oggetto.prezzo, 0),
  }
}
