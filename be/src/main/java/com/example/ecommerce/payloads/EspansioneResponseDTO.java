package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Espansione;

import java.time.LocalDate;

public record EspansioneResponseDTO(String id,
                                    String nome,
                                    String serie,
                                    LocalDate dataUscita,
                                    Integer totaleCarte,
                                    // null = non ancora lette da TCGdex
                                    Integer carteUfficiali,
                                    String logoUrl,
                                    String simboloUrl,
                                    boolean importata,
                                    // scritta dall'admin; null = nessuna
                                    String descrizione) {

    public static EspansioneResponseDTO from(Espansione espansione) {
        return new EspansioneResponseDTO(
                espansione.getId(),
                espansione.getNome(),
                espansione.getSerie(),
                espansione.getDataUscita(),
                espansione.getTotaleCarte(),
                espansione.getCarteUfficiali(),
                espansione.getLogoUrl(),
                espansione.getSimboloUrl(),
                espansione.isImportata(),
                espansione.getDescrizione()
        );
    }
}
