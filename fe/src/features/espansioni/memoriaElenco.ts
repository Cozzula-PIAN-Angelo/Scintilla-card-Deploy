// Da dove si è aperta un'espansione: tornando alla vetrina con "indietro" si riparte dallo
// stesso punto, con l'ultimo set evidenziato. Basta la memoria della pagina: ricaricando si riparte da capo
export const memoriaElenco: { posizione: number | null; ultimaAperta: string | null } = {
  posizione: null,
  ultimaAperta: null,
}
