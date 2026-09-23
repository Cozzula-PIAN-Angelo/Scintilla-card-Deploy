export interface OpzioneOrdinamento {
  valore: string
  etichetta: string
}

export const ORDINAMENTO_PREDEFINITO = 'createdAt,desc'

export const ORDINAMENTI_CATALOGO: OpzioneOrdinamento[] = [
  { valore: 'createdAt,desc', etichetta: 'Più recenti' },
  { valore: 'prezzo,asc', etichetta: 'Prezzo crescente' },
  { valore: 'prezzo,desc', etichetta: 'Prezzo decrescente' },
  { valore: 'nome,asc', etichetta: 'Nome A-Z' },
]

// nei preferiti createdAt è la data di aggiunta
export const ORDINAMENTI_PREFERITI: OpzioneOrdinamento[] = [
  { valore: 'createdAt,desc', etichetta: 'Aggiunte di recente' },
  { valore: 'prezzo,asc', etichetta: 'Prezzo crescente' },
  { valore: 'prezzo,desc', etichetta: 'Prezzo decrescente' },
  { valore: 'nome,asc', etichetta: 'Nome A-Z' },
]
