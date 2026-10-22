package com.example.ecommerce.payloads;

import jakarta.validation.constraints.NotNull;

// decrescente facoltativo: senza, l'ordine è crescente come prima
public record RiordinaDTO(
        @NotNull(message = "Il criterio è obbligatorio")
        CriterioOrdine criterio,
        Boolean decrescente
) {
}
