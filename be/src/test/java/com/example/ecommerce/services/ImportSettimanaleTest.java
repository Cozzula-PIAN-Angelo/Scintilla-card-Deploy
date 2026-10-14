package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class ImportSettimanaleTest {

    private static final String CHIAVE = "mitsuhiro-arita";
    private static final String CLIENT = "203.0.113.7";

    @Mock
    private LimitatoreImport limitatore;

    // data dell'ultimo import per chiave, al posto della tabella
    private final Map<String, Instant> importati = new HashMap<>();
    private final OrologioFinto orologio = new OrologioFinto(Instant.parse("2026-10-14T10:00:00Z"));
    private final AtomicInteger importazioni = new AtomicInteger();
    // letture della data dell'ultimo import: ognuna è una query sul database
    private final AtomicInteger letture = new AtomicInteger();

    private ImportSettimanale<String> importSettimanale() {
        return new ImportSettimanale<>(limitatore, chiave -> {
            letture.incrementAndGet();
            return Optional.ofNullable(importati.get(chiave));
        }, importati::put, "artista", orologio);
    }

    // una lettura prima del lock e una dopo (un'altra richiesta potrebbe aver appena importato), non di più
    @Test
    void importLeggeLaDataDueVolte() {
        importSettimanale().assicura(CHIAVE, CLIENT, importa);

        assertThat(letture).hasValue(2);
    }

    private final Runnable importa = importazioni::incrementAndGet;

    private final Runnable importaFallisce = () -> {
        importazioni.incrementAndGet();
        throw new ServizioEsternoException("pokemontcg.io giù", null);
    };

    @Test
    void primaAperturaImportaERegistra() {
        importSettimanale().assicura(CHIAVE, CLIENT, importa);

        assertThat(importazioni).hasValue(1);
        assertThat(importati).containsEntry(CHIAVE, orologio.instant());
    }

    @Test
    void primaDiSetteGiorniNonReimporta() {
        importati.put(CHIAVE, orologio.instant().minus(Duration.ofDays(6)));

        importSettimanale().assicura(CHIAVE, CLIENT, importa);

        assertThat(importazioni).hasValue(0);
    }

    @Test
    void dopoSetteGiorniReimporta() {
        importati.put(CHIAVE, orologio.instant().minus(Duration.ofDays(8)));

        importSettimanale().assicura(CHIAVE, CLIENT, importa);

        assertThat(importazioni).hasValue(1);
        assertThat(importati).containsEntry(CHIAVE, orologio.instant());
    }

    @Test
    void limiteAllaPrimaAperturaRisale() {
        doThrow(new TroppeRichiesteException("troppe")).when(limitatore).registra(CLIENT);

        assertThatThrownBy(() -> importSettimanale().assicura(CHIAVE, CLIENT, importa))
                .isInstanceOf(TroppeRichiesteException.class);
        assertThat(importazioni).hasValue(0);
        assertThat(importati).isEmpty();
    }

    // aggiornamento settimanale con il limite raggiunto: si rinvia e si mostrano le carte salvate
    @Test
    void limiteInAggiornamentoRinvia() {
        Instant vecchio = orologio.instant().minus(Duration.ofDays(8));
        importati.put(CHIAVE, vecchio);
        doThrow(new TroppeRichiesteException("troppe")).when(limitatore).registra(CLIENT);

        importSettimanale().assicura(CHIAVE, CLIENT, importa);

        assertThat(importazioni).hasValue(0);
        assertThat(importati).containsEntry(CHIAVE, vecchio);
    }

    @Test
    void erroreAllaPrimaAperturaRisale() {
        assertThatThrownBy(() -> importSettimanale().assicura(CHIAVE, CLIENT, importaFallisce))
                .isInstanceOf(ServizioEsternoException.class);
        assertThat(importati).isEmpty();
    }

    // aggiornamento fallito: si mostrano le carte salvate e per 30 minuti non si riprova
    @Test
    void erroreInAggiornamentoRinviaEPerTrentaMinutiNonRiprova() {
        Instant vecchio = orologio.instant().minus(Duration.ofDays(8));
        importati.put(CHIAVE, vecchio);
        ImportSettimanale<String> importSettimanale = importSettimanale();

        importSettimanale.assicura(CHIAVE, CLIENT, importaFallisce);
        assertThat(importati).containsEntry(CHIAVE, vecchio);

        orologio.avanza(Duration.ofMinutes(10));
        importSettimanale.assicura(CHIAVE, CLIENT, importaFallisce);
        assertThat(importazioni).hasValue(1);

        orologio.avanza(Duration.ofMinutes(21));
        importSettimanale.assicura(CHIAVE, CLIENT, importa);
        assertThat(importazioni).hasValue(2);
        assertThat(importati).containsEntry(CHIAVE, orologio.instant());
    }

    // due visitatori aprono insieme lo stesso artista: un solo import
    @Test
    void dueChiamateInsiemeImportanoUnaVolta() throws Exception {
        ImportSettimanale<String> importSettimanale = importSettimanale();
        CountDownLatch dentro = new CountDownLatch(1);
        CountDownLatch libera = new CountDownLatch(1);
        Runnable importaLento = () -> {
            importazioni.incrementAndGet();
            dentro.countDown();
            try {
                libera.await(5, TimeUnit.SECONDS);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        };
        ExecutorService esecutore = Executors.newFixedThreadPool(2);
        try {
            Future<?> primo = esecutore.submit(() -> importSettimanale.assicura(CHIAVE, CLIENT, importaLento));
            assertThat(dentro.await(5, TimeUnit.SECONDS)).isTrue();
            Future<?> secondo = esecutore.submit(() -> importSettimanale.assicura(CHIAVE, CLIENT, importaLento));
            libera.countDown();
            primo.get(5, TimeUnit.SECONDS);
            secondo.get(5, TimeUnit.SECONDS);
        } finally {
            esecutore.shutdownNow();
        }

        assertThat(importazioni).hasValue(1);
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
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zona) {
            return this;
        }
    }
}
