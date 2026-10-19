package com.example.ecommerce.payloads;

// a che punto è lo scaricamento delle carte di un set, Pokémon o artista: il frontend lo chiede ogni 3 secondi
// mentre mostra le pagine al volo, invece di richiedere ogni volta la pagina intera
public record StatoCarteDTO(boolean completo, boolean fallito) {
}
