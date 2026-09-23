package com.example.ecommerce.payloads;

import jakarta.validation.constraints.NotBlank;

// identificativo: email oppure username
public record LoginDTO(
        @NotBlank(message = "Email o username obbligatori")
        String identificativo,

        @NotBlank(message = "La password è obbligatoria")
        String password
) {
}
