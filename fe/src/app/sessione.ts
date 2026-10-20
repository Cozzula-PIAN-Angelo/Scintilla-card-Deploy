import { CHIAVE_TOKEN } from './storage'

// un 401 su queste chiamate non significa "sessione scaduta": credenziali errate o logout già avvenuto
const SENZA_SCADENZA = ['/auth/login', '/auth/logout']

// la sessione si chiude (logout locale e cache svuotata) solo con un 401 a chi aveva un token. Senza token non c'è
// niente da chiudere, e svuotare la cache farebbe ripartire le stesse richieste: di nuovo 401, all'infinito.
// Solo se la richiesta usava il token di adesso: dopo un cambio password quello vecchio torna 401, ma la sessione
// ha già quello nuovo
export function sessioneDaChiudere(
  stato: number | string | undefined,
  url: string,
  tokenAttuale: string | null,
  tokenRichiesta: string | null,
): boolean {
  return stato === 401 && tokenAttuale !== null && tokenRichiesta === tokenAttuale && !SENZA_SCADENZA.includes(url)
}

// evento storage: un'altra scheda ha salvato un token nuovo (cambio password). Lo si adotta, invece di usare quello
// vecchio, ricevere 401 e cancellare anche il token dell'altra scheda. Solo se questa scheda ha già una sessione
export function tokenDaAltraScheda(chiave: string | null, nuovo: string | null, attuale: string | null): string | null {
  if (chiave !== CHIAVE_TOKEN || !nuovo || !attuale || nuovo === attuale) return null
  return nuovo
}
