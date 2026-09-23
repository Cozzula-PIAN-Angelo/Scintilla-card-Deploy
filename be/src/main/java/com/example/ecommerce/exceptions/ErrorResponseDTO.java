package com.example.ecommerce.exceptions;

import java.time.Instant;

public record ErrorResponseDTO(String message, Instant timestamp) {

    public ErrorResponseDTO(String message) {
        this(message, Instant.now());
    }
}
