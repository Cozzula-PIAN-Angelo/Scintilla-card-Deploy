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

class LimitatoreLoginTest {

    // orologio fermo che i test spostano in avanti a mano
    private static final class OrologioDiProva extends Clock {
        private Instant adesso = Instant.parse("2026-10-17T10:00:00Z");

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
    void troppiTentativiFallitiSullaStessaUtenzaRispondono429() {
        LimitatoreLogin limitatore = new LimitatoreLogin(100, 2, orologio);
        limitatore.fallito("1.1.1.1", "mario");
        limitatore.fallito("2.2.2.2", "mario");

        // anche da un altro IP: chi prova password da più indirizzi resta fermo sull'utenza
        assertThatThrownBy(() -> limitatore.controlla("3.3.3.3", "mario"))
                .isInstanceOf(TroppeRichiesteException.class)
                .hasMessageContaining("riprova tra 15 minuti");
    }

    @Test
    void lUtenzaNonDistingueMaiuscoleESpazi() {
        LimitatoreLogin limitatore = new LimitatoreLogin(100, 2, orologio);
        limitatore.fallito("1.1.1.1", "Mario");
        limitatore.fallito("1.1.1.1", " MARIO ");

        assertThatThrownBy(() -> limitatore.controlla("1.1.1.1", "mario"))
                .isInstanceOf(TroppeRichiesteException.class);
    }

    @Test
    void troppiTentativiFallitiDalloStessoIpRispondono429() {
        LimitatoreLogin limitatore = new LimitatoreLogin(2, 100, orologio);
        limitatore.fallito("1.1.1.1", "mario");
        limitatore.fallito("1.1.1.1", "luigi");

        // anche su un'utenza mai provata: chi prova tante utenze dallo stesso IP resta fermo
        assertThatThrownBy(() -> limitatore.controlla("1.1.1.1", "peach"))
                .isInstanceOf(TroppeRichiesteException.class);
        assertThatCode(() -> limitatore.controlla("2.2.2.2", "peach")).doesNotThrowAnyException();
    }

    @Test
    void sottoIlLimiteSiPuoRiprovare() {
        LimitatoreLogin limitatore = new LimitatoreLogin(2, 2, orologio);
        limitatore.fallito("1.1.1.1", "mario");

        assertThatCode(() -> limitatore.controlla("1.1.1.1", "mario")).doesNotThrowAnyException();
    }

    @Test
    void laFinestraSiAzzeraDopoUnQuartoDOra() {
        LimitatoreLogin limitatore = new LimitatoreLogin(1, 1, orologio);
        limitatore.fallito("1.1.1.1", "mario");
        orologio.avanza(Duration.ofMinutes(14));
        assertThatThrownBy(() -> limitatore.controlla("1.1.1.1", "mario")).hasMessageContaining("riprova tra 1 minuti");

        orologio.avanza(Duration.ofMinutes(1));
        assertThatCode(() -> limitatore.controlla("1.1.1.1", "mario")).doesNotThrowAnyException();
    }

    @Test
    void unLoginRiuscitoAzzeraIlContatoreDellUtenza() {
        LimitatoreLogin limitatore = new LimitatoreLogin(100, 2, orologio);
        limitatore.fallito("1.1.1.1", "mario");
        limitatore.riuscito("Mario");
        limitatore.fallito("1.1.1.1", "mario");

        assertThatCode(() -> limitatore.controlla("1.1.1.1", "mario")).doesNotThrowAnyException();
    }
}
