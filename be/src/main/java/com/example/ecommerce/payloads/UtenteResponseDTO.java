package com.example.ecommerce.payloads;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

// avatarAggiornatoIl: versione dell'immagine profilo per la navbar, solo in GET /me (altrove null)
public record UtenteResponseDTO(UUID id, String username, String email, List<String> ruoli, Instant avatarAggiornatoIl) {
}
