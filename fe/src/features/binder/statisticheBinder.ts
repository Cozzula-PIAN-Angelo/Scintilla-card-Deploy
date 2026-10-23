import type { SlotBinder, Variante } from '../../types/api'

export interface StatisticheBinder {
  // tasche occupate su tasche totali
  piene: number
  totale: number
  // tasche con una carta che l'utente possiede, nella variante della tasca se ce l'ha (la stessa carta in due tasche conta due volte)
  possedute: number
  // somma dei prezzi delle carte possedute nelle tasche, in €: una stima
  valore: number
  // le stesse carte con minimi e massimi di Cardmarket: il valore come fascia
  valoreMinimo: number
  valoreMassimo: number
}

// euro senza decimali, come nell'interno copertina
export function euroInteri(valore: number): string {
  return Math.round(valore).toLocaleString('it-IT')
}

// la fascia sotto la stima: sotto i 100 € con i centesimi (i binder di carte comuni valgono pochi centesimi e
// in euro interi sarebbe "0 €"), da 100 € in su in euro interi. lungo per l'interno copertina, breve per la barra
// da telefono; un numero solo se minimo e massimo coincidono
export function testoFascia({ valoreMinimo, valoreMassimo }: Pick<StatisticheBinder, 'valoreMinimo' | 'valoreMassimo'>) {
  const [minimo, massimo] = [euroFascia(valoreMinimo), euroFascia(valoreMassimo)]
  if (minimo === massimo) return { lungo: `${minimo} €`, breve: `${minimo} €` }
  return { lungo: `da ${minimo} € a ${massimo} €`, breve: `${minimo}–${massimo} €` }
}

function euroFascia(valore: number): string {
  return valore < 100 ? valore.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : euroInteri(valore)
}

// fascia di una tasca posseduta: reverse se la tasca è Reverse, o senza variante quando si possiede la Reverse
// (come il dettaglio, varianteMostrata); se mancano, i normali; se mancano anche quelli, il prezzo singolo
function fasciaTasca(s: SlotBinder, haReverse: boolean): [number, number] {
  const o = s.oggetto
  const reverse = s.variante === 'REVERSE_HOLO' || (s.variante === null && haReverse)
  const minimo = (reverse ? o.prezzoMinimoReverse : null) ?? o.prezzoMinimo ?? o.prezzo
  const massimo = (reverse ? o.prezzoMassimoReverse : null) ?? o.prezzoMassimo ?? o.prezzo
  return [minimo, massimo]
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
    ...possedute.reduce(
      (somme, s) => {
        const [minimo, massimo] = fasciaTasca(s, possiede(s.oggetto.id, 'REVERSE_HOLO'))
        return { valoreMinimo: somme.valoreMinimo + minimo, valoreMassimo: somme.valoreMassimo + massimo }
      },
      { valoreMinimo: 0, valoreMassimo: 0 },
    ),
  }
}
