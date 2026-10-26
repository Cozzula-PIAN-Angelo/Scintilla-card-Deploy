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
  // versione dell'immagine profilo (null se non c'è): finisce nell'URL, vedi avatarUrl
  avatarAggiornatoIl: string | null
}

// varianti di stampa di una carta (stessi valori dell'enum del backend)
export type Variante = 'NORMALE' | 'REVERSE_HOLO' | 'PRIMA_EDIZIONE'

// copie possedute di una carta in una variante (le righe a quantità 0 non esistono)
export interface Copia {
  oggettoId: string
  variante: Variante
  quantita: number
}

// prezzi di Cardmarket in euro per una variante, nel dettaglio della carta. minimo: l'offerta più bassa;
// massimo: il più alto tra media, trend e medie a 1/7/30 giorni
export interface FasciaPrezzo {
  minimo: number
  massimo: number
  trend: number | null
  media30: number | null
}

// letti al momento da TCGdex; tutto null per le carte senza dati (o create a mano)
export interface PrezziCarta {
  normale: FasciaPrezzo | null
  reverse: FasciaPrezzo | null
  aggiornatoIl: string | null
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
  // varianti suggerite da TCGdex; null = non ancora lette, [] = non indicate
  varianti: Variante[] | null
  // rarità di TCGdex (es. "Double rare"); null = non ancora letta, '' = non indicata
  rarita: string | null
  // autori della carta, coautori divisi; vuota finché TCGdex non è stato letto
  artisti: ArtistaCarta[]
  // minimo e massimo di Cardmarket salvati (normale e reverse) per il valore del binder; null = non letti o non disponibili
  prezzoMinimo: number | null
  prezzoMassimo: number | null
  prezzoMinimoReverse: number | null
  prezzoMassimoReverse: number | null
}

// un autore di una carta; slug null = artista non ancora nell'elenco (nome senza link)
export interface ArtistaCarta {
  nome: string
  slug: string | null
}

// artista nell'elenco della sezione Artisti; avatar null per "Illustratore sconosciuto"
export interface Artista {
  slug: string
  nome: string
  carte: number
  avatar: string | null
}

// espansione (set) di TCGdex; importata = carte già nel catalogo
export interface Espansione {
  id: string
  nome: string
  serie: string | null
  dataUscita: string | null
  totaleCarte: number | null
  // carte ufficiali di TCGdex: quelle oltre sono le segrete. null = non ancora lette
  carteUfficiali: number | null
  logoUrl: string | null
  simboloUrl: string | null
  importata: boolean
  // set di un gioco digitale (TCG Pocket): in home ha la sua riga
  digitale: boolean
  // scritta dall'admin per la hero della home; null = nessuna
  descrizione: string | null
}

// carta nella vetrina della home (GET /espansioni/anteprime): nome senza il set tra parentesi, numero nel set
export interface CartaAnteprima {
  id: string
  nome: string
  numero: string | null
  rarita: string | null
  immagineUrl: string | null
  immagineUrlPiccola: string | null
}

// illustratore sul muro della pagina Illustratori (GET /artisti/anteprime)
export interface AnteprimaArtista {
  slug: string
  nome: string
  carte: number
  // carte da cui ritagliare il disegno, prima i Pokémon col riquadro classico; le altre sono di riserva
  // (TCGdex non ha tutte le immagini)
  illustrazioni: CartaAnteprima[]
}

export interface VetrinaArtisti {
  sulMuro: AnteprimaArtista[]
  // slug -> le sue tre carte più preziose già in archivio; manca chi non ne ha ancora
  carteIndice: Record<string, CartaAnteprima[]>
}

// una rarità del set, quante carte ne ha e quanto è ambita (6 la più alta, vedi GradoRarita nel backend)
export interface RaritaContata {
  rarita: string
  quante: number
  grado: number
}

// un set della vetrina: il primo è la hero. Carte di punta dalla più preziosa, con qualcuna di riserva per le
// immagini che TCGdex non ha; carte di sfondo solo per il primo; rarità dalle ultra rare in su
export interface AnteprimaSet {
  espansione: Espansione
  carteDiPunta: CartaAnteprima[]
  carteSfondo: CartaAnteprima[]
  raritaAmbite: RaritaContata[]
}

// carte di un set, di un Pokémon o di un artista (GET .../carte?pagina=). completo: tutte quelle del catalogo;
// altrimenti solo la pagina chiesta, presa al volo da TCGdex mentre il resto si scarica in background
export interface CarteProgressive {
  completo: boolean
  // a pezzi: il totale delle carte su TCGdex
  totale: number
  carte: Oggetto[]
  // lo scaricamento in background è fallito da poco: si riprova più tardi
  fallito: boolean
}

// a che punto è lo scaricamento (GET .../carte/stato): il frontend lo chiede ogni 3 secondi mentre è a pezzi
export interface StatoCarte {
  completo: boolean
  fallito: boolean
}

// pagina da 0; senza, la lista intera (o la prima pagina, se a pezzi). intera: non va al backend, separa nella
// cache la lista intera dalla prima risposta (vedi argomentoCarte)
export interface RichiestaCarte<K> {
  chiave: K
  pagina?: number
  intera?: boolean
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
  // null = una variante qualsiasi; NORMALE o REVERSE_HOLO nel binder del master set
  variante: Variante | null
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
  // slug dell'artista
  artista?: string
  // con espansioneId: binder del master set, Normale e Reverse affiancate
  master?: boolean
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
  // voci del master set (carta, variante) possedute e totali; null per i set non importati
  posseduteMaster: number | null
  totaleMaster: number | null
}

export interface CartaPreziosa {
  oggetto: Oggetto
  nomeSet: string | null
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

// profilo dell'utente, senza email: la forma della futura pagina pubblica.
// iscrittoIl null per gli account creati prima che si salvasse; squadra[0] è il compagno
export interface Profilo {
  id: string
  username: string
  iscrittoIl: string | null
  avatarAggiornatoIl: string | null
  bio: string | null
  colore: string | null
  squadra: number[]
  vetrina: Oggetto[]
  binder: Binder[]
  riepilogo: {
    carteDiverse: number
    setCompletati: number
    pokemonPosseduti: number
    binder: number
  }
}
