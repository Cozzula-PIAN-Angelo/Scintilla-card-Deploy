package com.example.ecommerce.payloads;

// esito dell'import in blocco di un set: saltate = già presenti nel catalogo,
// scartate = prezzo suggerito oltre il massimo ammesso
public record ImportaSetResponseDTO(String setId, int trovate, int importate, int saltate, int scartate) {
}
