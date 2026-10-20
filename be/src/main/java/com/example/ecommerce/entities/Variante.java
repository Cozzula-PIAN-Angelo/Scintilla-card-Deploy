package com.example.ecommerce.entities;

import com.example.ecommerce.payloads.TcgdexApi;

import java.util.EnumSet;
import java.util.List;

// versione di una carta che si può possedere. Salvata come testo: un valore nuovo (es. Shadowless)
// richiede una migrazione che aggiorni il vincolo ck_collezione_variante, altrimenti PostgreSQL lo rifiuta.
// Nelle tasche dei binder (V8, ck_binder_slot_variante) sono ammesse solo NORMALE e REVERSE_HOLO, quelle del master set.
// L'ordine è quello di visualizzazione. Niente Holo: su una rara holo la stampa holo è quella normale (V6)
public enum Variante {
    NORMALE,
    REVERSE_HOLO,
    PRIMA_EDIZIONE;

    // varianti della carta su TCGdex. Senza doppioni e nell'ordine dell'enum; senza variants lista vuota, mai null
    public static List<Variante> daVariantiTcgdex(TcgdexApi.Varianti varianti) {
        if (varianti == null) {
            return List.of();
        }
        EnumSet<Variante> trovate = EnumSet.noneOf(Variante.class);
        // holo è la stampa standard delle rare holo: conta come Normale
        if (varianti.normal() || varianti.holo()) {
            trovate.add(NORMALE);
        }
        if (varianti.reverse()) {
            trovate.add(REVERSE_HOLO);
        }
        if (varianti.firstEdition()) {
            trovate.add(PRIMA_EDIZIONE);
        }
        return List.copyOf(trovate);
    }
}
