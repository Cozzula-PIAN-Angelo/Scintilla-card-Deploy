package com.example.ecommerce.payloads;

import jakarta.validation.constraints.NotNull;

public record RiordinaDTO(
        @NotNull(message = "Il criterio è obbligatorio")
        CriterioOrdine criterio
) {
}
