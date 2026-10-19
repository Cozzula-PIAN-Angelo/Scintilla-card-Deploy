// un 401 su queste chiamate non significa "sessione scaduta": credenziali errate o logout già avvenuto
const SENZA_SCADENZA = ['/auth/login', '/auth/logout']

// la sessione si chiude (logout locale e cache svuotata) solo con un 401 a chi aveva un token. Senza token non c'è
// niente da chiudere, e svuotare la cache farebbe ripartire le stesse richieste: di nuovo 401, all'infinito
export function sessioneDaChiudere(stato: number | string | undefined, url: string, token: string | null): boolean {
  return stato === 401 && token !== null && !SENZA_SCADENZA.includes(url)
}
