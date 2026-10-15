package com.example.ecommerce.services;

import com.example.ecommerce.entities.MotivoBinder;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.BinderDTO;
import com.example.ecommerce.payloads.CriterioOrdine;
import com.example.ecommerce.payloads.DisposizioneSlotDTO;
import com.example.ecommerce.payloads.InserisciCartaDTO;
import com.example.ecommerce.payloads.SlotBinderResponseDTO;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.CollezioneRepository;
import com.example.ecommerce.repositories.ImmagineBinderRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.SlotBinderRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
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
@DataJpaTest
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
        service = new BinderService(binderRepository, slotRepository, immagineRepository, oggettoRepository, collezione);
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
    void ripristinoCartaInesistente404() {
        assertThatThrownBy(() -> service.ripristina(utente, binder, List.of(new DisposizioneSlotDTO(0, 0, UUID.randomUUID()))))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void binderDiAltroUtente404() {
        assertThatThrownBy(() -> service.riordina(altro, binder, CriterioOrdine.NOME)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.ripristina(altro, binder, List.of())).isInstanceOf(NotFoundException.class);
    }

    private void metti(int pagina, int posizione, UUID carta) {
        service.inserisci(utente, binder, new InserisciCartaDTO(pagina, posizione, carta));
    }

    private UUID carta(String nome, String set, String numero) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, espansione_id, numero) VALUES (?, ?, 1.00, now(), ?, ?)",
                id, nome + " " + id, set, numero);
        return id;
    }

    private static BinderDTO dati(int tasche, int pagine, String espansioneId) {
        return new BinderDTO("Prova", tasche, pagine, "#336699", MotivoBinder.STELLE, null, true);
    }
}
