package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.TroppeRichiesteException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

// La registrazione dice se username o email sono già usati: serve a chi si registra, ma permetterebbe
// anche di controllare in fila migliaia di email. Si contano le registrazioni rifiutate per questo
// motivo (409) per IP: oltre il limite si risponde 429 senza controllare. Gli errori di validazione
// non contano, non rivelano niente
@Component
public class LimitatoreRegistrazione {

    private static final Duration FINESTRA = Duration.ofMinutes(15);

    private final int limitePerIp;
    private final Clock orologio;

    // accesso solo nei metodi synchronized
    private final ContatoriAFinestra perIp = new ContatoriAFinestra(FINESTRA);

    @Autowired
    public LimitatoreRegistrazione(@Value("${app.registrazione.limite-per-ip}") int limitePerIp) {
        this(limitePerIp, Clock.systemUTC());
    }

    // per i test: un orologio controllabile
    LimitatoreRegistrazione(int limitePerIp, Clock orologio) {
        this.limitePerIp = limitePerIp;
        this.orologio = orologio;
    }

    // da chiamare prima di controllare username ed email
    public synchronized void controlla(String ip) {
        long minuti = perIp.minutiDiBlocco(ip, limitePerIp, orologio.instant());
        if (minuti > 0) {
            throw new TroppeRichiesteException("Troppe registrazioni con username o email già usati: riprova tra "
                    + minuti + " minuti");
        }
    }

    public synchronized void rifiutata(String ip) {
        perIp.incrementa(ip, orologio.instant());
    }

    @Scheduled(fixedRate = 10 * 60 * 1000)
    public synchronized void pulisci() {
        Instant adesso = orologio.instant();
        perIp.pulisci(adesso);
    }
}
