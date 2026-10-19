package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.TroppeRichiesteException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.function.BiConsumer;
import java.util.function.Function;

// Carte di una pagina pubblica (un Pokémon, un artista) scaricate da pokemontcg.io alla prima apertura e
// riscaricate dopo una settimana, così compaiono le carte dei set usciti nel frattempo. Lo scaricamento gira sempre
// in background (ImportInBackground: uno per chiave, limite sugli import, pausa dopo un errore):
// - prima apertura: la pagina intanto mostra le carte prese al volo; col limite raggiunto 429;
// - aggiornamento settimanale: si mostrano subito le carte salvate; col limite raggiunto si rinvia;
// - la data dell'ultimo import si salva solo dopo un import riuscito
final class ImportSettimanale<K> {

    private static final Duration VALIDITA_IMPORT = Duration.ofDays(7);

    private final ImportInBackground background;
    private final Function<K, Optional<Instant>> ultimoImport;
    private final BiConsumer<K, Instant> registraImport;
    // prefisso della chiave in ImportInBackground, es. "Pokémon" o "artista"
    private final String descrizione;
    private final Clock orologio;

    // completo: le carte sono già state scaricate almeno una volta; fallito: la prima apertura è fallita da poco
    record Stato(boolean completo, boolean fallito) {
    }

    ImportSettimanale(ImportInBackground background, Function<K, Optional<Instant>> ultimoImport,
                      BiConsumer<K, Instant> registraImport, String descrizione) {
        this(background, ultimoImport, registraImport, descrizione, Clock.systemUTC());
    }

    // per i test: un orologio controllabile
    ImportSettimanale(ImportInBackground background, Function<K, Optional<Instant>> ultimoImport,
                      BiConsumer<K, Instant> registraImport, String descrizione, Clock orologio) {
        this.background = background;
        this.ultimoImport = ultimoImport;
        this.registraImport = registraImport;
        this.descrizione = descrizione;
        this.orologio = orologio;
    }

    // accoda l'import se serve e non aspetta; client: IP del visitatore, per il limite sugli import
    Stato assicura(K chiave, String client, Runnable importa) {
        Optional<Instant> ultimo = ultimoImport.apply(chiave);
        String chiaveBackground = descrizione + ":" + chiave;
        if (daImportare(ultimo)) {
            try {
                background.avvia(chiaveBackground, client, () -> daImportare(ultimoImport.apply(chiave)), () -> {
                    importa.run();
                    registraImport.accept(chiave, orologio.instant());
                });
            } catch (TroppeRichiesteException ex) {
                // aggiornamento settimanale: si rinvia e si mostrano le carte che ci sono. Il 429 resta per la prima apertura
                if (ultimo.isEmpty()) {
                    throw ex;
                }
            }
        }
        return new Stato(ultimo.isPresent(), ultimo.isEmpty() && background.fallitoDaPoco(chiaveBackground));
    }

    // solo lettura: niente import, niente limite. Per il controllo leggero del frontend
    Stato stato(K chiave) {
        boolean importata = ultimoImport.apply(chiave).isPresent();
        return new Stato(importata, !importata && background.fallitoDaPoco(descrizione + ":" + chiave));
    }

    // mai importata, oppure importata da più di una settimana
    private boolean daImportare(Optional<Instant> ultimo) {
        return ultimo.map(data -> data.isBefore(orologio.instant().minus(VALIDITA_IMPORT))).orElse(true);
    }
}
