package com.example.ecommerce.services;

import com.example.ecommerce.payloads.TcgdexApi;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

// AllineamentoNomi su un PostgreSQL vero: il vincolo di unicità sul nome è quello del database
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class AllineamentoNomiTest {

    @Autowired
    private DataSource dataSource;

    private JdbcTemplate jdbc;
    private AllineamentoNomi allineamento;

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
        allineamento = new AllineamentoNomi(mock(TcgdexClient.class), jdbc, null);
        jdbc.update("INSERT INTO espansioni (id, nome, importata, carte_ufficiali) VALUES ('30th-c', '30th Classic Collection', true, 30)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata, carte_ufficiali) VALUES ('sm2', 'Guardians Rising', true, 145)");
    }

    // la carta convertita da pokemontcg.io prende nome e numero di TCGdex, come una carta importata oggi
    @Test
    void cartaDellaVecchiaApiPrendeNomeENumeroDiTcgdex() {
        UUID scizor = inserisci("30th-c-025", "Scizor ex (30th Celebration: Classic Collection 108)", "108", "30th-c");
        UUID lele = inserisci("sm2-60", "Tapu Lele-GX (Guardians Rising 60/145)", "60", "sm2");

        int allineate = allineamento.allinea(List.of(carta("30th-c-025", "025", "Scizor ex", "30th-c"),
                carta("sm2-60", "60", "Tapu Lele GX", "sm2")));

        assertThat(allineate).isEqualTo(2);
        assertThat(nome(scizor)).isEqualTo("Scizor ex (30th Classic Collection 25/30)");
        assertThat(numero(scizor)).isEqualTo("25");
        assertThat(nome(lele)).isEqualTo("Tapu Lele GX (Guardians Rising 60/145)");
    }

    // le carte che TCGdex non ha (le versioni "a" di pokemontcg.io) restano come sono; quelle già giuste non contano
    @Test
    void senzaTcgdexOGiaGiusteNonSiToccano() {
        UUID versioneA = inserisci("sm2-19a", "Alolan Sandshrew (Guardians Rising 19a/145)", "19a", "sm2");
        UUID giusta = inserisci("sm2-19", "Alolan Sandshrew (Guardians Rising 19/145)", "19", "sm2");

        int allineate = allineamento.allinea(List.of(carta("sm2-19", "19", "Alolan Sandshrew", "sm2")));

        assertThat(allineate).isZero();
        assertThat(nome(versioneA)).isEqualTo("Alolan Sandshrew (Guardians Rising 19a/145)");
        assertThat(nome(giusta)).isEqualTo("Alolan Sandshrew (Guardians Rising 19/145)");
    }

    // due carte che si scambiano il nome: nessuna violazione del vincolo di unicità a metà strada
    @Test
    void scambioDiNomiSenzaErrori() {
        UUID uno = inserisci("30th-c-001", "B (30th Classic Collection 1/30)", "1", "30th-c");
        UUID due = inserisci("30th-c-002", "A (30th Classic Collection 2/30)", "2", "30th-c");

        allineamento.allinea(List.of(carta("30th-c-001", "001", "A", "30th-c"), carta("30th-c-002", "002", "B", "30th-c")));

        assertThat(nome(uno)).isEqualTo("A (30th Classic Collection 1/30)");
        assertThat(nome(due)).isEqualTo("B (30th Classic Collection 2/30)");
    }

    // nome già preso da un'altra carta: come l'import, si aggiunge l'id fra quadre
    @Test
    void nomeGiaUsatoPrendeLId() {
        inserisci("sm2-60a", "Tapu Lele GX (Guardians Rising 60/145)", "60a", "sm2");
        UUID lele = inserisci("sm2-60", "Tapu Lele-GX (Guardians Rising 60/145)", "60", "sm2");

        allineamento.allinea(List.of(carta("sm2-60", "60", "Tapu Lele GX", "sm2")));

        assertThat(nome(lele)).isEqualTo("Tapu Lele GX (Guardians Rising 60/145) [sm2-60]");
    }

    // nome giusto con l'id fra quadre (era già occupato all'import): resta com'è, cambia solo il numero sbagliato
    @Test
    void nomeConLIdRestaECambiaSoloIlNumero() {
        inserisci(null, "Scizor ex (30th Classic Collection 25/30)", null, null);
        UUID scizor = inserisci("30th-c-025", "Scizor ex (30th Classic Collection 25/30) [30th-c-025]", "108", "30th-c");

        int allineate = allineamento.allinea(List.of(carta("30th-c-025", "025", "Scizor ex", "30th-c")));

        assertThat(allineate).isEqualTo(1);
        assertThat(nome(scizor)).isEqualTo("Scizor ex (30th Classic Collection 25/30) [30th-c-025]");
        assertThat(numero(scizor)).isEqualTo("25");
    }

    private UUID inserisci(String idEsterno, String nome, String numero, String espansione) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, id_esterno, numero, espansione_id) "
                + "VALUES (?, ?, 1.00, now(), ?, ?, ?)", id, nome, idEsterno, numero, espansione);
        return id;
    }

    private static TcgdexApi.CartaDelCatalogo carta(String id, String localId, String nome, String set) {
        return new TcgdexApi.CartaDelCatalogo(id, localId, nome, new TcgdexApi.SetDellaCarta(set, null, null));
    }

    private String nome(UUID id) {
        return jdbc.queryForObject("SELECT nome FROM oggetti WHERE id = ?", String.class, id);
    }

    private String numero(UUID id) {
        return jdbc.queryForObject("SELECT numero FROM oggetti WHERE id = ?", String.class, id);
    }
}
