package com.example.ecommerce.payloads;

import jakarta.validation.constraints.Size;

// descrizione del set per la vetrina della home: vuota o null la toglie
public record ModificaEspansioneDTO(
        @Size(max = 600, message = "La descrizione può avere al massimo 600 caratteri")
        String descrizione
) {
}
