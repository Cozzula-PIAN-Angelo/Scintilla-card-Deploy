const CHIAVE_TOKEN = 'scintilla.token'

// localStorage può essere inaccessibile (navigazione privata, cookie bloccati):
// in quel caso il token resta solo in memoria per la sessione corrente
export function leggiToken(): string | null {
  try {
    return localStorage.getItem(CHIAVE_TOKEN)
  } catch {
    return null
  }
}

export function salvaToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CHIAVE_TOKEN, token)
    else localStorage.removeItem(CHIAVE_TOKEN)
  } catch {
    // storage non disponibile: nessuna persistenza
  }
}
