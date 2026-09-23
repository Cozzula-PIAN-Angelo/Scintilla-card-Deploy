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
                                 // versione leggera per le griglie (60-170 KB invece di 700 KB-1 MB)
                                 String immagineUrlPiccola,
                                 String idEsterno) {

    public static OggettoResponseDTO from(Oggetto oggetto) {
        return new OggettoResponseDTO(
                oggetto.getId(),
                oggetto.getNome(),
                oggetto.getPrezzo(),
                oggetto.getCreatedAt(),
                oggetto.getImmagineUrl(),
                immaginePiccola(oggetto.getImmagineUrl()),
                oggetto.getIdEsterno()
        );
    }

    // si ricava dall'immagine grande salvata, così le carte già importate non vanno reimportate:
    // images.pokemontcg.io/base1/4_hires.png -> base1/4.png, images.scrydex.com/.../large -> .../small.
    // Per gli altri indirizzi (es. oggetti creati a mano) si usa quello originale
    public static String immaginePiccola(String grande) {
        if (grande == null) {
            return null;
        }
        if (grande.contains("images.pokemontcg.io/") && grande.endsWith("_hires.png")) {
            return grande.substring(0, grande.length() - "_hires.png".length()) + ".png";
        }
        if (grande.contains("images.scrydex.com/") && grande.endsWith("/large")) {
            return grande.substring(0, grande.length() - "/large".length()) + "/small";
        }
        return grande;
    }
}
