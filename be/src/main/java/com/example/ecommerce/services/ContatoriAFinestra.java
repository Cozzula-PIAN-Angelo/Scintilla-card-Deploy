package com.example.ecommerce.services;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

// Un contatore per chiave (un IP, un'utenza) in finestre fisse: la prima volta che si conta una chiave
// parte la sua finestra, allo scadere si riparte da zero. Lo usano i limiti su login e registrazione.
// Non è thread-safe: chi lo usa accede solo da metodi synchronized
final class ContatoriAFinestra {

    private final Duration durata;
    private final Map<String, Finestra> finestre = new HashMap<>();

    ContatoriAFinestra(Duration durata) {
        this.durata = durata;
    }

    // minuti che mancano alla fine della finestra se la chiave ha raggiunto il limite, altrimenti 0
    long minutiDiBlocco(String chiave, int limite, Instant adesso) {
        Finestra finestra = attiva(chiave, adesso);
        return finestra != null && finestra.conteggio >= limite ? finestra.minutiRimasti(adesso) : 0;
    }

    void incrementa(String chiave, Instant adesso) {
        Finestra finestra = attiva(chiave, adesso);
        if (finestra == null) {
            finestra = new Finestra(adesso.plus(durata));
            finestre.put(chiave, finestra);
        }
        finestra.conteggio++;
    }

    void azzera(String chiave) {
        finestre.remove(chiave);
    }

    // le finestre scadute non servono più: senza pulizia la mappa crescerebbe a ogni chiave nuova
    void pulisci(Instant adesso) {
        finestre.values().removeIf(finestra -> finestra.scaduta(adesso));
    }

    private Finestra attiva(String chiave, Instant adesso) {
        Finestra finestra = finestre.get(chiave);
        return finestra == null || finestra.scaduta(adesso) ? null : finestra;
    }

    private static final class Finestra {
        private final Instant fine;
        private int conteggio;

        private Finestra(Instant fine) {
            this.fine = fine;
        }

        private boolean scaduta(Instant adesso) {
            return !adesso.isBefore(fine);
        }

        // arrotondato per eccesso: "tra 0 minuti" non avrebbe senso
        private long minutiRimasti(Instant adesso) {
            return Math.max(1, (Duration.between(adesso, fine).getSeconds() + 59) / 60);
        }
    }
}
