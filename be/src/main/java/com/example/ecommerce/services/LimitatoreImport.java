package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.TroppeRichiesteException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

// La prima apertura di un set o di un Pokémon è pubblica e scarica le carte da pokemontcg.io:
// senza un limite chiunque potrebbe chiamare in fila tutti i set e tutti i numeri del Pokédex,
// esaurendo la quota giornaliera dell'API (circa 1.000 richieste senza chiave) e tenendo occupati
// i thread del server. Si contano solo gli import che partono davvero: le aperture successive,
// lette dal database, non hanno limiti. Gli import dell'admin e la sincronizzazione notturna
// non passano di qui
@Slf4j
@Component
public class LimitatoreImport {

    private static final Duration FINESTRA_CLIENT = Duration.ofHours(1);
    private static final Duration FINESTRA_GLOBALE = Duration.ofDays(1);

    private final int limitePerClient;
    private final int limiteGlobale;
    private final Clock orologio;

    // finestre fisse: si azzerano allo scadere, non scorrono. Accesso solo nei metodi synchronized
    private final Map<String, Finestra> perClient = new HashMap<>();
    private Finestra globale;

    @Autowired
    public LimitatoreImport(@Value("${app.import.limite-per-client}") int limitePerClient,
                            @Value("${app.import.limite-giornaliero}") int limiteGlobale) {
        this(limitePerClient, limiteGlobale, Clock.systemUTC());
    }

    // per i test: un orologio controllabile, così le finestre scadono senza aspettare un'ora
    LimitatoreImport(int limitePerClient, int limiteGlobale, Clock orologio) {
        this.limitePerClient = limitePerClient;
        this.limiteGlobale = limiteGlobale;
        this.orologio = orologio;
    }

    // da chiamare subito prima di un import; se il limite è superato l'import non parte (429)
    public synchronized void registra(String client) {
        Instant adesso = orologio.instant();
        if (globale == null || globale.scaduta(adesso)) {
            globale = new Finestra(adesso, FINESTRA_GLOBALE);
        }
        Finestra delClient = perClient.get(client);
        if (delClient == null || delClient.scaduta(adesso)) {
            delClient = new Finestra(adesso, FINESTRA_CLIENT);
            perClient.put(client, delClient);
        }

        if (delClient.conteggio >= limitePerClient) {
            throw new TroppeRichiesteException("Hai aperto troppe espansioni o Pokémon nuovi in poco tempo: riprova tra "
                    + delClient.minutiRimasti(adesso) + " minuti. Quelli già aperti si consultano senza limiti");
        }
        if (globale.conteggio >= limiteGlobale) {
            log.warn("Limite giornaliero di import raggiunto ({}): nuovi set e Pokémon bloccati per {} minuti",
                    limiteGlobale, globale.minutiRimasti(adesso));
            throw new TroppeRichiesteException("Oggi sono già state scaricate molte carte nuove: riprova più tardi. "
                    + "Le espansioni e i Pokémon già aperti si consultano senza limiti");
        }
        delClient.conteggio++;
        globale.conteggio++;
    }

    // le finestre scadute dei client non servono più: senza pulizia la mappa crescerebbe a ogni nuovo IP
    @Scheduled(fixedRate = 10 * 60 * 1000)
    public synchronized void pulisci() {
        Instant adesso = orologio.instant();
        perClient.values().removeIf(finestra -> finestra.scaduta(adesso));
    }

    private static final class Finestra {
        private final Instant fine;
        private int conteggio;

        private Finestra(Instant inizio, Duration durata) {
            this.fine = inizio.plus(durata);
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
