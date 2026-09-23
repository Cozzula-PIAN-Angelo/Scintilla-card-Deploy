package com.example.ecommerce.payloads;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record NuovoOggettoDTO(
        @NotBlank(message = "Il nome è obbligatorio")
        String nome,

        @NotNull(message = "Il prezzo è obbligatorio")
        @DecimalMin(value = "0.01", message = "Il prezzo deve essere almeno 0.01")
        @Digits(integer = 6, fraction = 2, message = "Il prezzo può avere al massimo 6 cifre intere e 2 decimali")
        BigDecimal prezzo
) {
}
