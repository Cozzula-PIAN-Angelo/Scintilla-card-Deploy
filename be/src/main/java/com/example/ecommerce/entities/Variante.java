package com.example.ecommerce.entities;

import java.util.Collection;
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

    // varianti suggerite dalle chiavi di tcgplayer.prices di pokemontcg.io. Senza doppioni e nell'ordine
    // dell'enum; le chiavi sconosciute si ignorano; senza chiavi (o null) la lista è vuota, mai null
    public static List<Variante> daChiaviTcgplayer(Collection<String> chiavi) {
        if (chiavi == null) {
            return List.of();
        }
        EnumSet<Variante> trovate = EnumSet.noneOf(Variante.class);
        for (String chiave : chiavi) {
            Variante variante = daChiave(chiave);
            if (variante != null) {
                trovate.add(variante);
            }
        }
        return List.copyOf(trovate);
    }

    private static Variante daChiave(String chiave) {
        if (chiave == null) {
            return null;
        }
        return switch (chiave) {
            // holofoil è la stampa standard delle rare holo: conta come Normale (e come 1ª edizione la sua 1ª edizione)
            case "normal", "unlimited", "holofoil", "unlimitedHolofoil" -> NORMALE;
            case "reverseHolofoil" -> REVERSE_HOLO;
            case "1stEditionNormal", "1stEdition", "1stEditionHolofoil" -> PRIMA_EDIZIONE;
            default -> null;
        };
    }
}
