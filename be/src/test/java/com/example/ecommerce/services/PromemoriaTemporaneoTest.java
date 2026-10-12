package com.example.ecommerce.services;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class PromemoriaTemporaneoTest {

    private static final Instant INIZIO = Instant.parse("2026-10-12T10:00:00Z");

    // orologio spostabile a mano, come in LimitatoreImportTest
    private static final class OrologioFinto extends Clock {
        private Instant adesso = INIZIO;

        void avanza(Duration durata) {
            adesso = adesso.plus(durata);
        }

        @Override
        public Instant instant() {
            return adesso;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zona) {
            return this;
        }
    }

    private final OrologioFinto orologio = new OrologioFinto();
    private final PromemoriaTemporaneo<Integer> promemoria = new PromemoriaTemporaneo<>(Duration.ofMinutes(30), orologio);

    @Test
    void chiaveMaiAnnotataNonERecente() {
        assertThat(promemoria.isRecente(25)).isFalse();
    }

    @Test
    void chiaveAnnotataRestaRecenteFinoAlloScadere() {
        promemoria.annota(25);

        orologio.avanza(Duration.ofMinutes(29));
        assertThat(promemoria.isRecente(25)).isTrue();
        // le altre chiavi non sono toccate
        assertThat(promemoria.isRecente(26)).isFalse();

        orologio.avanza(Duration.ofMinutes(1));
        assertThat(promemoria.isRecente(25)).isFalse();
    }

    @Test
    void chiaveDimenticataNonERecente() {
        promemoria.annota(25);
        promemoria.dimentica(25);

        assertThat(promemoria.isRecente(25)).isFalse();
    }

    // una nuova annotazione fa ripartire l'attesa
    @Test
    void nuovaAnnotazioneRiparteDaCapo() {
        promemoria.annota(25);
        orologio.avanza(Duration.ofMinutes(20));
        promemoria.annota(25);
        orologio.avanza(Duration.ofMinutes(20));

        assertThat(promemoria.isRecente(25)).isTrue();
    }
}
