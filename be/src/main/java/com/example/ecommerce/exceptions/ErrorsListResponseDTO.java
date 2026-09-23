package com.example.ecommerce.exceptions;

import java.time.Instant;
import java.util.Map;

// errori di validazione: campo -> messaggio
public record ErrorsListResponseDTO(String message, Instant timestamp, Map<String, String> errors) {

    public ErrorsListResponseDTO(String message, Map<String, String> errors) {
        this(message, Instant.now(), errors);
    }
}
