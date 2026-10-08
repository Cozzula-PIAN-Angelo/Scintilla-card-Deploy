package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.TroppeRichiesteException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LimitatoreImportTest {

    // orologio fermo che i test spostano in avanti a mano
    private static final class OrologioDiProva extends Clock {
        private Instant adesso = Instant.parse("2026-10-05T10:00:00Z");

        void avanza(Duration durata) {
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

    private OrologioDiProva orologio;

    @BeforeEach
    void prepara() {
        orologio = new OrologioDiProva();
    }

    @Test
    void oltreIlLimitePerClientRisponde429() {
        LimitatoreImport limitatore = new LimitatoreImport(2, 100, orologio);
        limitatore.registra("1.1.1.1");
        limitatore.registra("1.1.1.1");

        assertThatThrownBy(() -> limitatore.registra("1.1.1.1"))
                .isInstanceOf(TroppeRichiesteException.class)
                .hasMessageContaining("riprova tra 60 minuti");
    }

    @Test
    void ogniClientHaIlSuoContatore() {
        LimitatoreImport limitatore = new LimitatoreImport(1, 100, orologio);
        limitatore.registra("1.1.1.1");

        assertThatCode(() -> limitatore.registra("2.2.2.2")).doesNotThrowAnyException();
    }

    @Test
    void laFinestraDelClientSiAzzeraDopoUnOra() {
        LimitatoreImport limitatore = new LimitatoreImport(1, 100, orologio);
        limitatore.registra("1.1.1.1");
        orologio.avanza(Duration.ofMinutes(59));
        assertThatThrownBy(() -> limitatore.registra("1.1.1.1")).hasMessageContaining("riprova tra 1 minuti");

        orologio.avanza(Duration.ofMinutes(1));
        assertThatCode(() -> limitatore.registra("1.1.1.1")).doesNotThrowAnyException();
    }

    @Test
    void ilLimiteGiornalieroValePerTuttiEDuraUnGiorno() {
        LimitatoreImport limitatore = new LimitatoreImport(10, 2, orologio);
        limitatore.registra("1.1.1.1");
        limitatore.registra("2.2.2.2");
        assertThatThrownBy(() -> limitatore.registra("3.3.3.3"))
                .isInstanceOf(TroppeRichiesteException.class)
                .hasMessageContaining("Oggi sono già state scaricate molte carte");

        // dopo un'ora la finestra del client è nuova, ma quella giornaliera no
        orologio.avanza(Duration.ofHours(1));
        assertThatThrownBy(() -> limitatore.registra("3.3.3.3")).isInstanceOf(TroppeRichiesteException.class);

        orologio.avanza(Duration.ofHours(23));
        assertThatCode(() -> limitatore.registra("3.3.3.3")).doesNotThrowAnyException();
    }

    @Test
    void unaRichiestaRifiutataNonConsumaIlLimiteGiornaliero() {
        LimitatoreImport limitatore = new LimitatoreImport(1, 2, orologio);
        limitatore.registra("1.1.1.1");
        // rifiutata per il limite del client: non deve occupare un posto del giornaliero
        assertThatThrownBy(() -> limitatore.registra("1.1.1.1")).isInstanceOf(TroppeRichiesteException.class);

        assertThatCode(() -> limitatore.registra("2.2.2.2")).doesNotThrowAnyException();
    }
}
