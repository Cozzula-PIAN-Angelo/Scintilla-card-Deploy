package com.example.ecommerce.runners;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Il seeder dei dati iniziali su un PostgreSQL vero (embedded, come MigrazioniTest): i file di prova hanno
// lo stesso formato di scripts/esporta-dati.ps1. Senza transazione del test, così il rollback del seeder
// si vede davvero
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class DatiInizialiSeederTest {

    private static final String RUOLO = "11111111-1111-1111-1111-111111111111";
    private static final String UTENTE = "22222222-2222-2222-2222-222222222222";
    private static final String CARTA = "33333333-3333-3333-3333-333333333333";
    private static final String BINDER = "44444444-4444-4444-4444-444444444444";
    private static final String QUANDO = "2026-10-16T10:00:00+00:00";

    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private PlatformTransactionManager transazioni;
    @TempDir
    private Path cartella;

    // anche dopo: il database embedded è condiviso con gli altri test, che lo vogliono vuoto
    @BeforeEach
    @AfterEach
    void svuota() {
        jdbc.execute("TRUNCATE " + String.join(", ", DatiInizialiSeeder.TABELLE) + " CASCADE");
    }

    @Test
    void databaseVuotoSiRiempie() throws Exception {
        seeder(scriviFile(datiCompleti())).run();

        for (String tabella : DatiInizialiSeeder.TABELLE) {
            assertThat(conta(tabella)).as(tabella).isEqualTo(1);
        }
        assertThat(jdbc.queryForObject("SELECT contenuto FROM binder_immagini", byte[].class))
                .containsExactly(0x01, 0x02, 0xff);
        assertThat(jdbc.queryForObject("""
                SELECT u.username FROM binder_slot s JOIN binder b ON b.id = s.id_binder
                JOIN utenti u ON u.id = b.id_utente""", String.class)).isEqualTo("ash");
        // i logout fatti prima restano validi: i token revocati passano anche loro
        assertThat(conta("token_revocati")).isEqualTo(1);
    }

    // una tabella aggiunta da una migrazione va elencata in TABELLE (e nello script), altrimenti i suoi dati
    // si perderebbero al prossimo cambio di database senza nessun avviso
    @Test
    void ogniTabellaDelloSchemaEElencata() {
        List<String> tabelleVere = jdbc.queryForList("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
                  AND table_name <> 'flyway_schema_history'""", String.class);

        assertThat(DatiInizialiSeeder.TABELLE).containsExactlyInAnyOrderElementsOf(tabelleVere);
    }

    // la lista di scripts/esporta-dati.ps1 deve essere la stessa, nello stesso ordine (le chiavi esterne)
    @Test
    void scriptEsportaLeStesseTabelle() throws Exception {
        String script = Files.readString(Path.of("..", "scripts", "esporta-dati.ps1"));
        Matcher lista = Pattern.compile("\\$tabelle = @\\(([^)]*)\\)").matcher(script);
        assertThat(lista.find()).as("lista $tabelle nello script").isTrue();
        List<String> nelloScript = Pattern.compile("'([a-z_]+)'").matcher(lista.group(1)).results()
                .map(nome -> nome.group(1)).toList();

        assertThat(nelloScript).containsExactlyElementsOf(DatiInizialiSeeder.TABELLE);
    }

    @Test
    void colonnaAssenteNelFilePrendeIlDefault() throws Exception {
        // file esportato prima di una migrazione che aggiunge una colonna NOT NULL DEFAULT (es. V4 mostra_mancanti)
        Map<String, List<Map<String, Object>>> dati = datiCompleti();
        dati.get("binder").getFirst().remove("mostra_mancanti");

        seeder(scriviFile(dati)).run();

        assertThat(jdbc.queryForObject("SELECT mostra_mancanti FROM binder", Boolean.class)).isTrue();
    }

    @Test
    void tabelleDiCacheGiaPieneVengonoSostituite() throws Exception {
        // es. espansioni sincronizzate da un avvio precedente senza utenti né carte
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('base1', 'Vecchia', false)");

        seeder(scriviFile(datiCompleti())).run();

        assertThat(jdbc.queryForObject("SELECT nome FROM espansioni", String.class)).isEqualTo("Base");
        assertThat(conta("oggetti")).isEqualTo(1);
    }

    @Test
    void databaseConUtenteNonCambia() throws Exception {
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (gen_random_uuid(), 'gia', 'gia@test', 'x')");

        seeder(scriviFile(datiCompleti())).run();

        assertThat(conta("utenti")).isEqualTo(1);
        assertThat(conta("oggetti")).isZero();
        assertThat(conta("binder")).isZero();
    }

    @Test
    void databaseConSoliRuoliSiRiempie() throws Exception {
        jdbc.update("INSERT INTO ruoli (id, nome) VALUES (gen_random_uuid(), 'UTENTE'), (gen_random_uuid(), 'ADMIN')");

        seeder(scriviFile(datiCompleti())).run();

        assertThat(jdbc.queryForList("SELECT id::text FROM ruoli", String.class)).containsExactly(RUOLO);
        assertThat(conta("utenti")).isEqualTo(1);
    }

    @Test
    void fileAssenteNonFaNulla() {
        DatiInizialiSeeder seeder = seeder(cartella.resolve("non-esiste.b64"));

        assertThatCode(seeder::run).doesNotThrowAnyException();
        assertTuttoVuoto();
    }

    @Test
    void fileNonBase64FermaLAvvio() throws Exception {
        Path file = cartella.resolve("rotto.b64");
        Files.writeString(file, "questo non è base64 né gzip");

        // con il file presente un import fallito ferma l'avvio: gli altri seeder non devono riempire il database
        assertThatThrownBy(seeder(file)::run).isInstanceOf(IllegalStateException.class);
        assertTuttoVuoto();
    }

    @Test
    void vincoloViolatoAnnullaTuttoEFermaLAvvio() throws Exception {
        Map<String, List<Map<String, Object>>> dati = datiCompleti();
        dati.get("binder_slot").getFirst().put("id_binder", "99999999-9999-9999-9999-999999999999");

        assertThatThrownBy(seeder(scriviFile(dati))::run).isInstanceOf(IllegalStateException.class);
        assertTuttoVuoto();
    }

    @Test
    void ignoraTabelleSconosciute() throws Exception {
        Map<String, List<Map<String, Object>>> dati = datiCompleti();
        dati.put("tabella_finta", List.of(riga("id", "1")));

        seeder(scriviFile(dati)).run();

        assertThat(conta("oggetti")).isEqualTo(1);
    }

    @Test
    void base64ConACapo() throws Exception {
        Path file = scriviFile(datiCompleti());
        String base64 = Files.readString(file);
        StringBuilder aCapo = new StringBuilder();
        for (int i = 0; i < base64.length(); i += 76) {
            aCapo.append(base64, i, Math.min(i + 76, base64.length())).append("\r\n");
        }
        Files.writeString(file, aCapo);

        seeder(file).run();

        assertThat(conta("oggetti")).isEqualTo(1);
    }

    // export fatto prima del passaggio a TCGdex (id di pokemontcg.io) caricato in un database già alla V9:
    // il seeder converte gli id come la migrazione
    @Test
    void datiConIdVecchiVengonoConvertiti() throws Exception {
        Map<String, List<Map<String, Object>>> dati = datiCompleti();
        dati.get("espansioni").getFirst().put("id", "sv3pt5");
        dati.get("oggetti").getFirst().put("espansione_id", "sv3pt5");
        dati.get("oggetti").getFirst().put("id_esterno", "sv3pt5-6");

        seeder(scriviFile(dati)).run();

        assertThat(jdbc.queryForList("SELECT id FROM espansioni", String.class)).containsExactly("sv03.5");
        assertThat(jdbc.queryForObject("SELECT id_esterno || '|' || espansione_id FROM oggetti", String.class))
                .isEqualTo("sv03.5-006|sv03.5");
        assertThat(conta("utenti_oggetti_preferiti")).isEqualTo(1);
    }

    // e le immagini dei vecchi server diventano le copie locali, come nella V10
    @Test
    void immaginiVecchieDiventanoLocali() throws Exception {
        Map<String, List<Map<String, Object>>> dati = datiCompleti();
        dati.get("espansioni").getFirst().put("id", "sm75");
        dati.get("oggetti").getFirst().put("espansione_id", "sm75");
        dati.get("oggetti").getFirst().put("id_esterno", "sm75-1");
        dati.get("oggetti").getFirst().put("immagine_url", "https://images.pokemontcg.io/sm75/1_hires.png");

        seeder(scriviFile(dati)).run();

        assertThat(jdbc.queryForObject("SELECT id_esterno || '|' || immagine_url FROM oggetti", String.class))
                .isEqualTo("sm7.5-1|/immagini/carte/sm7.5-1.webp");
    }

    private DatiInizialiSeeder seeder(Path file) {
        return new DatiInizialiSeeder(jdbc, transazioni, file.toString());
    }

    private int conta(String tabella) {
        return jdbc.queryForObject("SELECT count(*) FROM " + tabella, Integer.class);
    }

    private void assertTuttoVuoto() {
        for (String tabella : DatiInizialiSeeder.TABELLE) {
            assertThat(conta(tabella)).as(tabella).isZero();
        }
    }

    // stesso formato di scripts/esporta-dati.ps1: base64 di gzip del JSON
    private Path scriviFile(Map<String, List<Map<String, Object>>> dati) throws Exception {
        ByteArrayOutputStream compresso = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(compresso)) {
            gzip.write(new ObjectMapper().writeValueAsBytes(dati));
        }
        Path file = cartella.resolve("dati-iniziali.b64");
        Files.writeString(file, Base64.getEncoder().encodeToString(compresso.toByteArray()), StandardCharsets.US_ASCII);
        return file;
    }

    // una riga per tabella, collegate tra loro come nel database vero
    private static Map<String, List<Map<String, Object>>> datiCompleti() {
        Map<String, List<Map<String, Object>>> dati = new LinkedHashMap<>();
        dati.put("ruoli", lista(riga("id", RUOLO, "nome", "UTENTE")));
        dati.put("utenti", lista(riga("id", UTENTE, "username", "ash", "email", "ash@test", "password", "hash",
                "anonimizzato_il", null)));
        dati.put("ruoli_utenti", lista(riga("id", "55555555-5555-5555-5555-555555555555", "id_utente", UTENTE,
                "id_ruolo", RUOLO)));
        dati.put("espansioni", lista(riga("id", "base1", "nome", "Base", "serie", "Base", "data_uscita", "1999-01-09",
                "totale_carte", 102, "importata", true)));
        dati.put("oggetti", lista(riga("id", CARTA, "nome", "Pikachu", "prezzo", 1.5, "created_at", QUANDO,
                "id_esterno", "base1-58", "espansione_id", "base1", "numero", "58", "rarita", "Common")));
        dati.put("oggetti_pokedex", lista(riga("oggetto_id", CARTA, "numero_pokedex", 25)));
        dati.put("pokemon_importati", lista(riga("numero", 25, "importato_il", QUANDO)));
        dati.put("artisti_importati", lista(riga("slug", "mitsuhiro-arita", "importato_il", QUANDO)));
        dati.put("utenti_oggetti_preferiti", lista(riga("id", "66666666-6666-6666-6666-666666666666",
                "id_utente", UTENTE, "id_oggetto", CARTA, "created_at", QUANDO)));
        dati.put("binder", lista(riga("id", BINDER, "id_utente", UTENTE, "nome", "Base", "tasche", 9, "pagine", 2,
                "colore", "#2a75bb", "motivo", "NESSUNO", "id_carta_copertina", CARTA, "created_at", QUANDO,
                "mostra_mancanti", true)));
        dati.put("binder_slot", lista(riga("id", "77777777-7777-7777-7777-777777777777", "id_binder", BINDER,
                "pagina", 0, "posizione", 0, "id_oggetto", CARTA)));
        // bytea come lo scrive json_agg: testo esadecimale "\x..."
        dati.put("binder_immagini", lista(riga("id_binder", BINDER, "contenuto", "\\x0102ff",
                "content_type", "image/png")));
        dati.put("collezione", lista(riga("id", "88888888-8888-8888-8888-888888888888", "id_utente", UTENTE,
                "id_oggetto", CARTA, "variante", "NORMALE", "quantita", 2, "aggiornata_il", QUANDO)));
        dati.put("token_revocati", lista(riga("jti", "99999999-0000-0000-0000-000000000000", "scadenza", QUANDO)));
        return dati;
    }

    private static List<Map<String, Object>> lista(Map<String, Object> riga) {
        return new ArrayList<>(List.of(riga));
    }

    private static Map<String, Object> riga(Object... coppie) {
        Map<String, Object> riga = new HashMap<>();
        for (int i = 0; i < coppie.length; i += 2) {
            riga.put((String) coppie[i], coppie[i + 1]);
        }
        return riga;
    }
}
