package com.example.ecommerce.payloads;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// bio e colore del profilo. Il frontend li invia sempre entrambi: null significa "vuoto", non "lascia com'è"
public record ModificaProfiloDTO(
        @Size(max = 160, message = "La bio può avere al massimo 160 caratteri")
        String bio,

        @Pattern(regexp = "#[0-9a-fA-F]{6}", message = "Il colore deve essere nel formato #rrggbb")
        String colore
) {
}
