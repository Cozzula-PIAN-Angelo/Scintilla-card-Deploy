package com.example.ecommerce.payloads;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

// PATCH: un campo null significa "non modificare"; i vincoli si applicano solo ai campi presenti
public record ModificaOggettoDTO(
        // null è ammesso, una stringa vuota o di soli spazi no
        @Pattern(regexp = ".*\\S.*", message = "Il nome non può essere vuoto")
        String nome,

        @DecimalMin(value = "0.01", message = "Il prezzo deve essere almeno 0.01")
        @Digits(integer = 6, fraction = 2, message = "Il prezzo può avere al massimo 6 cifre intere e 2 decimali")
        BigDecimal prezzo
) {
}
