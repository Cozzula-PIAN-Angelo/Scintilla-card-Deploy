package com.example.ecommerce;

import com.example.ecommerce.services.UnioneDoppioniTcgdex;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// V14 sui dati: il contesto si ferma alla V13, il test inserisce le carte rimaste con l'id di pokemontcg.io accanto
// alle stesse carte scaricate da TCGdex, con collezione, binder e preferiti, e poi applica la V14.
// Senza transazione del test: Flyway usa una connessione sua e deve vedere le righe inserite
@DataJpaTest(properties = {"spring.flyway.target=13", "spring.jpa.hibernate.ddl-auto=none"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class MigrazioneDoppioniTest {

    private static final String IMMAGINE_VECCHIA = "/immagini/carte/me55c-99.webp";
    private static final String IMMAGINE_TCGDEX = "https://assets.tcgdex.net/en/sv/sv10.5b/080/high.webp";

    @Autowired
    private DataSource dataSource;

    @Test
    void doppioniUnitiAllaCartaDiTcgdex() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('30th-c', '30th Classic Collection', true)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('sv10.5b', 'Black Bolt', true)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('ecard2', 'Aquapolis', true)");
        UUID mario = utente(jdbc, "mario");
        UUID luigi = utente(jdbc, "luigi");

        // Darkrai & Cresselia LEGEND: la vecchia con l'immagine locale, quella di TCGdex senza immagine
        UUID darkraiVecchia = carta(jdbc, "me55c-99", "30th-c", IMMAGINE_VECCHIA);
        UUID darkrai = carta(jdbc, "30th-c-019", "30th-c", null);
        // Antique Cover Fossil: la vecchia senza immagine, quella di TCGdex con la sua
        UUID fossileVecchio = carta(jdbc, "zsv10pt5-80", "sv10.5b", null);
        UUID fossile = carta(jdbc, "sv10.5b-080", "sv10.5b", IMMAGINE_TCGDEX);
        // Palkia LV.X: solo la vecchia (set non ancora riscaricato da TCGdex)
        UUID palkia = carta(jdbc, "me55c-106p", "30th-c", "/immagini/carte/me55c-106p.webp");
        // Golduck di Aquapolis: la vecchia è la versione a; la b, senza immagine, non si tocca
        UUID golduckVecchio = carta(jdbc, "ecard2-50", "ecard2", "/immagini/carte/ecard2-50.webp");
        UUID golduckA = carta(jdbc, "ecard2-50a", "ecard2", null);
        UUID golduckB = carta(jdbc, "ecard2-50b", "ecard2", null);
        copia(jdbc, luigi, golduckVecchio, 1);
        jdbc.update("INSERT INTO oggetti_pokedex (numero_pokedex, oggetto_id) VALUES (491, ?)", darkraiVecchia);

        // mario ha la stessa carta sotto i due id: le copie si sommano; luigi solo la vecchia: passa alla nuova
        copia(jdbc, mario, darkraiVecchia, 2);
        copia(jdbc, mario, darkrai, 1);
        copia(jdbc, luigi, darkraiVecchia, 3);
        preferita(jdbc, mario, darkraiVecchia);
        preferita(jdbc, mario, darkrai);
        preferita(jdbc, luigi, fossileVecchio);
        UUID binder = binder(jdbc, mario, fossileVecchio);
        tasca(jdbc, binder, 1, fossileVecchio);
        tasca(jdbc, binder, 2, fossile);

        Flyway.configure().dataSource(dataSource).load().migrate();

        assertThat(jdbc.queryForList("SELECT id_esterno FROM oggetti ORDER BY id_esterno", String.class))
                .containsExactly("30th-c-019", "30th-c-022", "ecard2-50a", "ecard2-50b", "sv10.5b-080");
        assertThat(immagine(jdbc, golduckA)).isEqualTo("/immagini/carte/ecard2-50.webp");
        assertThat(immagine(jdbc, golduckB)).isNull();
        assertThat(quantita(jdbc, luigi, golduckA)).isEqualTo(1);
        // la carta di TCGdex senza immagine prende quella locale della vecchia; chi ce l'ha la tiene
        assertThat(immagine(jdbc, darkrai)).isEqualTo(IMMAGINE_VECCHIA);
        assertThat(immagine(jdbc, fossile)).isEqualTo(IMMAGINE_TCGDEX);
        assertThat(quantita(jdbc, mario, darkrai)).isEqualTo(3);
        assertThat(quantita(jdbc, luigi, darkrai)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM utenti_oggetti_preferiti WHERE id_oggetto = ?", Integer.class, darkrai))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM utenti_oggetti_preferiti WHERE id_oggetto = ? AND id_utente = ?",
                Integer.class, fossile, luigi)).isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT id_oggetto FROM binder_slot WHERE id_binder = ? ORDER BY posizione", UUID.class, binder))
                .containsExactly(fossile, fossile);
        assertThat(jdbc.queryForObject("SELECT id_carta_copertina FROM binder WHERE id = ?", UUID.class, binder)).isEqualTo(fossile);
        // senza la nuova la vecchia prende solo l'id di TCGdex (immagine tenuta); rarità e artista da rileggere
        assertThat(jdbc.queryForObject("SELECT id_esterno FROM oggetti WHERE id = ?", String.class, palkia)).isEqualTo("30th-c-022");
        assertThat(immagine(jdbc, palkia)).isEqualTo("/immagini/carte/me55c-106p.webp");
        assertThat(jdbc.queryForObject("SELECT rarita IS NULL AND varianti IS NULL FROM oggetti WHERE id = ?", Boolean.class, palkia))
                .isTrue();

        // rilanciata non cambia niente
        assertThat(UnioneDoppioniTcgdex.unisci(jdbc)).isEqualTo(new UnioneDoppioniTcgdex.Esito(0, 0));
    }

    private static UUID utente(JdbcTemplate jdbc, String nome) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, ?, ?, 'hash')", id, nome, nome + "@esempio.it");
        return id;
    }

    private static UUID carta(JdbcTemplate jdbc, String idEsterno, String set, String immagine) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, immagine_url, id_esterno, espansione_id, rarita, varianti) "
                + "VALUES (?, ?, 1.00, now(), ?, ?, ?, 'Rare', 'NORMALE')", id, "Carta " + idEsterno, immagine, idEsterno, set);
        return id;
    }

    private static void copia(JdbcTemplate jdbc, UUID utente, UUID carta, int quantita) {
        jdbc.update("INSERT INTO collezione (id, id_utente, id_oggetto, variante, quantita, aggiornata_il) VALUES (?, ?, ?, 'NORMALE', ?, now())",
                UUID.randomUUID(), utente, carta, quantita);
    }

    private static void preferita(JdbcTemplate jdbc, UUID utente, UUID carta) {
        jdbc.update("INSERT INTO utenti_oggetti_preferiti (id, id_utente, id_oggetto, created_at) VALUES (?, ?, ?, now())",
                UUID.randomUUID(), utente, carta);
    }

    private static UUID binder(JdbcTemplate jdbc, UUID utente, UUID copertina) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO binder (id, id_utente, nome, tasche, pagine, colore, motivo, created_at, id_carta_copertina) "
                + "VALUES (?, ?, 'Prova', 9, 10, '#123456', 'NESSUNO', now(), ?)", id, utente, copertina);
        return id;
    }

    private static void tasca(JdbcTemplate jdbc, UUID binder, int posizione, UUID carta) {
        jdbc.update("INSERT INTO binder_slot (id, id_binder, pagina, posizione, id_oggetto) VALUES (?, ?, 1, ?, ?)",
                UUID.randomUUID(), binder, posizione, carta);
    }

    private static String immagine(JdbcTemplate jdbc, UUID carta) {
        return jdbc.queryForObject("SELECT immagine_url FROM oggetti WHERE id = ?", String.class, carta);
    }

    private static int quantita(JdbcTemplate jdbc, UUID utente, UUID carta) {
        return jdbc.queryForObject("SELECT quantita FROM collezione WHERE id_utente = ? AND id_oggetto = ?", Integer.class, utente, carta);
    }
}
