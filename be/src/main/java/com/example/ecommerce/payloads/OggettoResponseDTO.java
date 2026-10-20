package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Variante;
import com.example.ecommerce.services.ElencoArtisti;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OggettoResponseDTO(UUID id,
                                 String nome,
                                 BigDecimal prezzo,
                                 Instant createdAt,
                                 String immagineUrl,
                                 // versione leggera per le griglie (60-170 KB invece di 700 KB-1 MB)
                                 String immagineUrlPiccola,
                                 String idEsterno,
                                 // null = non ancora lette da TCGdex
                                 List<Variante> varianti,
                                 // null = non ancora letta da TCGdex
                                 String rarita,
                                 // autori (coautori divisi) con lo slug per il link alla loro pagina; vuota = non ancora letti
                                 List<ArtistaCartaDTO> artisti) {

    public static OggettoResponseDTO from(Oggetto oggetto) {
        return new OggettoResponseDTO(
                oggetto.getId(),
                oggetto.getNome(),
                oggetto.getPrezzo(),
                oggetto.getCreatedAt(),
                oggetto.getImmagineUrl(),
                immaginePiccola(oggetto.getImmagineUrl()),
                oggetto.getIdEsterno(),
                oggetto.getVarianti(),
                oggetto.getRarita(),
                ElencoArtisti.get().artistiDi(oggetto.getArtista())
        );
    }

    // si ricava dall'immagine grande salvata, così le carte già importate non vanno reimportate:
    // assets.tcgdex.net/.../006/high.webp -> .../006/low.webp; le riserve di pokemontcg.io (e le carte non
    // convertite) images.pokemontcg.io/base1/4_hires.png -> base1/4.png, images.scrydex.com/.../large -> .../small.
    // Per gli altri indirizzi (oggetti creati a mano) si usa quello originale
    public static String immaginePiccola(String grande) {
        if (grande == null) {
            return null;
        }
        if (grande.contains("assets.tcgdex.net/") && grande.endsWith("/high.webp")) {
            return grande.substring(0, grande.length() - "/high.webp".length()) + "/low.webp";
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
