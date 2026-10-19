package com.example.ecommerce.services;

import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static com.example.ecommerce.entities.Variante.NORMALE;
import static com.example.ecommerce.entities.Variante.PRIMA_EDIZIONE;
import static com.example.ecommerce.entities.Variante.REVERSE_HOLO;
import static com.example.ecommerce.services.VariantiMaster.effettive;
import static org.assertj.core.api.Assertions.assertThat;

// regola delle varianti del master set; i set senza dati su un PostgreSQL vero
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class VariantiMasterTest {

    @Autowired
    private DataSource dataSource;

    @Test
    void lettaConReverse() {
        assertThat(effettive(List.of(NORMALE, REVERSE_HOLO), "Common", false)).containsExactly(NORMALE, REVERSE_HOLO);
    }

    @Test
    void primaEdizioneTolta() {
        assertThat(effettive(List.of(NORMALE, PRIMA_EDIZIONE), "Rare Holo", false)).containsExactly(NORMALE);
    }

    @Test
    void soloPrimaEdizioneValeNormale() {
        assertThat(effettive(List.of(PRIMA_EDIZIONE), "Rare", false)).containsExactly(NORMALE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"Common", "Uncommon", "Rare", "Rare Holo"})
    void vuotaInSetSenzaDatiConReverse(String rarita) {
        assertThat(effettive(List.of(), rarita, true)).containsExactly(NORMALE, REVERSE_HOLO);
    }

    @ParameterizedTest
    @ValueSource(strings = {"Double Rare", "Illustration Rare", "Ultra Rare", "Promo", ""})
    void vuotaInSetSenzaDatiSenzaReverse(String rarita) {
        assertThat(effettive(List.of(), rarita, true)).containsExactly(NORMALE);
    }

    @Test
    void raritaNull() {
        assertThat(effettive(List.of(), null, true)).containsExactly(NORMALE);
    }

    @Test
    void vuotaInSetConDati() {
        assertThat(effettive(List.of(), "Common", false)).containsExactly(NORMALE);
    }

    @Test
    void maiLetta() {
        assertThat(effettive(null, "Common", true)).containsExactly(NORMALE, REVERSE_HOLO);
    }

    @Test
    void setSenzaDati() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        for (String set : List.of("a", "b", "c", "me55c")) {
            jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES (?, ?, true)", set, "Set " + set);
        }
        carta(jdbc, "a", "");
        carta(jdbc, "a", "");
        carta(jdbc, "b", "");
        carta(jdbc, "b", "NORMALE,REVERSE_HOLO");
        carta(jdbc, "c", null);
        carta(jdbc, "me55c", "");

        assertThat(new VariantiMaster(jdbc).setSenzaDati()).containsExactlyInAnyOrder("a", "c");
    }

    private static void carta(JdbcTemplate jdbc, String set, String varianti) {
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, espansione_id, varianti) VALUES (?, ?, ?, now(), ?, ?)",
                UUID.randomUUID(), "Carta " + UUID.randomUUID(), BigDecimal.ONE, set, varianti);
    }
}
