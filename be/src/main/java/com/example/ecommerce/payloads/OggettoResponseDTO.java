package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Oggetto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OggettoResponseDTO(UUID id,
                                 String nome,
                                 BigDecimal prezzo,
                                 Instant createdAt,
                                 String immagineUrl,
                                 String idEsterno) {

    public static OggettoResponseDTO from(Oggetto oggetto) {
        return new OggettoResponseDTO(
                oggetto.getId(),
                oggetto.getNome(),
                oggetto.getPrezzo(),
                oggetto.getCreatedAt(),
                oggetto.getImmagineUrl(),
                oggetto.getIdEsterno()
        );
    }
}
