package com.example.ecommerce.services;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

// Ricorda per un po' che a una chiave è successo qualcosa, di solito una chiamata a TCGdex andata
// male: un set ancora senza carte, l'aggiornamento di un Pokémon fallito, l'elenco delle espansioni non
// scaricato. Finché il promemoria è recente non si riprova, invece di rifare a ogni visita la stessa
// chiamata destinata a fallire. In memoria: dopo un riavvio si riprova subito.
// Le chiavi sono poche e limitate (i set, i 1025 Pokémon), quindi niente pulizia delle scadute
final class PromemoriaTemporaneo<K> {

    private final Duration durata;
    private final Clock orologio;
    private final ConcurrentMap<K, Instant> annotazioni = new ConcurrentHashMap<>();

    PromemoriaTemporaneo(Duration durata) {
        this(durata, Clock.systemUTC());
    }

    // per i test: un orologio controllabile
    PromemoriaTemporaneo(Duration durata, Clock orologio) {
        this.durata = durata;
        this.orologio = orologio;
    }

    void annota(K chiave) {
        annotazioni.put(chiave, orologio.instant());
    }

    void dimentica(K chiave) {
        annotazioni.remove(chiave);
    }

    // annotata da meno della durata
    boolean isRecente(K chiave) {
        Instant annotata = annotazioni.get(chiave);
        return annotata != null && orologio.instant().isBefore(annotata.plus(durata));
    }
}
