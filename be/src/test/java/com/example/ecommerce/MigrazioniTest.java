package com.example.ecommerce;

import com.example.ecommerce.entities.TokenRevocato;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.TokenRevocatoRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Migrazioni Flyway su un PostgreSQL vero (embedded-postgres, senza Docker). Il contesto parte solo se
// Flyway applica le migrazioni e Hibernate, in validate, trova lo schema identico alle entity.
// Qui vivono anche i controlli che prima faceva VerificaVincoli all'avvio, solo con un warn nel log
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class MigrazioniTest {

    // "tabella.colonna" -> regola ON DELETE attesa, come nelle annotazioni @OnDelete delle entity
    private static final Map<String, String> ATTESE = Map.ofEntries(
            Map.entry("ruoli_utenti.id_utente", "CASCADE"),
            Map.entry("ruoli_utenti.id_ruolo", "CASCADE"),
            Map.entry("utenti_oggetti_preferiti.id_utente", "CASCADE"),
            Map.entry("utenti_oggetti_preferiti.id_oggetto", "CASCADE"),
            Map.entry("binder.id_utente", "CASCADE"),
            Map.entry("binder.id_carta_copertina", "SET NULL"),
            Map.entry("binder_immagini.id_binder", "CASCADE"),
            Map.entry("binder_slot.id_binder", "CASCADE"),
            Map.entry("binder_slot.id_oggetto", "CASCADE"),
            Map.entry("collezione.id_utente", "CASCADE"),
            Map.entry("collezione.id_oggetto", "CASCADE"));

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
        assertThat(versioniApplicate()).containsExactly("1", "2", "3", "4", "5", "6", "7");
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

    // doppio logout con lo stesso token: la seconda revoca non fa nulla e non va in errore
    @Test
    void revocareDueVolteLoStessoJti() {
        UUID jti = UUID.randomUUID();
        Instant scadenza = Instant.now().plusSeconds(3600);

        assertThat(tokenRevocatoRepository.revocaSeAssente(jti, scadenza)).isEqualTo(1);
        assertThat(tokenRevocatoRepository.revocaSeAssente(jti, scadenza)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM token_revocati WHERE jti = ?", Long.class, jti)).isEqualTo(1);
    }

    // foreign key usate da letture e cancellazioni frequenti: senza indice scorrerebbero tutta la tabella
    // delle carte. La ricerca per numero di Pokédex usa già la chiave primaria di oggetti_pokedex
    @Test
    void indiciPerPokedexESet() {
        assertThat(indici("oggetti")).contains("ix_oggetti_espansione_id");
        assertThat(indici("oggetti_pokedex")).contains("ix_oggetti_pokedex_oggetto_id", "pk_oggetti_pokedex");
    }

    // pagina di un artista: le carte si cercano per grafia esatta del campo artista
    @Test
    void indicePerArtista() {
        assertThat(indici("oggetti")).contains("ix_oggetti_artista");
    }

    // le carte di un artista si trovano con la grafia grezza; quelle senza artista hanno ''
    @Test
    void carteDiUnArtistaPerGrafia(@Autowired OggettoRepository oggettoRepository) {
        inserisciCartaConArtista("Carta in coppia", "a-1", "Shinji Higuchi + Sachiko Eba");
        inserisciCartaConArtista("Carta di Arita", "a-2", "Mitsuhiro Arita");
        inserisciCartaConArtista("Carta senza artista", "a-3", "");

        assertThat(oggettoRepository.findByArtistaIn(List.of("Shinji Higuchi + Sachiko Eba")))
                .extracting(Oggetto::getNome).containsExactly("Carta in coppia");
        assertThat(oggettoRepository.findSenzaArtista()).extracting(Oggetto::getNome).containsExactly("Carta senza artista");
    }

    // uscita da Sconosciuto: solo le carte '' che pokemontcg.io non restituisce più tra quelle senza artista
    @Test
    void liberaSenzaArtistaToccaSoloQuelleNonPiuSenza(@Autowired OggettoRepository oggettoRepository) {
        inserisciCartaConArtista("Ancora senza", "a-1", "");
        inserisciCartaConArtista("Ora con artista", "a-2", "");
        inserisciCartaConArtista("Creata a mano", null, "");
        inserisciCartaConArtista("Di Arita", "a-4", "Mitsuhiro Arita");

        assertThat(oggettoRepository.liberaSenzaArtista(List.of("a-1"))).isEqualTo(1);

        assertThat(artistaDi("Ancora senza")).isEmpty();
        assertThat(artistaDi("Ora con artista")).isNull();
        assertThat(artistaDi("Creata a mano")).isEmpty();
        assertThat(artistaDi("Di Arita")).isEqualTo("Mitsuhiro Arita");
    }

    // la ricerca delle righe di una carta (cancellazione dal catalogo) non scorre tutta la collezione
    @Test
    void indiceCollezione() {
        assertThat(indici("collezione")).contains("ix_collezione_id_oggetto");
    }

    // coda del job delle varianti: solo i set importati con almeno una carta da leggere
    @Test
    void setConVariantiMancanti(@Autowired OggettoRepository oggettoRepository) {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('base1', 'Base', true)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('jungle', 'Jungle', true)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('sv1', 'Scarlet', false)");
        inserisciCartaDelSet("Carta A", "base1-1", "base1", null, "");
        inserisciCartaDelSet("Carta B", "jungle-1", "jungle", "", "");
        inserisciCartaDelSet("Carta C", "sv1-1", "sv1", null, "");

        assertThat(oggettoRepository.findSetConVariantiMancanti(5)).containsExactly("base1");
    }

    // basta la sola rarità da leggere perché il set torni in coda
    @Test
    void setConSolaRaritaMancante(@Autowired OggettoRepository oggettoRepository) {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('base1', 'Base', true)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('jungle', 'Jungle', true)");
        inserisciCartaDelSet("Carta A", "base1-1", "base1", "", null);
        inserisciCartaDelSet("Carta B", "jungle-1", "jungle", "", "Rare");

        assertThat(oggettoRepository.findSetConVariantiMancanti(5)).containsExactly("base1");
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
        assertThat(contaRighe("collezione")).isZero();
        assertThat(jdbc.queryForObject("SELECT id_carta_copertina FROM binder WHERE id = ?", UUID.class, binder)).isNull();
    }

    @Test
    void cancellareUnBinderTogliTascheEImmagine() {
        inserisciUtenteCartaEBinder();

        jdbc.update("DELETE FROM binder WHERE id = ?", binder);

        assertThat(contaRighe("binder_slot")).isZero();
        assertThat(contaRighe("binder_immagini")).isZero();
    }

    @Test
    void cancellareUnUtenteTogliLaCollezione() {
        inserisciUtenteCartaEBinder();

        jdbc.update("DELETE FROM utenti WHERE id = ?", utente);

        assertThat(contaRighe("collezione")).isZero();
    }

    @Test
    void vincoliDellaCollezione() {
        inserisciUtenteCartaEBinder();

        assertViolazione(() -> inserisciInCollezione("NORMALE", 0));
        assertViolazione(() -> inserisciInCollezione("NORMALE", 1000));
        assertViolazione(() -> inserisciInCollezione("SHADOWLESS", 1));
        // tolte dalla V6
        assertViolazione(() -> inserisciInCollezione("HOLO", 1));
        assertViolazione(() -> inserisciInCollezione("PRIMA_EDIZIONE_HOLO", 1));
        // la terna (utente, carta, variante) esiste già: REVERSE_HOLO è nella riga inserita dal setup
        assertViolazione(() -> inserisciInCollezione("REVERSE_HOLO", 1));
    }

    // dopo un errore PostgreSQL annulla la transazione del test: un savepoint la tiene viva per il controllo successivo
    private void assertViolazione(Runnable inserimento) {
        jdbc.execute("SAVEPOINT prima");
        assertThatThrownBy(inserimento::run).isInstanceOf(DataIntegrityViolationException.class);
        jdbc.execute("ROLLBACK TO SAVEPOINT prima");
    }

    // i binder creati prima della V4 non indicano la colonna: devono continuare a mostrare le mancanti
    @Test
    void binderEsistentiMostranoLeMancanti() {
        inserisciUtenteCartaEBinder();

        assertThat(jdbc.queryForObject("SELECT mostra_mancanti FROM binder WHERE id = ?", Boolean.class, binder)).isTrue();
    }

    private void inserisciInCollezione(String variante, int quantita) {
        jdbc.update("INSERT INTO collezione (id, id_utente, id_oggetto, variante, quantita, aggiornata_il) VALUES (?, ?, ?, ?, ?, now())",
                UUID.randomUUID(), utente, carta, variante, quantita);
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
        inserisciInCollezione("REVERSE_HOLO", 2);
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

    private List<String> indici(String tabella) {
        return jdbc.queryForList("SELECT indexname FROM pg_indexes WHERE tablename = ?", String.class, tabella);
    }

    private int contaRighe(String tabella) {
        return jdbc.queryForObject("SELECT count(*) FROM " + tabella, Integer.class);
    }

    private void inserisciCartaDelSet(String nome, String idEsterno, String set, String varianti, String rarita) {
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, id_esterno, espansione_id, varianti, rarita) "
                + "VALUES (?, ?, 1.00, now(), ?, ?, ?, ?)", UUID.randomUUID(), nome, idEsterno, set, varianti, rarita);
    }

    private void inserisciCartaConArtista(String nome, String idEsterno, String artista) {
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, id_esterno, artista) VALUES (?, ?, 1.00, now(), ?, ?)",
                UUID.randomUUID(), nome, idEsterno, artista);
    }

    private String artistaDi(String nome) {
        return jdbc.queryForObject("SELECT artista FROM oggetti WHERE nome = ?", String.class, nome);
    }
}
