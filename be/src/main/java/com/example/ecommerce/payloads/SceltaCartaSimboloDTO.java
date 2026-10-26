package com.example.ecommerce.payloads;

import jakarta.validation.constraints.NotBlank;

// carta simbolo scelta dall'admin per un illustratore: id di TCGdex di una sua carta già in archivio
public record SceltaCartaSimboloDTO(
        @NotBlank(message = "Scegli una carta")
        String idEsterno
) {
}
