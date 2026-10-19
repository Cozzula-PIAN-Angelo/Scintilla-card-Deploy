package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.exceptions.TroppeRichiesteException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// import settimanale in background; l'esecutore è sincrono, così l'import è già finito quando assicura risponde
class ImportSettimanaleTest {

    private static final String CHIAVE = "mitsuhiro-arita";
    private static final String CLIENT = "203.0.113.7";

    // data dell'ultimo import per chiave, al posto della tabella
    private final Map<String, Instant> importati = new HashMap<>();
    private final OrologioFinto orologio = new OrologioFinto(Instant.parse("2026-10-14T10:00:00Z"));
    private final AtomicInteger importazioni = new AtomicInteger();

    private final Runnable importa = importazioni::incrementAndGet;

    private final Runnable importaFallisce = () -> {
        importazioni.incrementAndGet();
        throw new ServizioEsternoException("pokemontcg.io giù", null);
    };

    private ImportSettimanale<String> importSettimanale(int limite) {
        ImportInBackground background = new ImportInBackground(Runnable::run, new LimitatoreImport(limite, 1000, orologio), orologio);
        return new ImportSettimanale<>(background, chiave -> Optional.ofNullable(importati.get(chiave)), importati::put,
                "artista", orologio);
    }

    @Test
    void primaAperturaImportaERegistra() {
        ImportSettimanale.Stato stato = importSettimanale(10).assicura(CHIAVE, CLIENT, importa);

        // la data letta all'inizio non c'era: la risposta è quella della pagina al volo
        assertThat(stato).isEqualTo(new ImportSettimanale.Stato(false, false));
        assertThat(importazioni).hasValue(1);
        assertThat(importati).containsEntry(CHIAVE, orologio.instant());
    }

    @Test
    void entroLaSettimanaNonImporta() {
        importati.put(CHIAVE, orologio.instant().minus(Duration.ofDays(6)));

        assertThat(importSettimanale(10).assicura(CHIAVE, CLIENT, importa)).isEqualTo(new ImportSettimanale.Stato(true, false));
        assertThat(importazioni).hasValue(0);
    }

    // aggiornamento: le carte salvate si mostrano subito, il riscaricamento non fa aspettare
    @Test
    void aggiornamentoRispondeCompletoEImporta() {
        importati.put(CHIAVE, orologio.instant().minus(Duration.ofDays(8)));

        assertThat(importSettimanale(10).assicura(CHIAVE, CLIENT, importa)).isEqualTo(new ImportSettimanale.Stato(true, false));
        assertThat(importazioni).hasValue(1);
        assertThat(importati).containsEntry(CHIAVE, orologio.instant());
    }

    @Test
    void limiteRaggiuntoAllAggiornamentoNonLancia() {
        importati.put(CHIAVE, orologio.instant().minus(Duration.ofDays(8)));

        assertThat(importSettimanale(0).assicura(CHIAVE, CLIENT, importa)).isEqualTo(new ImportSettimanale.Stato(true, false));
        assertThat(importazioni).hasValue(0);
    }

    @Test
    void limiteRaggiuntoAllaPrimaAperturaLancia() {
        assertThatThrownBy(() -> importSettimanale(0).assicura(CHIAVE, CLIENT, importa))
                .isInstanceOf(TroppeRichiesteException.class);
    }

    // fallito: lo si dice alla pagina e per 30 minuti non si riprova
    @Test
    void primaAperturaFallitaSegnaFallito() {
        ImportSettimanale<String> importSettimanale = importSettimanale(10);

        assertThat(importSettimanale.assicura(CHIAVE, CLIENT, importaFallisce)).isEqualTo(new ImportSettimanale.Stato(false, true));
        assertThat(importSettimanale.assicura(CHIAVE, CLIENT, importaFallisce)).isEqualTo(new ImportSettimanale.Stato(false, true));
        assertThat(importazioni).hasValue(1);
        assertThat(importati).doesNotContainKey(CHIAVE);
    }

    @Test
    void aggiornamentoFallitoNonCambiaLaData() {
        Instant vecchio = orologio.instant().minus(Duration.ofDays(8));
        importati.put(CHIAVE, vecchio);

        assertThat(importSettimanale(10).assicura(CHIAVE, CLIENT, importaFallisce)).isEqualTo(new ImportSettimanale.Stato(true, false));
        assertThat(importati).containsEntry(CHIAVE, vecchio);
    }

    private static final class OrologioFinto extends Clock {
        private final Instant adesso;

        private OrologioFinto(Instant adesso) {
            this.adesso = adesso;
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
