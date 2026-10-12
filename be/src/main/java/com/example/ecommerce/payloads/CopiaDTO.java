package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Variante;

import java.util.UUID;

// copie possedute di una carta in una variante
public record CopiaDTO(UUID oggettoId, Variante variante, int quantita) {
}
