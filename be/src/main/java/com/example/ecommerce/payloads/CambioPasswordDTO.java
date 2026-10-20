package com.example.ecommerce.payloads;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// il limite in byte di BCrypt (72) lo controlla AccountService, come per la registrazione
public record CambioPasswordDTO(
        @NotBlank(message = "La password attuale è obbligatoria")
        String passwordAttuale,

        @NotBlank(message = "La nuova password è obbligatoria")
        @Size(min = 8, max = 72, message = "La password deve avere tra 8 e 72 caratteri")
        String nuovaPassword
) {
}
