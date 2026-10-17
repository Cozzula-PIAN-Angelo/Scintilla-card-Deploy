package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.TroppeRichiesteException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

// Senza un limite chiunque potrebbe provare password a raffica su /auth/login. Si contano solo i
// tentativi falliti, in due modi: per utenza (chi prova tante password su un account, anche da
// IP diversi) e per IP (chi prova tante utenze dallo stesso indirizzo). Il messaggio è lo stesso
// che l'utenza esista o no: il limite non rivela quali account sono registrati
@Component
public class LimitatoreLogin {

    private static final Duration FINESTRA = Duration.ofMinutes(15);

    private final int limitePerIp;
    private final int limitePerUtenza;
    private final Clock orologio;

    // finestre fisse, come in LimitatoreImport. Accesso solo nei metodi synchronized
    private final Map<String, Finestra> perIp = new HashMap<>();
    private final Map<String, Finestra> perUtenza = new HashMap<>();

    @Autowired
    public LimitatoreLogin(@Value("${app.login.limite-per-ip}") int limitePerIp,
                           @Value("${app.login.limite-per-utenza}") int limitePerUtenza) {
        this(limitePerIp, limitePerUtenza, Clock.systemUTC());
    }

    // per i test: un orologio controllabile, così le finestre scadono senza aspettare
    LimitatoreLogin(int limitePerIp, int limitePerUtenza, Clock orologio) {
        this.limitePerIp = limitePerIp;
        this.limitePerUtenza = limitePerUtenza;
        this.orologio = orologio;
    }

    // da chiamare prima di controllare la password: oltre il limite il login non si prova nemmeno (429)
    public synchronized void controlla(String ip, String identificativo) {
        Instant adesso = orologio.instant();
        Finestra dellIp = attiva(perIp, ip, adesso);
        Finestra dellUtenza = attiva(perUtenza, chiave(identificativo), adesso);
        long minuti = 0;
        if (dellIp != null && dellIp.conteggio >= limitePerIp) {
            minuti = dellIp.minutiRimasti(adesso);
        }
        if (dellUtenza != null && dellUtenza.conteggio >= limitePerUtenza) {
            minuti = Math.max(minuti, dellUtenza.minutiRimasti(adesso));
        }
        if (minuti > 0) {
            throw new TroppeRichiesteException("Troppi tentativi di accesso falliti: riprova tra " + minuti + " minuti");
        }
    }

    public synchronized void fallito(String ip, String identificativo) {
        Instant adesso = orologio.instant();
        incrementa(perIp, ip, adesso);
        incrementa(perUtenza, chiave(identificativo), adesso);
    }

    // chi entra ricomincia da zero: qualche errore di battitura sparso non lo blocca più avanti.
    // Il contatore dell'IP resta, altrimenti basterebbe un account proprio per azzerarlo
    public synchronized void riuscito(String identificativo) {
        perUtenza.remove(chiave(identificativo));
    }

    // le finestre scadute non servono più: senza pulizia le mappe crescerebbero a ogni IP e utenza
    @Scheduled(fixedRate = 10 * 60 * 1000)
    public synchronized void pulisci() {
        Instant adesso = orologio.instant();
        perIp.values().removeIf(finestra -> finestra.scaduta(adesso));
        perUtenza.values().removeIf(finestra -> finestra.scaduta(adesso));
    }

    // al login email e username ignorano le maiuscole (AuthService), e l'identificativo si usa senza spazi
    private static String chiave(String identificativo) {
        return identificativo.trim().toLowerCase(Locale.ROOT);
    }

    private static Finestra attiva(Map<String, Finestra> mappa, String chiave, Instant adesso) {
        Finestra finestra = mappa.get(chiave);
        return finestra == null || finestra.scaduta(adesso) ? null : finestra;
    }

    private static void incrementa(Map<String, Finestra> mappa, String chiave, Instant adesso) {
        Finestra finestra = attiva(mappa, chiave, adesso);
        if (finestra == null) {
            finestra = new Finestra(adesso.plus(FINESTRA));
            mappa.put(chiave, finestra);
        }
        finestra.conteggio++;
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
