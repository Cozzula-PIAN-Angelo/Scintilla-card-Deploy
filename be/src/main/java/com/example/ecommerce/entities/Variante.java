package com.example.ecommerce.entities;

// versione di una carta che si può possedere. Salvata come testo: un valore nuovo (es. Shadowless)
// richiede una migrazione che aggiorni il vincolo ck_collezione_variante, altrimenti PostgreSQL lo rifiuta.
// L'ordine è quello di visualizzazione
public enum Variante {
    NORMALE,
    REVERSE_HOLO,
    HOLO,
    PRIMA_EDIZIONE,
    PRIMA_EDIZIONE_HOLO
}
