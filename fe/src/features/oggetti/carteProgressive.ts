import type { CarteProgressive } from '../../types/api'

// carte per pagina della griglia: la stessa pagina che il backend prende al volo da pokemontcg.io
export const PER_PAGINA = 24

// pagina da chiedere al backend: solo a pezzi e oltre la prima (senza pagina il backend dà la prima, o tutte se
// il set è completo). Completo o non ancora noto: undefined, cioè la lista intera
export function paginaDaChiedere(aPezzi: boolean, paginaUrl: number): number | undefined {
  return aPezzi && paginaUrl > 0 ? paginaUrl : undefined
}

// a pezzi dopo questa risposta; senza risposta (in caricamento) resta com'era
export function aPezziDopo(risposta: CarteProgressive | undefined, prima: boolean): boolean {
  return risposta ? !risposta.completo : prima
}

// pagine della griglia: dalle carte ricevute, oppure (a pezzi) dal totale del server
export function pagineTotali(numeroCarte: number, totaleServer?: number, perPagina = PER_PAGINA): number {
  return Math.ceil((totaleServer ?? numeroCarte) / perPagina)
}
