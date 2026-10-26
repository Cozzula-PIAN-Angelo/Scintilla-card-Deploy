package com.example.ecommerce.payloads;

// la carta di un illustratore per il muro, per l'admin che la sceglie (GET /artisti/{slug}/carta-simbolo)
public record CartaSimboloDTO(
        // scelta dall'admin e presente in archivio; null = vale quella automatica
        CartaAnteprimaDTO scelta,
        // quella che il muro userebbe senza la scelta dell'admin; null = nessuna carta in archivio
        CartaAnteprimaDTO automatica,
        // l'illustratore è sul muro questa settimana
        boolean sulMuro) {
}
