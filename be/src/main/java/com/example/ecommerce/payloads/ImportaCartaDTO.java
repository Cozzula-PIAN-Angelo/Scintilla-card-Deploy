package com.example.ecommerce.payloads;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

import java.math.BigDecimal;

// prezzo facoltativo: se assente si usa il prezzo suggerito da Cardmarket
public record ImportaCartaDTO(
        @DecimalMin(value = "0.01", message = "Il prezzo deve essere almeno 0.01")
        @Digits(integer = 6, fraction = 2, message = "Il prezzo può avere al massimo 6 cifre intere e 2 decimali")
        BigDecimal prezzo
) {
}
