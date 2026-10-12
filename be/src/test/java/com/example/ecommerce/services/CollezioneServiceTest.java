package com.example.ecommerce.services;

import com.example.ecommerce.entities.Variante;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.payloads.CopiaDTO;
import com.example.ecommerce.payloads.ModificaCollezioneDTO;
import com.example.ecommerce.repositories.CollezioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// scritture e letture della collezione su un PostgreSQL vero (le scritture sono SQL atomico con ON CONFLICT)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class CollezioneServiceTest {

    @Autowired
    private DataSource dataSource;
    @Autowired
    private CollezioneRepository collezioneRepository;
    @Autowired
    private OggettoRepository oggettoRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private JdbcTemplate jdbc;
    private CollezioneService service;

    private final UUID idUtente = UUID.randomUUID();
    private final UUID idAltro = UUID.randomUUID();
    private final UUID carta = UUID.randomUUID();
    private Utente utente;
    private Utente altro;

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
        service = new CollezioneService(collezioneRepository, oggettoRepository, jdbc);
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'mario', 'mario@esempio.it', 'hash')", idUtente);
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'luigi', 'luigi@esempio.it', 'hash')", idAltro);
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('base1', 'Base', true)");
        jdbc.update("INSERT INTO espansioni (id, nome, importata) VALUES ('jungle', 'Jungle', true)");
        inserisciCarta(carta, "Pikachu", "base1", 25);
        utente = new Utente();
        ReflectionTestUtils.setField(utente, "id", idUtente);
        altro = new Utente();
        ReflectionTestUtils.setField(altro, "id", idAltro);
    }

    @Test
    void piuCreaLaRiga() {
        assertThat(service.modifica(utente, delta(carta, 1))).isEqualTo(new CopiaDTO(carta, Variante.HOLO, 1));
        assertThat(righe()).isEqualTo(1);
    }

    @Test
    void duePiuDiFilaDannoDue() {
        service.modifica(utente, delta(carta, 1));
        assertThat(service.modifica(utente, delta(carta, 1)).quantita()).isEqualTo(2);
    }

    @Test
    void menoScendeEAZeroTogliLaRiga() {
        scrivi(carta, 2);
        assertThat(service.modifica(utente, delta(carta, -1)).quantita()).isEqualTo(1);
        assertThat(service.modifica(utente, delta(carta, -1)).quantita()).isEqualTo(0);
        assertThat(righe()).isZero();
    }

    @Test
    void menoAZeroNonFaNiente() {
        assertThat(service.modifica(utente, delta(carta, -1)).quantita()).isEqualTo(0);
        assertThat(righe()).isZero();
    }

    @Test
    void menoOltreLoZeroSiFermaAZero() {
        scrivi(carta, 2);
        assertThat(service.modifica(utente, delta(carta, -5)).quantita()).isEqualTo(0);
        assertThat(righe()).isZero();
    }

    @Test
    void oltre999RifiutatoSenzaModifiche() {
        scrivi(carta, 990);
        assertThatThrownBy(() -> service.modifica(utente, delta(carta, 10))).isInstanceOf(BadRequestException.class);
        assertThat(jdbc.queryForObject("SELECT quantita FROM collezione", Integer.class)).isEqualTo(990);
    }

    @Test
    void deltaZeroRifiutato() {
        assertThatThrownBy(() -> service.modifica(utente, delta(carta, 0))).isInstanceOf(BadRequestException.class);
    }

    @Test
    void cartaInesistente() {
        assertThatThrownBy(() -> service.modifica(utente, delta(UUID.randomUUID(), 1))).isInstanceOf(NotFoundException.class);
    }

    @Test
    void copieDelSetEDelPokemon() {
        UUID raichu = UUID.randomUUID();
        UUID giungla = UUID.randomUUID();
        inserisciCarta(raichu, "Raichu", "base1", 26);
        inserisciCarta(giungla, "Pikachu Giungla", "jungle", 25);
        scrivi(carta, 3);
        scrivi(raichu, 1);
        scrivi(giungla, 2);
        jdbc.update("INSERT INTO collezione (id, id_utente, id_oggetto, variante, quantita, aggiornata_il) VALUES (?, ?, ?, 'NORMALE', 4, now())",
                UUID.randomUUID(), idAltro, carta);

        assertThat(service.copie(utente, "base1", null)).containsExactlyInAnyOrder(
                new CopiaDTO(carta, Variante.HOLO, 3), new CopiaDTO(raichu, Variante.HOLO, 1));
        assertThat(service.copie(utente, null, 25)).containsExactlyInAnyOrder(
                new CopiaDTO(carta, Variante.HOLO, 3), new CopiaDTO(giungla, Variante.HOLO, 2));
        assertThat(service.copieDelleCarte(utente, List.of(raichu))).containsExactly(new CopiaDTO(raichu, Variante.HOLO, 1));
    }

    @Test
    void copieDelleCarteSoloQuelleRichieste() {
        UUID raichu = UUID.randomUUID();
        UUID giungla = UUID.randomUUID();
        inserisciCarta(raichu, "Raichu", "base1", 26);
        inserisciCarta(giungla, "Pikachu Giungla", "jungle", 25);
        scrivi(carta, 3);
        scrivi(raichu, 1);
        scrivi(giungla, 2);

        assertThat(service.copieDelleCarte(utente, List.of(carta, giungla))).containsExactlyInAnyOrder(
                new CopiaDTO(carta, Variante.HOLO, 3), new CopiaDTO(giungla, Variante.HOLO, 2));
    }

    @Test
    void filtroMancanteODoppio() {
        assertThatThrownBy(() -> service.copie(utente, null, null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.copie(utente, "base1", 25)).isInstanceOf(BadRequestException.class);
    }

    // due "−1" davvero contemporanei da quantità 2, ognuno in una transazione sua e committata:
    // nessuno deve andare in errore (prima il secondo portava la quantità a 0 violando il CHECK) e la riga sparisce.
    // Fuori dalla transazione di test: il @BeforeEach scrive già in autocommit, quindi alla fine si pulisce a mano
    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void dueMenoContemporaneiNonDannoErrore() throws Exception {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            for (int giro = 0; giro < 100; giro++) {
                jdbc.update("DELETE FROM collezione");
                scrivi(carta, 2);
                CyclicBarrier via = new CyclicBarrier(2);
                List<Future<CopiaDTO>> esiti = new ArrayList<>();
                for (int i = 0; i < 2; i++) {
                    esiti.add(pool.submit(() -> {
                        via.await(10, TimeUnit.SECONDS);
                        return tx.execute(st -> service.modifica(utente, delta(carta, -1)));
                    }));
                }
                for (Future<CopiaDTO> esito : esiti) {
                    // attese limitate: un blocco fa fallire il test invece di fermare la suite
                    esito.get(10, TimeUnit.SECONDS); // rilancia l'eventuale eccezione del thread
                }
                assertThat(righe()).isZero();
            }
        } finally {
            pool.shutdownNow();
            pool.awaitTermination(10, TimeUnit.SECONDS);
            jdbc.update("DELETE FROM collezione");
            jdbc.update("DELETE FROM oggetti_pokedex");
            jdbc.update("DELETE FROM oggetti");
            jdbc.update("DELETE FROM espansioni");
            jdbc.update("DELETE FROM utenti");
        }
    }

    private ModificaCollezioneDTO delta(UUID oggetto, int delta) {
        return new ModificaCollezioneDTO(oggetto, Variante.HOLO, delta);
    }

    private int righe() {
        return jdbc.queryForObject("SELECT count(*) FROM collezione", Integer.class);
    }

    private void scrivi(UUID oggetto, int quantita) {
        jdbc.update("INSERT INTO collezione (id, id_utente, id_oggetto, variante, quantita, aggiornata_il) VALUES (?, ?, ?, 'HOLO', ?, now())",
                UUID.randomUUID(), idUtente, oggetto, quantita);
    }

    private void inserisciCarta(UUID id, String nome, String set, int pokedex) {
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, espansione_id) VALUES (?, ?, 1.00, now(), ?)", id, nome, set);
        jdbc.update("INSERT INTO oggetti_pokedex (oggetto_id, numero_pokedex) VALUES (?, ?)", id, pokedex);
    }
}
