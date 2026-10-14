package com.example.ecommerce.payloads;

// un autore della carta nel dettaglio: slug null = artista non ancora nell'elenco (uscito dopo
// la generazione di artisti.json), il nome si mostra senza link
public record ArtistaCartaDTO(String nome, String slug) {
}
