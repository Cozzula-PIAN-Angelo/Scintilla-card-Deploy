package com.example.ecommerce.payloads;

import jakarta.validation.constraints.NotNull;

import java.util.List;

// numeri del Pokédex della squadra, in ordine: il primo è il compagno
public record SquadraDTO(@NotNull(message = "La squadra è obbligatoria") List<Integer> numeri) {
}
