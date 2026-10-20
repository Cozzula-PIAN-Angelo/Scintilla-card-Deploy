package com.example.ecommerce.payloads;

import java.util.List;

// carte di un set, di un Pokémon o di un artista. completo: tutte quelle del catalogo; altrimenti solo la pagina
// chiesta, presa al volo da TCGdex mentre il resto si scarica in background (totale = carte del filtro su TCGdex).
// fallito: lo scaricamento in background è fallito da poco (sempre false se completo)
public record CarteDTO(boolean completo, int totale, List<OggettoResponseDTO> carte, boolean fallito) {

    public static CarteDTO completo(List<OggettoResponseDTO> carte) {
        return new CarteDTO(true, carte.size(), carte, false);
    }
}
