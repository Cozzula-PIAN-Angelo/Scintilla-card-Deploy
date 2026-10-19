package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Variante;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// una tasca della disposizione completa di un binder, inviata per ripristinarla (l'Annulla del riordino)
public record DisposizioneSlotDTO(
        @NotNull(message = "La pagina è obbligatoria")
        @Min(value = 0, message = "La pagina non può essere negativa")
        Integer pagina,

        @NotNull(message = "La posizione è obbligatoria")
        @Min(value = 0, message = "La posizione non può essere negativa")
        Integer posizione,

        @NotNull(message = "La carta è obbligatoria")
        UUID oggettoId,

        // facoltativa: null, NORMALE o REVERSE_HOLO (le altre le rifiuta il service)
        Variante variante
) {
}
