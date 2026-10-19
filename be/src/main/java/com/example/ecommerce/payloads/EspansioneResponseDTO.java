package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Espansione;

import java.time.LocalDate;

public record EspansioneResponseDTO(String id,
                                    String nome,
                                    String serie,
                                    LocalDate dataUscita,
                                    Integer totaleCarte,
                                    String logoUrl,
                                    String simboloUrl,
                                    boolean importata) {

    public static EspansioneResponseDTO from(Espansione espansione) {
        return new EspansioneResponseDTO(
                espansione.getId(),
                espansione.getNome(),
                espansione.getSerie(),
                espansione.getDataUscita(),
                espansione.getTotaleCarte(),
                espansione.getLogoUrl(),
                espansione.getSimboloUrl(),
                espansione.isImportata()
        );
    }
}
