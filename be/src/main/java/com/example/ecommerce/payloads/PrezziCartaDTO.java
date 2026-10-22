package com.example.ecommerce.payloads;

// fascia di prezzo di una carta nel dettaglio: normale e reverse (valori holo di Cardmarket), null quando mancano.
// aggiornatoIl: data ISO dell'ultimo aggiornamento di TCGdex. Tutto null per le carte senza dati (o create a mano)
public record PrezziCartaDTO(FasciaPrezzoDTO normale, FasciaPrezzoDTO reverse, String aggiornatoIl) {
}
