package com.example.ecommerce.payloads;

import jakarta.validation.constraints.NotBlank;

// cancellazione del proprio account: la password conferma che è davvero il titolare
public record CancellaAccountDTO(
        @NotBlank(message = "Inserisci la password per confermare")
        String password
) {
}
