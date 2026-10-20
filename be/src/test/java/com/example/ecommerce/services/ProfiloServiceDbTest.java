package com.example.ecommerce.services;

import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.repositories.AvatarProfiloRepository;
import com.example.ecommerce.repositories.BinderRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.ProfiloRepository;
import com.example.ecommerce.repositories.SlotBinderRepository;
import com.example.ecommerce.repositories.UtenteRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// ProfiloService su un PostgreSQL vero: l'utente arriva dal JWTFilter, letto in un'altra transazione,
// quindi è staccato dalla sessione di Hibernate. Il primo salvataggio del profilo deve funzionare lo stesso
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class ProfiloServiceDbTest {

    @Autowired
    private DataSource dataSource;
    @Autowired
    private ProfiloRepository profiloRepository;
    @Autowired
    private OggettoRepository oggettoRepository;
    @Autowired
    private BinderRepository binderRepository;
    @Autowired
    private SlotBinderRepository slotRepository;
    @Autowired
    private AvatarProfiloRepository avatarRepository;
    @Autowired
    private UtenteRepository utenteRepository;

    private JdbcTemplate jdbc;
    private ProfiloService service;
    private Utente staccato;
    private final UUID id = UUID.randomUUID();

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
        service = new ProfiloService(profiloRepository, oggettoRepository, binderRepository, slotRepository,
                new StatisticheService(jdbc, oggettoRepository), avatarRepository, utenteRepository);
        jdbc.update("INSERT INTO utenti (id, username, email, password) VALUES (?, 'mario', 'mario@esempio.it', 'hash')", id);
        // come il principal del JWTFilter: stessa riga, ma non gestito da questa sessione
        staccato = new Utente("mario", "mario@esempio.it", "hash");
        ReflectionTestUtils.setField(staccato, "id", id);
    }

    @Test
    void primoSalvataggioConUtenteStaccato() {
        service.salvaSquadra(staccato, List.of(25, 6));

        profiloRepository.flush();
        assertThat(jdbc.queryForList("SELECT numero FROM profili_squadra WHERE id_utente = ? ORDER BY posizione", Integer.class, id))
                .containsExactly(25, 6);
    }

    @Test
    void primoAvatarConUtenteStaccato() {
        byte[] webp = new byte[32];
        System.arraycopy(new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'}, 0, webp, 0, 12);

        service.salvaAvatar(staccato, webp);

        avatarRepository.flush();
        assertThat(jdbc.queryForObject("SELECT content_type FROM profili_avatar WHERE id_utente = ?", String.class, id))
                .isEqualTo("image/webp");
    }
}
