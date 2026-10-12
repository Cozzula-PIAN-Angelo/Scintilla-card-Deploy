package com.example.ecommerce;

import com.example.ecommerce.entities.TokenRevocato;
import com.example.ecommerce.repositories.TokenRevocatoRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Migrazioni Flyway su un PostgreSQL vero (embedded-postgres, senza Docker). Il contesto parte solo se
// Flyway applica le migrazioni e Hibernate, in validate, trova lo schema identico alle entity.
// Qui vivono anche i controlli che prima faceva VerificaVincoli all'avvio, solo con un warn nel log
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class MigrazioniTest {

    // "tabella.colonna" -> regola ON DELETE attesa, come nelle annotazioni @OnDelete delle entity
    private static final Map<String, String> ATTESE = Map.of(
            "ruoli_utenti.id_utente", "CASCADE",
            "ruoli_utenti.id_ruolo", "CASCADE",
            "utenti_oggetti_preferiti.id_utente", "CASCADE",
            "utenti_oggetti_preferiti.id_oggetto", "CASCADE",
            "binder.id_utente", "CASCADE",
            "binder.id_carta_copertina", "SET NULL",
            "binder_immagini.id_binder", "CASCADE",
            "binder_slot.id_binder", "CASCADE",
            "binder_slot.id_oggetto", "CASCADE");

    private static final String REGOLE = """
            SELECT c.conrelid::regclass::text AS tabella, a.attname AS colonna,
                   CASE c.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT'
                                      WHEN 'r' THEN 'RESTRICT' ELSE 'NO ACTION' END AS regola
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'f'
            """;

    @Autowired
    private DataSource dataSource;
    @Autowired
    private TokenRevocatoRepository tokenRevocatoRepository;

    private JdbcTemplate jdbc;

    private final UUID utente = UUID.randomUUID();
    private final UUID carta = UUID.randomUUID();
    private final UUID binder = UUID.randomUUID();

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
    }

    // il contesto è partito: Flyway ha applicato le migrazioni e Hibernate (validate) non ha trovato differenze
    @Test
    void loSchemaCorrispondeAlleEntity() {
        assertThat(versioniApplicate()).containsExactly("1", "2");
    }

    // pulizia notturna della blacklist sulla tabella della V2: via solo i jti già scaduti
    @Test
    void pulisciTokenScadutiSulloSchemaNuovo() {
        UUID scaduto = UUID.randomUUID();
        UUID valido = UUID.randomUUID();
        tokenRevocatoRepository.save(new TokenRevocato(scaduto, Instant.now().minusSeconds(60)));
        tokenRevocatoRepository.save(new TokenRevocato(valido, Instant.now().plusSeconds(3600)));
        tokenRevocatoRepository.flush();

        assertThat(tokenRevocatoRepository.deleteByScadenzaBefore(Instant.now())).isEqualTo(1);
        assertThat(tokenRevocatoRepository.existsById(valido)).isTrue();
        assertThat(tokenRevocatoRepository.existsById(scaduto)).isFalse();
    }

    @Test
    void regoleOnDelete() {
        assertThat(regolePresenti()).containsAllEntriesOf(ATTESE);
    }

    // carta tolta dal catalogo: via le tasche e i preferiti che la contenevano, copertina dei binder svuotata
    @Test
    void cancellareUnaCartaPulisceTascheEPreferiti() {
        inserisciUtenteCartaEBinder();

        jdbc.update("DELETE FROM oggetti WHERE id = ?", carta);

        assertThat(contaRighe("binder_slot")).isZero();
        assertThat(contaRighe("utenti_oggetti_preferiti")).isZero();
        assertThat(jdbc.queryForObject("SELECT id_carta_copertina FROM binder WHERE id = ?", UUID.class, binder)).isNull();
    }

    @Test
    void cancellareUnBinderTogliTascheEImmagine() {
        inserisciUtenteCartaEBinder();

        jdbc.update("DELETE FROM binder WHERE id = ?", binder);

        assertThat(contaRighe("binder_slot")).isZero();
        assertThat(contaRighe("binder_immagini")).isZero();
    }

    // un utente con un binder (carta in copertina e in una tasca, immagine caricata) e la stessa carta nei preferiti
    private void inserisciUtenteCartaEBinder() {
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'mario', 'mario@esempio.it', 'hash')", utente);
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at) VALUES (?, 'Pikachu (Base 58/102)', 2.50, now())", carta);
        jdbc.update("""
                INSERT INTO binder (id, id_utente, nome, tasche, pagine, colore, motivo, id_carta_copertina, created_at)
                VALUES (?, ?, 'Il mio binder', 9, 10, '#2a75bb', 'STELLE', ?, now())""", binder, utente, carta);
        jdbc.update("INSERT INTO binder_slot (id, id_binder, pagina, posizione, id_oggetto) VALUES (?, ?, 0, 0, ?)",
                UUID.randomUUID(), binder, carta);
        jdbc.update("INSERT INTO binder_immagini (id_binder, contenuto, content_type) VALUES (?, ?, 'image/webp')",
                binder, new byte[]{1, 2, 3});
        jdbc.update("INSERT INTO utenti_oggetti_preferiti (id, id_utente, id_oggetto, created_at) VALUES (?, ?, ?, now())",
                UUID.randomUUID(), utente, carta);
    }

    private List<String> versioniApplicate() {
        return jdbc.queryForList("SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank", String.class);
    }

    private Map<String, String> regolePresenti() {
        Map<String, String> regole = new HashMap<>();
        jdbc.query(REGOLE, riga -> {
            regole.put(riga.getString("tabella") + "." + riga.getString("colonna"), riga.getString("regola"));
        });
        return regole;
    }

    private int contaRighe(String tabella) {
        return jdbc.queryForObject("SELECT count(*) FROM " + tabella, Integer.class);
    }
}
