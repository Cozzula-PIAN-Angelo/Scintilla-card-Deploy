package com.example.ecommerce.payloads;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TcgdexApiTest {

    // pezzo vero di GET /en/cards/swsh3-136 (22/10/2026): i campi "-holo" hanno il trattino nel nome
    private static final String CARTA = """
            {"id": "swsh3-136", "localId": "136", "name": "Furret",
             "pricing": {"cardmarket": {"updated": "2026-10-22T13:13:24.189Z", "unit": "EUR", "idProduct": 483559,
               "avg": 0.07, "low": 0.02, "trend": 0.05, "avg1": 0.15, "avg7": 0.06, "avg30": 0.06,
               "avg-holo": 0.28, "low-holo": 0.08, "trend-holo": 0.25, "avg1-holo": 0.25, "avg7-holo": 0.25,
               "avg30-holo": 0.26},
              "tcgplayer": null}}
            """;

    @Test
    void prezziDiCardmarketCompresiQuelliHolo() throws Exception {
        TcgdexApi.Cardmarket cm = new ObjectMapper().readValue(CARTA, TcgdexApi.Carta.class).pricing().cardmarket();

        assertThat(cm.updated()).isEqualTo("2026-10-22T13:13:24.189Z");
        assertThat(cm.low()).isEqualByComparingTo("0.02");
        assertThat(cm.avg30()).isEqualByComparingTo("0.06");
        assertThat(cm.lowHolo()).isEqualByComparingTo("0.08");
        assertThat(cm.avgHolo()).isEqualByComparingTo("0.28");
        assertThat(cm.avg30Holo()).isEqualByComparingTo("0.26");
    }
}
