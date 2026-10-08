package com.example.ecommerce.payloads;

// esito dell'import in blocco di un set: saltate = già presenti nel catalogo,
// scartate = prezzo suggerito oltre il massimo ammesso, rinominate = importate con l'id
// di pokemontcg.io nel nome perché quello composto era già usato (contate anche in importate)
public record ImportaSetResponseDTO(String setId, int trovate, int importate, int saltate, int scartate, int rinominate) {
}
