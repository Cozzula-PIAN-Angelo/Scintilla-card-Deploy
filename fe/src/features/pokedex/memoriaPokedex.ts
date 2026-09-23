// Da dove si è aperto un Pokémon: tornando al Pokédex si riparte dallo stesso punto, con l'ultimo
// Pokémon evidenziato. Basta la memoria della pagina: ricaricando si riparte da capo
export const memoriaPokedex: { posizione: number | null; ultimo: number | null } = {
  posizione: null,
  ultimo: null,
}
