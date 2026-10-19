package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// import accodati su un esecutore finto che si fa girare a mano
class ImportInBackgroundTest {

    private static final String CHIAVE = "set:sv8";
    private static final String CLIENT = "1.2.3.4";

    private final List<Runnable> coda = new ArrayList<>();
    private final OrologioFinto orologio = new OrologioFinto(Instant.parse("2026-10-19T10:00:00Z"));
    private final AtomicInteger importazioni = new AtomicInteger();

    private ImportInBackground conLimite(int limite) {
        return new ImportInBackground(coda::add, new LimitatoreImport(limite, 1000, orologio), orologio);
    }

    private void eseguiCoda() {
        List<Runnable> daEseguire = new ArrayList<>(coda);
        coda.clear();
        daEseguire.forEach(Runnable::run);
    }

    @Test
    void avviaUnaVoltaSola() {
        // limite 1: un secondo posto consumato farebbe lanciare 429
        ImportInBackground background = conLimite(1);

        assertThat(background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet)).isTrue();
        assertThat(background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet)).isFalse();

        assertThat(coda).hasSize(1);
        assertThat(background.inCorso(CHIAVE)).isTrue();
    }

    @Test
    void dopoIlCompletamentoSiPuoRiavviare() {
        ImportInBackground background = conLimite(10);
        background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet);

        eseguiCoda();

        assertThat(importazioni).hasValue(1);
        assertThat(background.inCorso(CHIAVE)).isFalse();
        assertThat(background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet)).isTrue();
    }

    // pausa corta: pokemontcg.io senza chiave risponde spesso 500 a raffiche, poco dopo di solito torna
    @Test
    void fallitoPerDueMinuti() {
        ImportInBackground background = conLimite(10);
        background.avvia(CHIAVE, CLIENT, () -> true, () -> {
            throw new ServizioEsternoException("pokemontcg.io ha risposto 502", null);
        });

        eseguiCoda();

        assertThat(background.fallitoDaPoco(CHIAVE)).isTrue();
        assertThat(background.inCorso(CHIAVE)).isFalse();
        assertThat(background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet)).isFalse();

        orologio.avanza(Duration.ofMinutes(1));
        assertThat(background.fallitoDaPoco(CHIAVE)).isTrue();

        orologio.avanza(Duration.ofMinutes(2));

        assertThat(background.fallitoDaPoco(CHIAVE)).isFalse();
        assertThat(background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet)).isTrue();
    }

    @Test
    void codaPienaNonLancia() {
        ImportInBackground background = new ImportInBackground(compito -> {
            throw new RejectedExecutionException("coda piena");
        }, new LimitatoreImport(10, 1000, orologio), orologio);

        assertThat(background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet)).isFalse();
        assertThat(background.inCorso(CHIAVE)).isFalse();
    }

    @Test
    void limiteRaggiuntoLanciaENonAccoda() {
        ImportInBackground background = conLimite(0);

        assertThatThrownBy(() -> background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet))
                .isInstanceOf(TroppeRichiesteException.class);
        assertThat(coda).isEmpty();
        assertThat(background.inCorso(CHIAVE)).isFalse();
    }

    // una richiesta ha letto "da importare" proprio mentre l'import finiva: il ricontrollo la ferma
    @Test
    void nonAvviaSeNelFrattempoEFatto() {
        ImportInBackground background = conLimite(1);

        assertThat(background.avvia(CHIAVE, CLIENT, () -> false, importazioni::incrementAndGet)).isFalse();

        assertThat(coda).isEmpty();
        assertThat(background.inCorso(CHIAVE)).isFalse();
        // il posto nel limite non è stato consumato
        assertThat(background.avvia(CHIAVE, CLIENT, () -> true, importazioni::incrementAndGet)).isTrue();
    }

    private static final class OrologioFinto extends Clock {
        private Instant adesso;

        private OrologioFinto(Instant adesso) {
            this.adesso = adesso;
        }

        private void avanza(Duration durata) {
            adesso = adesso.plus(durata);
        }

        @Override
        public Instant instant() {
            return adesso;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }
    }
}
