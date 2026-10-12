package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Variante;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// aggiunge (delta positivo) o toglie (delta negativo) copie di una carta in una variante
public record ModificaCollezioneDTO(
        @NotNull(message = "La carta è obbligatoria")
        UUID oggettoId,

        @NotNull(message = "La variante è obbligatoria")
        Variante variante,

        @NotNull(message = "Il delta è obbligatorio")
        @Min(value = -99, message = "Il delta non può essere inferiore a -99")
        @Max(value = 99, message = "Il delta non può essere superiore a 99")
        Integer delta
) {
}
