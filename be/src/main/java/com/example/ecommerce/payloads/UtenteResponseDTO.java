package com.example.ecommerce.payloads;

import java.util.List;
import java.util.UUID;

public record UtenteResponseDTO(UUID id, String username, String email, List<String> ruoli) {
}
