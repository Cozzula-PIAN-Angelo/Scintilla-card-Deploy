package com.example.ecommerce.payloads;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// mette una carta in una tasca; se la tasca era occupata, la carta precedente viene sostituita
public record InserisciCartaDTO(
        @NotNull(message = "La pagina è obbligatoria")
        @Min(value = 0, message = "La pagina non può essere negativa")
        Integer pagina,

        @NotNull(message = "La posizione è obbligatoria")
        @Min(value = 0, message = "La posizione non può essere negativa")
        Integer posizione,

        @NotNull(message = "La carta è obbligatoria")
        UUID oggettoId
) {
}
