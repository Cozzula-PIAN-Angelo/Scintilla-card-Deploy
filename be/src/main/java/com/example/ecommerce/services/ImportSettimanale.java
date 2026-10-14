package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import lombok.extern.slf4j.Slf4j;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.BiConsumer;
import java.util.function.Function;

// Carte di una pagina pubblica (un Pokémon, un artista) scaricate da pokemontcg.io alla prima apertura e
// riscaricate dopo una settimana, così compaiono le carte dei set usciti nel frattempo. Le regole:
// - un lock per chiave: due visitatori che aprono insieme la stessa pagina la importano una volta sola;
// - LimitatoreImport: col limite raggiunto la prima apertura risponde 429, l'aggiornamento si rinvia;
// - pokemontcg.io giù: la prima apertura risponde 502, l'aggiornamento si rinvia e per 30 minuti non si
//   riprova, così le visite mostrano subito le carte salvate invece di aspettare i tentativi;
// - la data dell'ultimo import si salva solo dopo un import riuscito
@Slf4j
final class ImportSettimanale<K> {

    private static final Duration VALIDITA_IMPORT = Duration.ofDays(7);
    private static final Duration ATTESA_DOPO_ERRORE = Duration.ofMinutes(30);

    private final LimitatoreImport limitatore;
    private final Function<K, Optional<Instant>> ultimoImport;
    private final BiConsumer<K, Instant> registraImport;
    // per il log, es. "Pokémon" o "artista"
    private final String descrizione;
    private final Clock orologio;
    private final ConcurrentMap<K, Object> lockPerChiave = new ConcurrentHashMap<>();
    private final PromemoriaTemporaneo<K> aggiornamentiFalliti;

    ImportSettimanale(LimitatoreImport limitatore, Function<K, Optional<Instant>> ultimoImport,
                      BiConsumer<K, Instant> registraImport, String descrizione) {
        this(limitatore, ultimoImport, registraImport, descrizione, Clock.systemUTC());
    }

    // per i test: un orologio controllabile
    ImportSettimanale(LimitatoreImport limitatore, Function<K, Optional<Instant>> ultimoImport,
                      BiConsumer<K, Instant> registraImport, String descrizione, Clock orologio) {
        this.limitatore = limitatore;
        this.ultimoImport = ultimoImport;
        this.registraImport = registraImport;
        this.descrizione = descrizione;
        this.orologio = orologio;
        this.aggiornamentiFalliti = new PromemoriaTemporaneo<>(ATTESA_DOPO_ERRORE, orologio);
    }

    // importa se serve; client: IP del visitatore, per il limite sugli import
    void assicura(K chiave, String client, Runnable importa) {
        if (daImportare(chiave, ultimoImport.apply(chiave))) {
            synchronized (lockPerChiave.computeIfAbsent(chiave, k -> new Object())) {
                // ricontrollo: nel frattempo un'altra richiesta potrebbe averla già importata
                Optional<Instant> ultimo = ultimoImport.apply(chiave);
                if (daImportare(chiave, ultimo)) {
                    importa(chiave, client, importa, ultimo.isPresent());
                }
            }
        }
    }

    private void importa(K chiave, String client, Runnable importa, boolean giaImportata) {
        try {
            limitatore.registra(client);
        } catch (TroppeRichiesteException ex) {
            // aggiornamento settimanale: si rinvia e si mostrano le carte che ci sono. Il 429 resta per la prima apertura
            if (giaImportata) {
                return;
            }
            throw ex;
        }
        try {
            importa.run();
        } catch (ServizioEsternoException ex) {
            // la data non cambia, così dopo la pausa si riprova. Alla prima apertura non c'è niente da mostrare: 502
            if (giaImportata) {
                log.warn("Aggiornamento delle carte ({} {}) non riuscito ({}): si mostrano quelle già salvate, "
                        + "si riprova tra {} minuti", descrizione, chiave, ex.getMessage(), ATTESA_DOPO_ERRORE.toMinutes());
                aggiornamentiFalliti.annota(chiave);
                return;
            }
            throw ex;
        }
        aggiornamentiFalliti.dimentica(chiave);
        registraImport.accept(chiave, orologio.instant());
    }

    // mai importata, oppure importata da più di una settimana e senza un aggiornamento fallito da poco
    private boolean daImportare(K chiave, Optional<Instant> ultimo) {
        return ultimo
                .map(data -> data.isBefore(orologio.instant().minus(VALIDITA_IMPORT)) && !aggiornamentiFalliti.isRecente(chiave))
                .orElse(true);
    }
}
