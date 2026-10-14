package com.example.ecommerce.payloads;

// artista nell'elenco della sezione Artisti; avatar null per "Artista sconosciuto"
public record ArtistaResponseDTO(String slug, String nome, int carte, String avatar) {
}
