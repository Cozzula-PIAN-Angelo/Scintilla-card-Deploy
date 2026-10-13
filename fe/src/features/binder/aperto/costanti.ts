// chiuso → (la copertina si apre) → aperto → (si richiude) → chiusura, poi si torna alla mensola
export type Fase = 'chiuso' | 'apertura' | 'aperto' | 'chiusura'
export type Lato = 'sinistra' | 'destra'

// margine della copertina attorno al foglio, in % della larghezza della facciata (e quindi in cqw
// dentro la tavola): abbastanza da contenere foglio e pila sotto la curva della copertina
export const MARGINE_COPERTINA = 4

export const DURATA_COPERTINA = 1.1
export const DURATA_PAGINA = 0.75
export const CURVA = [0.45, 0.05, 0.2, 1] as const

// angoli del foglio: quasi vivi, a differenza della copertina imbottita (in cqw della tavola,
// o di un riquadro della stessa misura). Usati anche da PaginaBinder e dalla maniglia
export function angoliFoglio(lato: Lato) {
  return lato === 'sinistra' ? 'rounded-l-[1cqw] rounded-r-[0.3cqw]' : 'rounded-l-[0.3cqw] rounded-r-[1cqw]'
}
