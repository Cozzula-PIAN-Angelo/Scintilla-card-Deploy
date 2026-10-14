// Da dove si è aperto un artista: tornando all'elenco si riparte dallo stesso punto, con l'ultimo
// artista evidenziato. Basta la memoria della pagina: ricaricando si riparte da capo
export const memoriaArtisti: { posizione: number | null; ultimo: string | null } = {
  posizione: null,
  ultimo: null,
}
