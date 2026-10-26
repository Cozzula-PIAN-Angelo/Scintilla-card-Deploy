package com.example.ecommerce.payloads;

import java.util.List;

// un illustratore sul muro della pagina Illustratori (vedi VetrinaArtistiService)
public record AnteprimaArtistaDTO(String slug,
                                  String nome,
                                  // tutte le sue carte secondo artisti.json, anche quelle non ancora scaricate
                                  int carte,
                                  // carte da cui ritagliare il disegno, prima i Pokémon col riquadro classico; qualcuna
                                  // in più perché TCGdex non ha tutte le immagini (il frontend usa la prima che si carica)
                                  List<CartaAnteprimaDTO> illustrazioni) {
}
