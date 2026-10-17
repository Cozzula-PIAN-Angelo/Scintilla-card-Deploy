package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.TroppeRichiesteException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;

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

    // accesso solo nei metodi synchronized
    private final ContatoriAFinestra perIp = new ContatoriAFinestra(FINESTRA);
    private final ContatoriAFinestra perUtenza = new ContatoriAFinestra(FINESTRA);

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
        long minuti = Math.max(perIp.minutiDiBlocco(ip, limitePerIp, adesso),
                perUtenza.minutiDiBlocco(chiave(identificativo), limitePerUtenza, adesso));
        if (minuti > 0) {
            throw new TroppeRichiesteException("Troppi tentativi di accesso falliti: riprova tra " + minuti + " minuti");
        }
    }

    public synchronized void fallito(String ip, String identificativo) {
        Instant adesso = orologio.instant();
        perIp.incrementa(ip, adesso);
        perUtenza.incrementa(chiave(identificativo), adesso);
    }

    // chi entra ricomincia da zero: qualche errore di battitura sparso non lo blocca più avanti.
    // Il contatore dell'IP resta, altrimenti basterebbe un account proprio per azzerarlo
    public synchronized void riuscito(String identificativo) {
        perUtenza.azzera(chiave(identificativo));
    }

    @Scheduled(fixedRate = 10 * 60 * 1000)
    public synchronized void pulisci() {
        Instant adesso = orologio.instant();
        perIp.pulisci(adesso);
        perUtenza.pulisci(adesso);
    }

    // al login email e username ignorano le maiuscole (AuthService), e l'identificativo si usa senza spazi
    private static String chiave(String identificativo) {
        return identificativo.trim().toLowerCase(Locale.ROOT);
    }
}
