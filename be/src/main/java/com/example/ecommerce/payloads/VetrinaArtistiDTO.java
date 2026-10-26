package com.example.ecommerce.payloads;

import java.util.List;
import java.util.Map;

// pagina Illustratori: chi è sul muro questa settimana e, per l'indice, le prime carte di ogni illustratore
public record VetrinaArtistiDTO(List<AnteprimaArtistaDTO> sulMuro,
                                // slug -> le sue carte più preziose già in archivio (al massimo tre); manca chi non ne ha
                                Map<String, List<CartaAnteprimaDTO>> carteIndice) {
}
