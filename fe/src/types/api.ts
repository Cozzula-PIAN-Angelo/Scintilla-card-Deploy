export const RUOLO_ADMIN = 'ADMIN'

export interface Pagina<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ParametriPagina {
  page: number
  size: number
  sort?: string
}

export interface Utente {
  id: string
  username: string
  email: string
  ruoli: string[]
}

// varianti di stampa di una carta (stessi valori dell'enum del backend)
export type Variante = 'NORMALE' | 'REVERSE_HOLO' | 'HOLO' | 'PRIMA_EDIZIONE' | 'PRIMA_EDIZIONE_HOLO'

// copie possedute di una carta in una variante (le righe a quantità 0 non esistono)
export interface Copia {
  oggettoId: string
  variante: Variante
  quantita: number
}

export interface Oggetto {
  id: string
  nome: string
  prezzo: number
  createdAt: string
  immagineUrl: string | null
  // versione leggera per griglie e miniature; la grande resta per il dettaglio
  immagineUrlPiccola: string | null
  idEsterno: string | null
  // varianti suggerite da pokemontcg.io; null = non ancora lette, [] = non indicate
  varianti: Variante[] | null
}

// espansione (set) di pokemontcg.io; importata = carte già nel catalogo
export interface Espansione {
  id: string
  nome: string
  serie: string | null
  dataUscita: string | null
  totaleCarte: number | null
  logoUrl: string | null
  simboloUrl: string | null
  importata: boolean
}

export interface Preferito {
  oggetto: Oggetto
  aggiuntoIl: string
}

export type MotivoBinder = 'NESSUNO' | 'STELLE' | 'FULMINI' | 'POKEBALL' | 'POIS' | 'OLOGRAFICO'

// album di carte dell'utente: pagine di tasche (4, 9 o 12 per pagina)
export interface Binder {
  id: string
  nome: string
  tasche: number
  pagine: number
  colore: string
  motivo: MotivoBinder
  cartaCopertina: Oggetto | null
  // null senza immagine di copertina caricata; altrimenti fa da versione
  immagineAggiornataIl: string | null
  carteInserite: number
  // le carte non possedute si vedono in grigio nelle tasche
  mostraMancanti: boolean
  createdAt: string
}

// tasca occupata; pagina e posizione partono da 0
export interface SlotBinder {
  pagina: number
  posizione: number
  oggetto: Oggetto
}

export interface BinderDettaglio {
  binder: Binder
  slot: SlotBinder[]
  // copie possedute delle carte inserite nel binder
  collezione: Copia[]
}

// impostazioni inviate in creazione e in modifica (sempre tutte)
export interface DatiBinder {
  nome: string
  tasche: number
  pagine: number
  colore: string
  motivo: MotivoBinder
  cartaCopertinaId: string | null
  mostraMancanti: boolean
}

export interface CartaEsterna {
  idEsterno: string
  nome: string
  espansione: string | null
  numero: string | null
  rarita: string | null
  immagineUrl: string | null
  // versione leggera per griglie e miniature; la grande resta per il dettaglio
  immagineUrlPiccola: string | null
  prezzoSuggerito: number | null
  giaImportata: boolean
}

// il backend accetta email oppure username nello stesso campo
export interface DatiLogin {
  identificativo: string
  password: string
}

export interface RispostaLogin {
  token: string
}

export interface DatiRegistrazione {
  username: string
  email: string
  password: string
}

export interface DatiOggetto {
  nome: string
  prezzo: number
}

export interface ErroreApi {
  message: string
  timestamp: string
  errors?: Record<string, string>
}
