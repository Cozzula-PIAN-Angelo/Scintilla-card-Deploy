package com.example.ecommerce.repositories;

import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// carte da rinfrescare nel job: solo quelle nei binder, con prezzi mai letti o più vecchi della soglia
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class OggettoRepositoryPrezziTest {

    @Autowired
    private DataSource dataSource;
    @Autowired
    private OggettoRepository oggettoRepository;

    private JdbcTemplate jdbc;
    private UUID binder;
    private final Instant adesso = Instant.parse("2026-10-22T12:00:00Z");
    private final Instant prima = adesso.minus(Duration.ofDays(7));

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
        UUID utente = UUID.randomUUID();
        binder = UUID.randomUUID();
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'ash', 'ash@esempio.it', 'hash')", utente);
        jdbc.update("INSERT INTO binder (id, id_utente, nome, tasche, pagine, colore, motivo, created_at) "
                + "VALUES (?, ?, 'Fuoco', 9, 10, '#ff0000', 'NESSUNO', now())", binder, utente);
    }

    @Test
    void soloCarteNeiBinderConPrezziVecchiOMaiLetti() {
        nelBinder(carta("mai-1", null), 0);
        nelBinder(carta("vecchia-1", adesso.minus(Duration.ofDays(8))), 1);
        nelBinder(carta("recente-1", adesso.minus(Duration.ofDays(1))), 2);
        carta("fuori-1", null);
        nelBinder(carta(null, null), 3);

        assertThat(oggettoRepository.findIdEsterniConPrezziDaRinfrescare(10, prima))
                .containsExactly("mai-1", "vecchia-1");
    }

    // la stessa carta in più tasche esce una volta sola
    @Test
    void cartaInPiuTascheUnaVolta() {
        UUID doppia = carta("doppia-1", null);
        nelBinder(doppia, 0);
        nelBinder(doppia, 1);

        assertThat(oggettoRepository.findIdEsterniConPrezziDaRinfrescare(10, prima)).containsExactly("doppia-1");
    }

    // prima le mai lette, poi le più vecchie; il limite taglia le altre
    @Test
    void ordineELimite() {
        nelBinder(carta("vecchia-1", adesso.minus(Duration.ofDays(20))), 0);
        nelBinder(carta("vecchissima-1", adesso.minus(Duration.ofDays(90))), 1);
        nelBinder(carta("mai-1", null), 2);

        assertThat(oggettoRepository.findIdEsterniConPrezziDaRinfrescare(2, prima))
                .containsExactly("mai-1", "vecchissima-1");
    }

    private UUID carta(String idEsterno, Instant prezziAggiornatiIl) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, id_esterno, prezzi_aggiornati_il) VALUES (?, ?, 1.00, now(), ?, ?)",
                id, "Carta " + id, idEsterno, prezziAggiornatiIl == null ? null : Timestamp.from(prezziAggiornatiIl));
        return id;
    }

    private void nelBinder(UUID oggetto, int posizione) {
        jdbc.update("INSERT INTO binder_slot (id, id_binder, pagina, posizione, id_oggetto) VALUES (?, ?, 0, ?, ?)",
                UUID.randomUUID(), binder, posizione, oggetto);
    }
}
