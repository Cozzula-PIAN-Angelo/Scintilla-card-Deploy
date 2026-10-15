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
export type Variante = 'NORMALE' | 'REVERSE_HOLO' | 'PRIMA_EDIZIONE'

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
  // rarità di pokemontcg.io (es. "Double Rare"); null = non ancora letta, '' = non indicata
  rarita: string | null
  // autori della carta, coautori divisi; vuota finché pokemontcg.io non è stato letto
  artisti: ArtistaCarta[]
}

// un autore di una carta; slug null = artista non ancora nell'elenco (nome senza link)
export interface ArtistaCarta {
  nome: string
  slug: string | null
}

// artista nell'elenco della sezione Artisti; avatar null per "Artista sconosciuto"
export interface Artista {
  slug: string
  nome: string
  carte: number
  avatar: string | null
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
  // solo in creazione: binder checklist del set, pagine calcolate dal backend
  espansioneId?: string
  numeroPokedex?: number
}

export type CriterioOrdine = 'SET_NUMERO' | 'POKEDEX' | 'NOME' | 'RARITA'

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

// statistiche della collezione (GET /me/statistiche)
export interface AvanzamentoSet {
  id: string
  nome: string
  serie: string | null
  simboloUrl: string | null
  dataUscita: string | null
  // carte diverse del set con almeno una copia
  possedute: number
  totale: number
}

export interface CartaPreziosa {
  oggetto: Oggetto
  copie: number
  // prezzo × copie
  valore: number
}

export interface Statistiche {
  totali: {
    carteDiverse: number
    copie: number
    copiePerVariante: Partial<Record<Variante, number>>
    setIniziati: number
    setCompletati: number
    binder: number
    carteNeiBinder: number
  }
  valore: { totale: number; piuPreziose: CartaPreziosa[] }
  // set iniziati, dal più recente
  set: AvanzamentoSet[]
  // numeri di Pokédex presenti in almeno una carta posseduta
  pokemon: number[]
}
