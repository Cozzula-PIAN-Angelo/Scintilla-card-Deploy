package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.UtenteOggettoPreferito;

import java.time.Instant;

public record PreferitoResponseDTO(OggettoResponseDTO oggetto, Instant aggiuntoIl) {

    public static PreferitoResponseDTO from(UtenteOggettoPreferito preferito) {
        return new PreferitoResponseDTO(OggettoResponseDTO.from(preferito.getOggetto()), preferito.getCreatedAt());
    }
}
