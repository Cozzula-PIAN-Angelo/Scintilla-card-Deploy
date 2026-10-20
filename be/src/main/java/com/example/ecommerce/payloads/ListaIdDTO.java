package com.example.ecommerce.payloads;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

// lista completa e ordinata di carte o binder del profilo: sostituisce quella salvata
public record ListaIdDTO(@NotNull(message = "La lista degli id è obbligatoria") List<UUID> ids) {
}
