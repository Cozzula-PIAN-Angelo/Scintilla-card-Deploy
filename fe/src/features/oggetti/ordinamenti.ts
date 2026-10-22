export type Verso = 'asc' | 'desc'

// un criterio è un pulsante: il primo tocco usa versoIniziale, ritoccandolo si inverte
export interface CriterioOrdinamento {
  campo: string
  etichetta: string
  versoIniziale: Verso
  descrizioni: Record<Verso, string>
}

export const ORDINAMENTO_PREDEFINITO = 'createdAt,desc'

const PREZZO: CriterioOrdinamento = {
  campo: 'prezzo',
  etichetta: 'Prezzo',
  versoIniziale: 'asc',
  descrizioni: { asc: 'Prezzo crescente', desc: 'Prezzo decrescente' },
}

const NOME: CriterioOrdinamento = {
  campo: 'nome',
  etichetta: 'Nome',
  versoIniziale: 'asc',
  descrizioni: { asc: 'Nome A-Z', desc: 'Nome Z-A' },
}

export const ORDINAMENTI_CATALOGO: CriterioOrdinamento[] = [
  { campo: 'createdAt', etichetta: 'Data', versoIniziale: 'desc', descrizioni: { desc: 'Più recenti', asc: 'Meno recenti' } },
  PREZZO,
  NOME,
]

// nei preferiti createdAt è la data di aggiunta
export const ORDINAMENTI_PREFERITI: CriterioOrdinamento[] = [
  { campo: 'createdAt', etichetta: 'Aggiunta', versoIniziale: 'desc', descrizioni: { desc: 'Aggiunte di recente', asc: 'Aggiunte per prime' } },
  PREZZO,
  NOME,
]

// i valori di sort che il backend accetta: ogni criterio in tutti e due i versi
export function valoriOrdinamento(criteri: readonly CriterioOrdinamento[]): string[] {
  return criteri.flatMap((c) => [`${c.campo},asc`, `${c.campo},desc`])
}

export function leggiOrdinamento(valore: string): { campo: string; verso: Verso } {
  const [campo, verso] = valore.split(',')
  return { campo, verso: verso === 'desc' ? 'desc' : 'asc' }
}

// il criterio già attivo si inverte, un altro parte dal suo verso iniziale
export function prossimoOrdinamento(attuale: string, criterio: CriterioOrdinamento): string {
  const { campo, verso } = leggiOrdinamento(attuale)
  if (campo !== criterio.campo) return `${criterio.campo},${criterio.versoIniziale}`
  return `${campo},${verso === 'asc' ? 'desc' : 'asc'}`
}
