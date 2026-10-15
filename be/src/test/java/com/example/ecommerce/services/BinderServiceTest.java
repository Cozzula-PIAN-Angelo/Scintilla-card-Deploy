package com.example.ecommerce.services;

import com.example.ecommerce.entities.MotivoBinder;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.BinderDTO;
import com.example.ecommerce.payloads.BinderResponseDTO;
import com.example.ecommerce.payloads.CriterioOrdine;
import com.example.ecommerce.payloads.DisposizioneSlotDTO;
import com.example.ecommerce.payloads.InserisciCartaDTO;
import com.example.ecommerce.payloads.SlotBinderResponseDTO;
import com.example.ecommerce.payloads.SpostaCartaDTO;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.CollezioneRepository;
import com.example.ecommerce.repositories.ImmagineBinderRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.SlotBinderRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// tasche dei binder su un PostgreSQL vero: le riscritture devono rispettare il vincolo UNIQUE sulla posizione
@DataJpaTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class BinderServiceTest {

    @Autowired
    private DataSource dataSource;
    @Autowired
    private TestEntityManager em;
    @Autowired
    private BinderRepository binderRepository;
    @Autowired
    private SlotBinderRepository slotRepository;
    @Autowired
    private ImmagineBinderRepository immagineRepository;
    @Autowired
    private OggettoRepository oggettoRepository;
    @Autowired
    private CollezioneRepository collezioneRepository;

    private JdbcTemplate jdbc;
    private BinderService service;
    private Utente utente;
    private Utente altro;
    private UUID binder;

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
        CollezioneService collezione = new CollezioneService(collezioneRepository, oggettoRepository, jdbc, ElencoArtisti.get());
        service = new BinderService(binderRepository, slotRepository, immagineRepository, oggettoRepository, collezione, ElencoArtisti.get());
        UUID idUtente = UUID.randomUUID();
        UUID idAltro = UUID.randomUUID();
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'mario', 'mario@esempio.it', 'hash')", idUtente);
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'luigi', 'luigi@esempio.it', 'hash')", idAltro);
        jdbc.update("INSERT INTO espansioni (id, nome, importata, data_uscita) VALUES ('base1', 'Base', true, '1999-01-09')");
        utente = em.find(Utente.class, idUtente);
        altro = em.find(Utente.class, idAltro);
        binder = service.crea(utente, dati(9, 2, null)).id();
    }

    @Test
    void riordinaPerNumeroCompattaDallaPrimaTasca() {
        UUID dieci = carta("Raichu", "base1", "10");
        UUID due = carta("Blastoise", "base1", "2");
        UUID cinque = carta("Pikachu", "base1", "5");
        metti(0, 3, dieci);
        metti(0, 7, due);
        metti(1, 3, cinque);

        List<SlotBinderResponseDTO> slot = service.riordina(utente, binder, CriterioOrdine.SET_NUMERO);

        assertThat(slot).extracting(s -> s.pagina() * 9 + s.posizione()).containsExactly(0, 1, 2);
        assertThat(slot).extracting(s -> s.oggetto().id()).containsExactly(due, cinque, dieci);
    }

    @Test
    void riordinoPerPokedexConQueryCheNonCresconoConLeCarte() {
        assertThat(queryDelRiordino(30)).isEqualTo(queryDelRiordino(3));
    }

    @Test
    void copieDellaStessaCartaRestano() {
        UUID uno = carta("Bulbasaur", "base1", "1");
        UUID due = carta("Ivysaur", "base1", "2");
        metti(0, 5, due);
        metti(0, 6, uno);
        metti(1, 0, due);

        List<SlotBinderResponseDTO> slot = service.riordina(utente, binder, CriterioOrdine.SET_NUMERO);

        assertThat(slot).extracting(s -> s.oggetto().id()).containsExactly(uno, due, due);
    }

    @Test
    void riordinaBinderVuoto() {
        assertThat(service.riordina(utente, binder, CriterioOrdine.NOME)).isEmpty();
    }

    @Test
    void ripristinoSostituisceTutto() {
        UUID a = carta("Abra", "base1", "43");
        UUID b = carta("Kadabra", "base1", "32");
        metti(0, 0, a);
        metti(0, 1, b);

        List<SlotBinderResponseDTO> slot = service.ripristina(utente, binder, List.of(
                new DisposizioneSlotDTO(0, 1, a),
                new DisposizioneSlotDTO(1, 4, b)));

        assertThat(slot).extracting(SlotBinderResponseDTO::pagina, SlotBinderResponseDTO::posizione)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(0, 1), org.assertj.core.groups.Tuple.tuple(1, 4));
        assertThat(service.getDettaglio(utente, binder).slot()).hasSize(2);
    }

    @Test
    void ripristinoTascaDoppia400() {
        UUID a = carta("Abra", "base1", "43");
        assertThatThrownBy(() -> service.ripristina(utente, binder, List.of(
                new DisposizioneSlotDTO(0, 1, a),
                new DisposizioneSlotDTO(0, 1, a))))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Due carte nella stessa tasca");
    }

    @Test
    void ripristinoFuoriBinder400() {
        UUID a = carta("Abra", "base1", "43");
        assertThatThrownBy(() -> service.ripristina(utente, binder, List.of(new DisposizioneSlotDTO(2, 0, a))))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void ripristinoCampiMancanti400() {
        // la validazione dei singoli elementi della lista nel controller non è garantita: il service si difende
        UUID a = carta("Abra", "base1", "43");
        assertThatThrownBy(() -> service.ripristina(utente, binder, java.util.Arrays.asList(new DisposizioneSlotDTO(null, 0, a))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.ripristina(utente, binder, java.util.Arrays.asList(new DisposizioneSlotDTO(0, 0, null))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.ripristina(utente, binder, java.util.Arrays.asList(new DisposizioneSlotDTO(0, -1, a))))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void ripristinoCartaInesistente404() {
        assertThatThrownBy(() -> service.ripristina(utente, binder, List.of(new DisposizioneSlotDTO(0, 0, UUID.randomUUID()))))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void binderDiAltroUtente404() {
        assertThatThrownBy(() -> service.riordina(altro, binder, CriterioOrdine.NOME)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.ripristina(altro, binder, List.of())).isInstanceOf(NotFoundException.class);
    }

    @Test
    void inserisciConSpazioScala() {
        UUID a = carta("A", "base1", "1");
        UUID b = carta("B", "base1", "2");
        UUID x = carta("X", "base1", "3");
        metti(0, 0, a);
        metti(0, 1, b);

        service.inserisci(utente, binder, new InserisciCartaDTO(0, 0, x, true));

        assertThat(disposizione()).containsExactly("0:" + x, "1:" + a, "2:" + b);
    }

    @Test
    void inserisciConSpazioPieno409SenzaModifiche() {
        UUID a = carta("A", "base1", "1");
        UUID x = carta("X", "base1", "2");
        for (int i = 0; i < 18; i++) {
            metti(i / 9, i % 9, a);
        }

        assertThatThrownBy(() -> service.inserisci(utente, binder, new InserisciCartaDTO(1, 0, x, true)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Binder pieno: non c'è una tasca libera dopo questa");
        assertThat(disposizione()).hasSize(18).allMatch(s -> s.endsWith(a.toString()));
    }

    @Test
    void svuotaConSpazioRichiude() {
        UUID a = carta("A", "base1", "1");
        UUID b = carta("B", "base1", "2");
        UUID c = carta("C", "base1", "3");
        metti(0, 0, a);
        metti(0, 1, b);
        metti(0, 2, c);

        service.svuota(utente, binder, 0, 0, true);

        assertThat(disposizione()).containsExactly("0:" + b, "1:" + c);
    }

    @Test
    void spostaConSpazioMettePrimaDellArrivo() {
        UUID a = carta("A", "base1", "1");
        UUID b = carta("B", "base1", "2");
        UUID c = carta("C", "base1", "3");
        UUID d = carta("D", "base1", "4");
        metti(0, 0, a);
        metti(0, 1, b);
        metti(0, 2, c);
        metti(0, 3, d);

        service.sposta(utente, binder, new SpostaCartaDTO(0, 0, 0, 2, true));

        assertThat(disposizione()).containsExactly("0:" + b, "1:" + a, "2:" + c, "3:" + d);
    }

    @Test
    void senzaSpazioComeOggi() {
        UUID a = carta("A", "base1", "1");
        UUID b = carta("B", "base1", "2");
        UUID x = carta("X", "base1", "3");
        metti(0, 0, a);
        metti(0, 1, b);

        service.inserisci(utente, binder, new InserisciCartaDTO(0, 0, x, null));
        service.sposta(utente, binder, new SpostaCartaDTO(0, 0, 0, 1, false));

        assertThat(disposizione()).containsExactly("0:" + b, "1:" + x);
    }

    @Test
    void checklistPagineCalcolate() {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('base2', 'Jungle', true)");
        List<UUID> carte = new java.util.ArrayList<>();
        for (int n = 19; n >= 1; n--) {
            carte.addFirst(carta("Carta", "base2", String.valueOf(n)));
        }

        BinderResponseDTO creato = service.crea(utente, dati(9, 2, "base2"));

        assertThat(creato.pagine()).isEqualTo(3);
        assertThat(creato.carteInserite()).isEqualTo(19);
        assertThat(service.getDettaglio(utente, creato.id()).slot())
                .extracting(s -> s.pagina() * 9 + s.posizione(), s -> s.oggetto().id())
                .containsExactlyElementsOf(java.util.stream.IntStream.range(0, 19)
                        .mapToObj(i -> org.assertj.core.groups.Tuple.tuple(i, carte.get(i))).toList());
    }

    @Test
    void checklistMinimoDuePagine() {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('base2', 'Jungle', true)");
        for (int n = 1; n <= 3; n++) {
            carta("Carta", "base2", String.valueOf(n));
        }

        assertThat(service.crea(utente, dati(9, 10, "base2")).pagine()).isEqualTo(2);
    }

    @Test
    void checklistSetVuoto400() {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('vuoto', 'Vuoto', false)");

        assertThatThrownBy(() -> service.crea(utente, dati(9, 2, "vuoto")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Il set non ha ancora carte nel catalogo");
        assertThat(service.getBinder(utente)).hasSize(1);
    }

    @Test
    void checklistTroppoGrande() {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('enorme', 'Enorme', true)");
        jdbc.batchUpdate("INSERT INTO oggetti (id, nome, prezzo, created_at, espansione_id, numero) VALUES (?, ?, 1.00, now(), 'enorme', ?)",
                java.util.stream.IntStream.rangeClosed(1, 1801)
                        .mapToObj(n -> new Object[]{UUID.randomUUID(), "Enorme " + n, String.valueOf(n)}).toList());

        assertThatThrownBy(() -> service.crea(utente, dati(12, 2, "enorme")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Il set non ci sta: scegli più tasche");
        assertThat(service.getBinder(utente)).hasSize(1);
    }

    @Test
    void checklistPokemonDalSetPiuVecchio() {
        jdbc.update("INSERT INTO espansioni (id, nome, importata, data_uscita) VALUES ('sv1', 'Scarlatto', true, '2023-03-31')");
        UUID nuova = carta("Pikachu ex", "sv1", "1");
        UUID coppia = carta("Pikachu & Zekrom", "base1", "33");
        UUID vecchia = carta("Pikachu", "base1", "58");
        UUID altro = carta("Raichu", "base1", "14");
        pokedex(nuova, 25);
        pokedex(coppia, 25);
        pokedex(coppia, 644);
        pokedex(vecchia, 25);
        pokedex(altro, 26);

        BinderResponseDTO creato = service.crea(utente, checklistPokemon(25));

        assertThat(creato.pagine()).isEqualTo(2);
        assertThat(service.getDettaglio(utente, creato.id()).slot()).extracting(s -> s.oggetto().id())
                .containsExactly(coppia, vecchia, nuova);
    }

    @Test
    void checklistPokemonSenzaCarte400() {
        assertThatThrownBy(() -> service.crea(utente, checklistPokemon(151)))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Il Pokémon non ha ancora carte nel catalogo");
    }

    @Test
    void checklistSetEPokemonInsieme400() {
        UUID carta = carta("Pikachu", "base1", "58");
        pokedex(carta, 25);
        BinderDTO entrambi = new BinderDTO("Prova", 9, 2, "#336699", MotivoBinder.STELLE, null, true, "base1", 25, null);

        assertThatThrownBy(() -> service.crea(utente, entrambi)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void checklistOltreSessantaPagine() {
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('grande', 'Grande', true)");
        jdbc.batchUpdate("INSERT INTO oggetti (id, nome, prezzo, created_at, espansione_id, numero) VALUES (?, ?, 1.00, now(), 'grande', ?)",
                java.util.stream.IntStream.rangeClosed(1, 727)
                        .mapToObj(n -> new Object[]{UUID.randomUUID(), "Grande " + n, String.valueOf(n)}).toList());

        assertThat(service.crea(utente, dati(12, 2, "grande")).pagine()).isEqualTo(61);
    }

    @Test
    void checklistArtistaConCoautoriDalSetPiuVecchio() {
        jdbc.update("INSERT INTO espansioni (id, nome, importata, data_uscita) VALUES ('pop5', 'POP 5', true, '2007-03-01')");
        UUID insieme = carta("Pikachu", "pop5", "2");
        UUID direzione = carta("Mewtwo", "base1", "10");
        UUID altro = carta("Charizard", "base1", "4");
        artista(insieme, "Shinji Higuchi + Sachiko Eba");
        artista(direzione, "Kent Kanetsuna/Direc. Shinji Higuchi");
        artista(altro, "Mitsuhiro Arita");

        BinderResponseDTO creato = service.crea(utente, checklistArtista("shinji-higuchi"));

        assertThat(service.getDettaglio(utente, creato.id()).slot()).extracting(s -> s.oggetto().id())
                .containsExactly(direzione, insieme);
    }

    @Test
    void checklistArtistaFuoriElenco404() {
        assertThatThrownBy(() -> service.crea(utente, checklistArtista("nessuno")))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void checklistArtistaSenzaCarte400() {
        assertThatThrownBy(() -> service.crea(utente, checklistArtista("sachiko-eba")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("L'artista non ha ancora carte nel catalogo");
    }

    @Test
    void checklistArtistaEPokemonInsieme400() {
        BinderDTO entrambi = new BinderDTO("Prova", 9, 2, "#336699", MotivoBinder.STELLE, null, true, null, 25, "shinji-higuchi");

        assertThatThrownBy(() -> service.crea(utente, entrambi))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Un binder checklist è di un set, di un Pokémon o di un artista, non di più");
    }

    @Test
    void modificaIgnoraEspansione() {
        carta("Carta", "base1", "1");

        service.modifica(utente, binder, dati(9, 2, "base1"));

        assertThat(service.getDettaglio(utente, binder).slot()).isEmpty();
    }

    // tasche come "indice:idCarta", in ordine
    private List<String> disposizione() {
        return service.getDettaglio(utente, binder).slot().stream()
                .map(s -> (s.pagina() * 9 + s.posizione()) + ":" + s.oggetto().id())
                .toList();
    }

    // query mandate al DB da un riordino per Pokédex di un binder con n carte sparse, a contesto vuoto come in una richiesta vera
    private long queryDelRiordino(int n) {
        UUID id = service.crea(utente, dati(9, 8, null)).id();
        for (int i = 0; i < n; i++) {
            UUID c = carta("Carta", "base1", String.valueOf(n - i));
            pokedex(c, n - i);
            service.inserisci(utente, id, new InserisciCartaDTO(i * 2 / 9, i * 2 % 9, c, null));
        }
        em.flush();
        em.clear();
        Statistics statistiche = em.getEntityManager().getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistiche.clear();
        service.riordina(utente, id, CriterioOrdine.POKEDEX);
        em.flush();
        return statistiche.getPrepareStatementCount();
    }

    private void metti(int pagina, int posizione, UUID carta) {
        service.inserisci(utente, binder, new InserisciCartaDTO(pagina, posizione, carta, null));
    }

    private UUID carta(String nome, String set, String numero) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, espansione_id, numero) VALUES (?, ?, 1.00, now(), ?, ?)",
                id, nome + " " + id, set, numero);
        return id;
    }

    private void artista(UUID carta, String artista) {
        jdbc.update("UPDATE oggetti SET artista = ? WHERE id = ?", artista, carta);
    }

    private void pokedex(UUID carta, int numero) {
        jdbc.update("INSERT INTO oggetti_pokedex (oggetto_id, numero_pokedex) VALUES (?, ?)", carta, numero);
    }

    private static BinderDTO dati(int tasche, int pagine, String espansioneId) {
        return new BinderDTO("Prova", tasche, pagine, "#336699", MotivoBinder.STELLE, null, true, espansioneId, null, null);
    }

    private static BinderDTO checklistPokemon(int numero) {
        return new BinderDTO("Pikachu", 9, 2, "#336699", MotivoBinder.STELLE, null, true, null, numero, null);
    }

    private static BinderDTO checklistArtista(String slug) {
        return new BinderDTO("Higuchi", 9, 2, "#336699", MotivoBinder.STELLE, null, true, null, null, slug);
    }
}
