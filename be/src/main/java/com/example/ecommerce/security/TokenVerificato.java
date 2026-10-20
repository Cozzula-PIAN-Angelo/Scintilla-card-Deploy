package com.example.ecommerce.security;

import java.time.Instant;
import java.util.UUID;

// token con firma e scadenza già verificate: l'utente, l'id del token (per la blacklist), la scadenza
// e l'emissione (per rifiutare i token emessi prima di un cambio password)
public record TokenVerificato(UUID idUtente, UUID jti, Instant scadenza, Instant emessoIl) {
}
