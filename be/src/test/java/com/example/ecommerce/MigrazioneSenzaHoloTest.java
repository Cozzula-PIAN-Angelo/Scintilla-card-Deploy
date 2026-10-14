package com.example.ecommerce;

import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// V6 sui dati: il contesto si ferma alla V5, il test inserisce righe Holo e poi applica la V6.
// Senza transazione del test: Flyway usa una connessione sua e deve vedere le righe inserite.
// ddl-auto=none: alla V5 lo schema non ha ancora le colonne delle migrazioni successive (es. artista della V7),
// e il validate di Hibernate fermerebbe il contesto
@DataJpaTest(properties = {"spring.flyway.target=5", "spring.jpa.hibernate.ddl-auto=none"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class MigrazioneSenzaHoloTest {

    @Autowired
    private DataSource dataSource;

    @Test
    void holoDiventaNormale() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        UUID utente = UUID.randomUUID();
        UUID soloHolo = inserisciCarta(jdbc, "Charizard (Base 4/102)", "HOLO");
        UUID holoENormale = inserisciCarta(jdbc, "Pikachu (Base 58/102)", "NORMALE,REVERSE_HOLO,HOLO");
        UUID primaEdizione = inserisciCarta(jdbc, "Blastoise (Base 2/102)", "PRIMA_EDIZIONE,PRIMA_EDIZIONE_HOLO");
        UUID senzaHolo = inserisciCarta(jdbc, "Abra (Base 43/102)", "NORMALE,REVERSE_HOLO");
        UUID vuota = inserisciCarta(jdbc, "Energia (Base 99/102)", "");
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'mario', 'mario@esempio.it', 'hash')", utente);
        // solo Holo: la riga si rinomina
        inserisciCopia(jdbc, utente, soloHolo, "HOLO", 2);
        // Holo e Normale: le quantità si sommano sulla Normale; la Reverse resta com'è
        inserisciCopia(jdbc, utente, holoENormale, "HOLO", 3);
        inserisciCopia(jdbc, utente, holoENormale, "NORMALE", 1);
        inserisciCopia(jdbc, utente, holoENormale, "REVERSE_HOLO", 4);
        // somma oltre il massimo: si ferma a 999
        inserisciCopia(jdbc, utente, primaEdizione, "PRIMA_EDIZIONE_HOLO", 900);
        inserisciCopia(jdbc, utente, primaEdizione, "PRIMA_EDIZIONE", 500);

        Flyway.configure().dataSource(dataSource).load().migrate();

        assertThat(copie(jdbc, soloHolo)).containsExactly("NORMALE=2");
        assertThat(copie(jdbc, holoENormale)).containsExactly("NORMALE=4", "REVERSE_HOLO=4");
        assertThat(copie(jdbc, primaEdizione)).containsExactly("PRIMA_EDIZIONE=999");
        assertThat(varianti(jdbc, soloHolo)).isEqualTo("NORMALE");
        assertThat(varianti(jdbc, holoENormale)).isEqualTo("NORMALE,REVERSE_HOLO");
        assertThat(varianti(jdbc, primaEdizione)).isEqualTo("PRIMA_EDIZIONE");
        assertThat(varianti(jdbc, senzaHolo)).isEqualTo("NORMALE,REVERSE_HOLO");
        assertThat(varianti(jdbc, vuota)).isEmpty();
    }

    private UUID inserisciCarta(JdbcTemplate jdbc, String nome, String varianti) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, varianti) VALUES (?, ?, 1.00, now(), ?)", id, nome, varianti);
        return id;
    }

    private void inserisciCopia(JdbcTemplate jdbc, UUID utente, UUID carta, String variante, int quantita) {
        jdbc.update("INSERT INTO collezione (id, id_utente, id_oggetto, variante, quantita, aggiornata_il) VALUES (?, ?, ?, ?, ?, now())",
                UUID.randomUUID(), utente, carta, variante, quantita);
    }

    // "VARIANTE=quantità", in ordine di variante
    private List<String> copie(JdbcTemplate jdbc, UUID carta) {
        return jdbc.queryForList("SELECT variante || '=' || quantita FROM collezione WHERE id_oggetto = ? ORDER BY variante",
                String.class, carta);
    }

    private String varianti(JdbcTemplate jdbc, UUID carta) {
        return jdbc.queryForObject("SELECT varianti FROM oggetti WHERE id = ?", String.class, carta);
    }
}
