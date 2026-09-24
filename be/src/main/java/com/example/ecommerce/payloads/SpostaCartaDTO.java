package com.example.ecommerce.payloads;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// sposta la carta di una tasca in un'altra; se l'arrivo è occupato, le due carte si scambiano
public record SpostaCartaDTO(
        @NotNull(message = "La pagina di partenza è obbligatoria")
        @Min(value = 0, message = "La pagina non può essere negativa")
        Integer daPagina,

        @NotNull(message = "La posizione di partenza è obbligatoria")
        @Min(value = 0, message = "La posizione non può essere negativa")
        Integer daPosizione,

        @NotNull(message = "La pagina di arrivo è obbligatoria")
        @Min(value = 0, message = "La pagina non può essere negativa")
        Integer aPagina,

        @NotNull(message = "La posizione di arrivo è obbligatoria")
        @Min(value = 0, message = "La posizione non può essere negativa")
        Integer aPosizione
) {
}
