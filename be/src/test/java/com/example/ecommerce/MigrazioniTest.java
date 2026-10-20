package com.example.ecommerce;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Profilo;
import com.example.ecommerce.entities.TokenRevocato;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.ProfiloRepository;
import com.example.ecommerce.repositories.UtenteRepository;
import com.example.ecommerce.repositories.TokenRevocatoRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
            Map.entry("collezione.id_oggetto", "CASCADE"),
            Map.entry("profili.id_utente", "CASCADE"),
            Map.entry("profili_avatar.id_utente", "CASCADE"),
            Map.entry("profili_squadra.id_utente", "CASCADE"),
            Map.entry("profili_vetrina.id_utente", "CASCADE"),
            Map.entry("profili_vetrina.id_oggetto", "CASCADE"),
            Map.entry("profili_binder.id_utente", "CASCADE"),
            Map.entry("profili_binder.id_binder", "CASCADE"));

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
        assertThat(versioniApplicate()).containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9", "10");
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

    // uscita da Sconosciuto: solo le carte '' che TCGdex non restituisce più tra quelle senza artista
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

    // coda delle carte fuori dai set importati in ordine casuale: le carte sempre in errore non bloccano le altre
    @Test
    void carteFuoriDaiSetImportatiInOrdineCasuale(@Autowired OggettoRepository oggettoRepository) {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('base1', 'Base', true)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('sv1', 'Scarlet', false)");
        inserisciCartaDelSet("Carta A", "base1-1", "base1", null, "");
        inserisciCartaDelSet("Carta B", "sv1-1", "sv1", null, "");
        inserisciCartaDelSet("Carta C", "sv1-2", "sv1", "", "");
        inserisciCartaConArtista("Carta D", "svp-1", null);
        inserisciCartaConArtista("Carta E", "svp-2", null);

        assertThat(oggettoRepository.findIdEsterniDaRiempireFuoriDaiSetImportati(10))
                .containsExactlyInAnyOrder("sv1-1", "svp-1", "svp-2");
        Set<String> prime = new HashSet<>();
        for (int i = 0; i < 40; i++) {
            prime.addAll(oggettoRepository.findIdEsterniDaRiempireFuoriDaiSetImportati(1));
        }
        assertThat(prime).hasSizeGreaterThan(1);
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

    // basta il solo artista da leggere perché il set torni in coda
    @Test
    void setConSoloArtistaMancante(@Autowired OggettoRepository oggettoRepository) {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('base1', 'Base', true)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('jungle', 'Jungle', true)");
        inserisciCartaDelSet("Carta A", "base1-1", "base1", "", "", null);
        inserisciCartaDelSet("Carta B", "jungle-1", "jungle", "", "", "");

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

    // V8: la variante di una tasca è facoltativa, e solo Normale o Reverse holo (il master set)
    @Test
    void varianteDelleTasche() {
        inserisciUtenteCartaEBinder();

        jdbc.update("INSERT INTO binder_slot (id, id_binder, pagina, posizione, id_oggetto, variante) VALUES (?, ?, 1, 0, ?, 'REVERSE_HOLO')",
                UUID.randomUUID(), binder, carta);
        assertViolazione(() -> jdbc.update("INSERT INTO binder_slot (id, id_binder, pagina, posizione, id_oggetto, variante) VALUES (?, ?, 1, 1, ?, 'PRIMA_EDIZIONE')",
                UUID.randomUUID(), binder, carta));
    }

    // V10: limiti e doppioni del profilo, controllati anche dal database
    @Test
    void vincoliDelProfilo() {
        inserisciUtenteCartaEBinder();
        jdbc.update("INSERT INTO profili (id_utente) VALUES (?)", utente);

        assertViolazione(() -> inserisciInSquadra(0, 0));
        assertViolazione(() -> inserisciInSquadra(0, 1026));
        assertViolazione(() -> inserisciInSquadra(6, 25));
        inserisciInSquadra(0, 25);
        assertViolazione(() -> inserisciInSquadra(1, 25));
        assertViolazione(() -> jdbc.update("INSERT INTO profili_vetrina (id_utente, posizione, id_oggetto) VALUES (?, 6, ?)", utente, carta));
        jdbc.update("INSERT INTO profili_vetrina (id_utente, posizione, id_oggetto) VALUES (?, 0, ?)", utente, carta);
        assertViolazione(() -> jdbc.update("INSERT INTO profili_vetrina (id_utente, posizione, id_oggetto) VALUES (?, 1, ?)", utente, carta));
        assertViolazione(() -> jdbc.update("INSERT INTO profili_binder (id_utente, posizione, id_binder) VALUES (?, 3, ?)", utente, binder));
        assertViolazione(() -> jdbc.update("UPDATE profili SET colore = '#2a75bb0' WHERE id_utente = ?", utente));
    }

    @Test
    void cancellareUnaCartaOUnBinderLiTogliDalProfilo() {
        inserisciUtenteCartaEBinder();
        jdbc.update("INSERT INTO profili (id_utente) VALUES (?)", utente);
        jdbc.update("INSERT INTO profili_vetrina (id_utente, posizione, id_oggetto) VALUES (?, 0, ?)", utente, carta);
        jdbc.update("INSERT INTO profili_binder (id_utente, posizione, id_binder) VALUES (?, 0, ?)", utente, binder);

        jdbc.update("DELETE FROM binder WHERE id = ?", binder);
        assertThat(contaRighe("profili_binder")).isZero();
        jdbc.update("DELETE FROM oggetti WHERE id = ?", carta);
        assertThat(contaRighe("profili_vetrina")).isZero();
    }

    // la lista si sostituisce con una nuova: Hibernate cancella e reinserisce le righe, lo scambio non urta UNIQUE
    @Test
    void scambiareDueCarteInVetrina(@Autowired ProfiloRepository profili, @Autowired OggettoRepository oggetti,
                                    @Autowired UtenteRepository utenti, @Autowired TestEntityManager em) {
        inserisciUtenteCartaEBinder();
        UUID altra = inserisciCarta("Raichu (Base 14/102)");
        Profilo profilo = new Profilo(utenti.findById(utente).orElseThrow());
        profilo.setVetrina(new ArrayList<>(List.of(oggetti.findById(carta).orElseThrow(), oggetti.findById(altra).orElseThrow())));
        profili.saveAndFlush(profilo);

        Profilo letto = profili.findById(utente).orElseThrow();
        letto.setVetrina(new ArrayList<>(List.of(letto.getVetrina().get(1), letto.getVetrina().get(0))));
        em.flush();
        em.clear();

        assertThat(profili.findById(utente).orElseThrow().getVetrina()).extracting(Oggetto::getId).containsExactly(altra, carta);
    }

    // carta cancellata dal catalogo: nella lista resta un null al suo posto, che ProfiloService deve saltare
    @Test
    void buchiNelleListeDiventanoNull(@Autowired ProfiloRepository profili, @Autowired OggettoRepository oggetti,
                                      @Autowired UtenteRepository utenti, @Autowired TestEntityManager em) {
        inserisciUtenteCartaEBinder();
        UUID seconda = inserisciCarta("Raichu (Base 14/102)");
        UUID terza = inserisciCarta("Pichu (Neo 12/75)");
        Profilo profilo = new Profilo(utenti.findById(utente).orElseThrow());
        profilo.setVetrina(new ArrayList<>(List.of(oggetti.findById(carta).orElseThrow(), oggetti.findById(seconda).orElseThrow(),
                oggetti.findById(terza).orElseThrow())));
        profili.saveAndFlush(profilo);
        em.clear();

        jdbc.update("DELETE FROM oggetti WHERE id = ?", seconda);

        List<Oggetto> vetrina = profili.findById(utente).orElseThrow().getVetrina();
        assertThat(vetrina).hasSize(3);
        assertThat(vetrina.get(1)).isNull();
    }

    private void inserisciInSquadra(int posizione, int numero) {
        jdbc.update("INSERT INTO profili_squadra (id_utente, posizione, numero) VALUES (?, ?, ?)", utente, posizione, numero);
    }

    private UUID inserisciCarta(String nome) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at) VALUES (?, ?, 1.00, now())", id, nome);
        return id;
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

    // artista già letto (''): le carte dei test sulle varianti e sulla rarità non tornano in coda per l'artista
    private void inserisciCartaDelSet(String nome, String idEsterno, String set, String varianti, String rarita) {
        inserisciCartaDelSet(nome, idEsterno, set, varianti, rarita, "");
    }

    private void inserisciCartaDelSet(String nome, String idEsterno, String set, String varianti, String rarita, String artista) {
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, id_esterno, espansione_id, varianti, rarita, artista) "
                + "VALUES (?, ?, 1.00, now(), ?, ?, ?, ?, ?)", UUID.randomUUID(), nome, idEsterno, set, varianti, rarita, artista);
    }

    // pagina al volo di Pokémon e artisti: le carte si ordinano per data del set fuori da una sessione
    // (open-in-view=false), quindi l'espansione deve arrivare già caricata
    @Test
    void carteDellaPaginaAlVoloConLEspansione(@Autowired OggettoRepository oggettoRepository) {
        jdbc.update("INSERT INTO espansioni (id, nome, importata, data_uscita) VALUES ('sv8', 'Surging Sparks', false, '2024-11-08')");
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, id_esterno, espansione_id) VALUES (?, 'Pikachu', 1.00, now(), 'sv8-57', 'sv8')",
                UUID.randomUUID());

        List<Oggetto> carte = oggettoRepository.findConEspansioneByIdEsternoIn(List.of("sv8-57"));

        assertThat(carte).hasSize(1);
        assertThat(Hibernate.isInitialized(carte.getFirst().getEspansione())).isTrue();
    }

    private void inserisciCartaConArtista(String nome, String idEsterno, String artista) {
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, id_esterno, artista) VALUES (?, ?, 1.00, now(), ?, ?)",
                UUID.randomUUID(), nome, idEsterno, artista);
    }

    private String artistaDi(String nome) {
        return jdbc.queryForObject("SELECT artista FROM oggetti WHERE nome = ?", String.class, nome);
    }
}
