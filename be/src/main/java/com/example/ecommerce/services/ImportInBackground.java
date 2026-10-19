package com.example.ecommerce.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

// Scaricamenti completi da pokemontcg.io lanciati dalle pagine pubbliche (set, Pokémon, artisti) senza far aspettare
// il visitatore, che intanto vede la pagina presa al volo. Le regole:
// - uno solo per chiave (es. "set:sv8"): chi arriva mentre è in corso non ne lancia un altro e non consuma il limite;
// - LimitatoreImport conta solo l'avvio (col limite raggiunto TroppeRichiesteException, cioè 429);
// - fallito: per 30 minuti non si riprova, così le visite non tempestano un pokemontcg.io giù
@Slf4j
@Component
public class ImportInBackground {

    private static final Duration ATTESA_DOPO_ERRORE = Duration.ofMinutes(30);

    private final Executor esecutore;
    private final LimitatoreImport limitatore;
    private final Set<String> inCorso = ConcurrentHashMap.newKeySet();
    private final PromemoriaTemporaneo<String> falliti;

    @Autowired
    public ImportInBackground(@Qualifier("importExecutor") Executor esecutore, LimitatoreImport limitatore) {
        this(esecutore, limitatore, Clock.systemUTC());
    }

    // per i test: esecutore e orologio controllabili
    ImportInBackground(Executor esecutore, LimitatoreImport limitatore, Clock orologio) {
        this.esecutore = esecutore;
        this.limitatore = limitatore;
        this.falliti = new PromemoriaTemporaneo<>(ATTESA_DOPO_ERRORE, orologio);
    }

    // true se l'import è stato accodato adesso; false se è già in corso, fallito da poco o la coda è piena.
    // client: IP del visitatore, per il limite sugli import
    public boolean avvia(String chiave, String client, Runnable importa) {
        if (inCorso.contains(chiave) || falliti.isRecente(chiave)) {
            return false;
        }
        limitatore.registra(client);
        // due visitatori insieme: passa solo il primo
        if (!inCorso.add(chiave)) {
            return false;
        }
        try {
            esecutore.execute(() -> esegui(chiave, importa));
            return true;
        } catch (RejectedExecutionException ex) {
            inCorso.remove(chiave);
            log.warn("Import {} non accodato (coda piena): si riprova alla prossima visita", chiave);
            return false;
        }
    }

    public boolean inCorso(String chiave) {
        return inCorso.contains(chiave);
    }

    public boolean fallitoDaPoco(String chiave) {
        return falliti.isRecente(chiave);
    }

    private void esegui(String chiave, Runnable importa) {
        try {
            importa.run();
            falliti.dimentica(chiave);
        } catch (RuntimeException ex) {
            log.warn("Import {} in background non riuscito ({}): si riprova tra {} minuti", chiave, ex.getMessage(),
                    ATTESA_DOPO_ERRORE.toMinutes());
            falliti.annota(chiave);
        } finally {
            inCorso.remove(chiave);
        }
    }
}
