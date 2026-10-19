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
                                    boolean importata,
                                    // nessuna carta con varianti lette: nel master set decide la rarità (VariantiMaster)
                                    boolean senzaDati) {

    public static EspansioneResponseDTO from(Espansione espansione, boolean senzaDati) {
        return new EspansioneResponseDTO(
                espansione.getId(),
                espansione.getNome(),
                espansione.getSerie(),
                espansione.getDataUscita(),
                espansione.getTotaleCarte(),
                espansione.getLogoUrl(),
                espansione.getSimboloUrl(),
                espansione.isImportata(),
                senzaDati
        );
    }
}
