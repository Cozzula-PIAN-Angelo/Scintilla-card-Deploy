import type { CarteProgressive, Oggetto, RichiestaCarte, StatoCarte } from '../../types/api'

// carte per pagina della griglia: la stessa pagina che il backend prende al volo da TCGdex
export const PER_PAGINA = 24

// modalità delle carte di un set, Pokémon o artista. Va solo avanti (sconosciuta → a-pezzi → completa): la cache può
// ridare una risposta vecchia, e tornare indietro farebbe rimbalzare la richiesta tra due voci all'infinito
export type ModalitaCarte = 'sconosciuta' | 'a-pezzi' | 'completa'

// stato: il controllo leggero (vedi useCarteProgressive), che sa prima della pagina quando lo scaricamento è finito
export function modalitaDopo(prima: ModalitaCarte, risposta: CarteProgressive | undefined, stato?: StatoCarte): ModalitaCarte {
  if (prima === 'completa' || stato?.completo) return 'completa'
  if (!risposta) return prima
  return risposta.completo ? 'completa' : 'a-pezzi'
}

// richiesta per la modalità: sconosciuta senza pagina (il backend dà tutto, o la prima pagina); a pezzi la pagina
// dell'URL, ma la prima riusa la richiesta senza pagina (stessa risposta, niente doppione); completa la lista intera con `intera`, che il backend ignora ma dà una voce di cache nuova, diversa da
// quella della prima risposta (che può essere rimasta a pezzi)
export function argomentoCarte<K>(chiave: K, modalita: ModalitaCarte, paginaUrl: number): RichiestaCarte<K> {
  if (modalita === 'a-pezzi') return paginaUrl > 0 ? { chiave, pagina: paginaUrl } : { chiave }
  if (modalita === 'completa') return { chiave, intera: true }
  return { chiave }
}

// pagine della griglia: dalle carte ricevute, oppure (a pezzi) dal totale del server
export function pagineTotali(numeroCarte: number, totaleServer?: number, perPagina = PER_PAGINA): number {
  return Math.ceil((totaleServer ?? numeroCarte) / perPagina)
}

// ogni quanto si controlla lo stato mentre il resto si scarica: ogni 3 secondi; da fallito ogni 15 (il backend
// aspetta 2 minuti, poi il controllo stesso rilancia lo scaricamento); mai se completo
export function intervalloPolling(aPezzi: boolean, fallito: boolean): number {
  if (!aPezzi) return 0
  return fallito ? 15000 : 3000
}

// scheletro della griglia: carte non ancora arrivate, oppure a pezzi senza nemmeno un totale (artista sconosciuto,
// che si scarica solo per intero). Con un totale e la pagina vuota (oltre la fine) non si aspetta
export function inAttesa(stato: {
  carte: unknown[] | undefined
  isError: boolean
  aPezzi: boolean
  totaleServer: number | undefined
  fallito: boolean
}): boolean {
  if (stato.carte === undefined) return !stato.isError
  return stato.aPezzi && stato.carte.length === 0 && !stato.totaleServer && !stato.fallito
}

// pagina da chiedere in anticipo mentre si guarda paginaUrl: solo a pezzi, la successiva se esiste. Il backend la
// tiene in memoria qualche minuto, il frontend nella sua cache: cliccando «avanti» è già pronta
export function paginaDaPrecaricare(
  modalita: ModalitaCarte,
  paginaUrl: number,
  totale: number | undefined,
  fallito: boolean,
): number | undefined {
  if (modalita !== 'a-pezzi' || fallito || totale === undefined) return undefined
  const successiva = paginaUrl + 1
  return successiva < pagineTotali(0, totale) ? successiva : undefined
}

// cosa mostra la griglia. A pezzi la pagina col totale del server; completa la lista intera. Nel passaggio (lista
// intera non ancora arrivata) resta l'ultima pagina a pezzi, così la griglia non torna allo scheletro e non salta
export function vistaCarte(
  modalita: ModalitaCarte,
  dati: CarteProgressive | undefined,
  ultimaAPezzi: CarteProgressive | undefined,
): { carte: Oggetto[] | undefined; totaleServer: number | undefined; aPezzi: boolean } {
  if (modalita === 'completa' && dati?.completo) return { carte: dati.carte, totaleServer: undefined, aPezzi: false }
  const aPezzi = modalita === 'a-pezzi' ? dati : ultimaAPezzi
  if (aPezzi && !aPezzi.completo) return { carte: aPezzi.carte, totaleServer: aPezzi.totale, aPezzi: true }
  return { carte: undefined, totaleServer: undefined, aPezzi: modalita === 'a-pezzi' }
}
