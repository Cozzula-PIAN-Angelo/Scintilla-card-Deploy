package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.BadRequestException;

// controllo delle immagini caricate dagli utenti (copertine dei binder, immagine profilo):
// il browser le ridimensiona e comprime prima dell'invio, ne arrivano 100-300 KB
public final class FormatoImmagine {

    public static final int DIMENSIONE_MASSIMA = 1024 * 1024;

    private FormatoImmagine() {
    }

    // il tipo si ricava dai primi byte, non dall'header: così si salvano solo immagini vere
    public static String controlla(byte[] b) {
        if (b == null || b.length == 0) {
            throw new BadRequestException("L'immagine è vuota");
        }
        if (b.length > DIMENSIONE_MASSIMA) {
            throw new BadRequestException("L'immagine supera 1 MB");
        }
        if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "image/png";
        }
        if (b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        throw new BadRequestException("Formato non supportato: carica un'immagine JPEG, PNG o WebP");
    }
}
