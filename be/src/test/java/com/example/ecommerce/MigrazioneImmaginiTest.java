package com.example.ecommerce;

import com.example.ecommerce.services.AbbinamentoTcgdex;
import com.example.ecommerce.services.ConversioneImmaginiLocali;
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

// V10 sui dati: il contesto si ferma alla V9, il test inserisce set e carte con immagini di pokemontcg.io e Scrydex e
// poi applica la V10 con il file di abbinamento dei test (src/test/resources/abbinamento-id.json).
// Senza transazione del test: Flyway usa una connessione sua e deve vedere le righe inserite
@DataJpaTest(properties = {"spring.flyway.target=9", "spring.jpa.hibernate.ddl-auto=none"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class MigrazioneImmaginiTest {

    private static final String TCGDEX = "https://assets.tcgdex.net/en/sv/sv03.5/006/high.webp";
    private static final String A_MANO = "https://esempio.it/carta.png";

    @Autowired
    private DataSource dataSource;

    @Test
    void immaginiDeiVecchiServerDiventanoLocali() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        set(jdbc, "sv03.5", "https://assets.tcgdex.net/en/sv/sv03.5/logo.png", "https://images.pokemontcg.io/sv3pt5/symbol.png");
        set(jdbc, "30th", "https://images.scrydex.com/pokemon/me55-logo/logo", null);
        set(jdbc, "2014xy", "https://images.pokemontcg.io/mcd14/logo.png", "https://images.pokemontcg.io/mcd14/symbol.png");
        UUID riserva = carta(jdbc, "Charmander", "sm7.5-1", "https://images.pokemontcg.io/sm75/1_hires.png");
        UUID vecchia = carta(jdbc, "Variante a", "sm2-121a", "https://images.pokemontcg.io/sm2/121a_hires.png");
        UUID sparita = carta(jdbc, "McDonald's", "2014xy-1", "https://images.pokemontcg.io/mcd14/1_hires.png");
        UUID diTcgdex = carta(jdbc, "Charizard ex", "sv03.5-006", TCGDEX);
        UUID aMano = carta(jdbc, "Oggetto a mano", null, A_MANO);

        Flyway.configure().dataSource(dataSource).load().migrate();

        assertThat(immagine(jdbc, riserva)).isEqualTo("/immagini/carte/sm7.5-1.webp");
        assertThat(immagine(jdbc, vecchia)).isEqualTo("/immagini/carte/sm2-121a.webp");
        // già sparita dai server di pokemontcg.io e senza copia: niente immagine, il frontend mostra il segnaposto
        assertThat(immagine(jdbc, sparita)).isNull();
        assertThat(immagine(jdbc, diTcgdex)).isEqualTo(TCGDEX);
        assertThat(immagine(jdbc, aMano)).isEqualTo(A_MANO);
        assertThat(jdbc.queryForList("SELECT id || '|' || coalesce(logo_url, '') || '|' || coalesce(simbolo_url, '') "
                + "FROM espansioni ORDER BY id", String.class)).containsExactly(
                "2014xy||",
                "30th|/immagini/set/30th-logo.webp|",
                "sv03.5|https://assets.tcgdex.net/en/sv/sv03.5/logo.png|/immagini/set/sv03.5-simbolo.webp");

        // rilanciata non cambia niente
        assertThat(ConversioneImmaginiLocali.converti(jdbc, AbbinamentoTcgdex.get()))
                .isEqualTo(new ConversioneImmaginiLocali.Esito(0, 0, 0));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM oggetti WHERE immagine_url ~ 'pokemontcg|scrydex'", Integer.class)
                + jdbc.queryForObject("SELECT count(*) FROM espansioni WHERE logo_url ~ 'pokemontcg|scrydex' "
                + "OR simbolo_url ~ 'pokemontcg|scrydex'", Integer.class)).isZero();
    }

    private static void set(JdbcTemplate jdbc, String id, String logo, String simbolo) {
        jdbc.update("INSERT INTO espansioni (id, nome, importata, logo_url, simbolo_url) VALUES (?, ?, false, ?, ?)",
                id, "Set " + id, logo, simbolo);
    }

    private static UUID carta(JdbcTemplate jdbc, String nome, String idEsterno, String immagine) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, immagine_url, id_esterno) VALUES (?, ?, 1.00, now(), ?, ?)",
                id, nome, immagine, idEsterno);
        return id;
    }

    private static String immagine(JdbcTemplate jdbc, UUID carta) {
        return jdbc.queryForObject("SELECT immagine_url FROM oggetti WHERE id = ?", String.class, carta);
    }
}
