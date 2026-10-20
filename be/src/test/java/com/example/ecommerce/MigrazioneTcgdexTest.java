package com.example.ecommerce;

import com.example.ecommerce.services.AbbinamentoTcgdex;
import com.example.ecommerce.services.ConversioneIdTcgdex;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// V9 sui dati: il contesto si ferma alla V8, il test inserisce set e carte con gli id di pokemontcg.io e poi applica
// la V9 con il file di abbinamento dei test (src/test/resources/abbinamento-id.json).
// Senza transazione del test: Flyway usa una connessione sua e deve vedere le righe inserite
@DataJpaTest(properties = {"spring.flyway.target=8", "spring.jpa.hibernate.ddl-auto=none"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class MigrazioneTcgdexTest {

    private static final String IMMAGINE_VECCHIA = "https://images.pokemontcg.io/sv3pt5/6_hires.png";
    private static final String RISERVA = "https://images.pokemontcg.io/sm75/1_hires.png";

    @Autowired
    private DataSource dataSource;

    // il database embedded è condiviso: si torna alla V8 vuota per gli altri test della classe
    @AfterEach
    void pulisci() {
        new JdbcTemplate(dataSource).execute("TRUNCATE espansioni, oggetti, utenti, collezione, binder, binder_slot, "
                + "artisti_importati CASCADE");
    }

    @Test
    void idRiscrittiECollezioneIntatta() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        set(jdbc, "sv3pt5", true);
        set(jdbc, "sm75", false);
        set(jdbc, "base1", true);
        set(jdbc, "zzz", false);
        UUID charizard = carta(jdbc, "Charizard ex (151 6/165)", "sv3pt5-6", "sv3pt5", IMMAGINE_VECCHIA);
        UUID charmander = carta(jdbc, "Charmander (Dragon Majesty 1/70)", "sm75-1", "sm75", RISERVA);
        UUID nonAbbinata = carta(jdbc, "Carta sconosciuta (Zzz 1)", "zzz-1", "zzz", "https://esempio.it/zzz.png");
        UUID utente = UUID.randomUUID();
        UUID binder = UUID.randomUUID();
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'ash', 'ash@esempio.it', 'hash')", utente);
        jdbc.update("INSERT INTO collezione (id, id_utente, id_oggetto, variante, quantita, aggiornata_il) "
                + "VALUES (?, ?, ?, 'REVERSE_HOLO', 2, now())", UUID.randomUUID(), utente, charizard);
        jdbc.update("INSERT INTO binder (id, id_utente, nome, tasche, pagine, colore, motivo, created_at) "
                + "VALUES (?, ?, 'Fuoco', 9, 10, '#ff0000', 'NESSUNO', now())", binder, utente);
        jdbc.update("INSERT INTO binder_slot (id, id_binder, pagina, posizione, id_oggetto, variante) "
                + "VALUES (?, ?, 0, 0, ?, 'REVERSE_HOLO')", UUID.randomUUID(), binder, charizard);
        jdbc.update("INSERT INTO artisti_importati (slug, importato_il) VALUES ('mitsuhiro-arita', now())");

        Flyway.configure().dataSource(dataSource).load().migrate();

        assertThat(jdbc.queryForList("SELECT id || '=' || importata FROM espansioni ORDER BY id", String.class))
                .containsExactly("base1=true", "sm7.5=false", "sv03.5=true", "zzz=false");
        assertThat(campi(jdbc, charizard)).isEqualTo("sv03.5-006|sv03.5|https://assets.tcgdex.net/en/sv/sv03.5/006/high.webp|||");
        // TCGdex non ha la figura: la V9 tiene quella di pokemontcg.io, la V10 la sostituisce con la copia locale
        assertThat(campi(jdbc, charmander)).isEqualTo("sm7.5-1|sm7.5|/immagini/carte/sm7.5-1.webp|||");
        assertThat(campi(jdbc, nonAbbinata)).isEqualTo("zzz-1|zzz|https://esempio.it/zzz.png|NORMALE|Common|Ken Sugimori");
        assertThat(jdbc.queryForObject("SELECT id_oggetto FROM collezione", UUID.class)).isEqualTo(charizard);
        assertThat(jdbc.queryForObject("SELECT id_oggetto FROM binder_slot", UUID.class)).isEqualTo(charizard);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM artisti_importati", Integer.class)).isZero();

        // rilanciata non cambia niente: restano solo le carte che il file non conosce
        assertThat(ConversioneIdTcgdex.converti(jdbc, AbbinamentoTcgdex.get()))
                .isEqualTo(new ConversioneIdTcgdex.Esito(0, 0, 1));
    }

    // base1 e base1-4 hanno lo stesso id nelle due fonti: la carta prende l'immagine di TCGdex e si rilegge.
    // La conversione chiamata direttamente (è tutto quello che fa la V9): il database è condiviso con l'altro
    // test, e la V9 può essere già applicata
    @Test
    void stessoIdCambiaSoloImmagineEDati() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        set(jdbc, "base1", true);
        UUID charizard = carta(jdbc, "Charizard (Base 4/102)", "base1-4", "base1", "https://images.pokemontcg.io/base1/4_hires.png");

        assertThat(ConversioneIdTcgdex.converti(jdbc, AbbinamentoTcgdex.get()))
                .isEqualTo(new ConversioneIdTcgdex.Esito(0, 1, 0));

        assertThat(campi(jdbc, charizard)).isEqualTo("base1-4|base1|https://assets.tcgdex.net/en/base/base1/4/high.webp|||");
        assertThat(ConversioneIdTcgdex.converti(jdbc, AbbinamentoTcgdex.get()))
                .isEqualTo(new ConversioneIdTcgdex.Esito(0, 0, 0));
    }

    private static void set(JdbcTemplate jdbc, String id, boolean importata) {
        jdbc.update("INSERT INTO espansioni (id, nome, serie, data_uscita, totale_carte, logo_url, simbolo_url, importata) "
                        + "VALUES (?, ?, 'Serie', '2023-09-22', 207, 'https://logo/' || ?, 'https://simbolo/' || ?, ?)",
                id, "Set " + id, id, id, importata);
    }

    private static UUID carta(JdbcTemplate jdbc, String nome, String idEsterno, String set, String immagine) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, immagine_url, id_esterno, espansione_id, numero, "
                        + "varianti, rarita, artista) VALUES (?, ?, 1.00, now(), ?, ?, ?, '1', 'NORMALE', 'Common', 'Ken Sugimori')",
                id, nome, immagine, idEsterno, set);
        return id;
    }

    // "id_esterno|espansione|immagine|varianti|rarità|artista", null come stringa vuota
    private static String campi(JdbcTemplate jdbc, UUID carta) {
        return jdbc.queryForObject("SELECT concat_ws('|', id_esterno, espansione_id, immagine_url, coalesce(varianti, ''), "
                + "coalesce(rarita, ''), coalesce(artista, '')) FROM oggetti WHERE id = ?", String.class, carta);
    }
}
