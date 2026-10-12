package com.example.ecommerce.entities;

import java.util.Collection;
import java.util.EnumSet;
import java.util.List;

// versione di una carta che si può possedere. Salvata come testo: un valore nuovo (es. Shadowless)
// richiede una migrazione che aggiorni il vincolo ck_collezione_variante, altrimenti PostgreSQL lo rifiuta.
// L'ordine è quello di visualizzazione
public enum Variante {
    NORMALE,
    REVERSE_HOLO,
    HOLO,
    PRIMA_EDIZIONE,
    PRIMA_EDIZIONE_HOLO;

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
            case "normal", "unlimited" -> NORMALE;
            case "reverseHolofoil" -> REVERSE_HOLO;
            case "holofoil", "unlimitedHolofoil" -> HOLO;
            case "1stEditionNormal", "1stEdition" -> PRIMA_EDIZIONE;
            case "1stEditionHolofoil" -> PRIMA_EDIZIONE_HOLO;
            default -> null;
        };
    }
}
