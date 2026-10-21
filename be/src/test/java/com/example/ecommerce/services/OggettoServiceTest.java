package com.example.ecommerce.services;

import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// catalogo su un PostgreSQL vero: le ultime carte arrivate per l'hero della home
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class OggettoServiceTest {

    @Autowired
    private DataSource dataSource;
    @Autowired
    private OggettoRepository oggettoRepository;

    private JdbcTemplate jdbc;
    private OggettoService service;

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
        service = new OggettoService(oggettoRepository);
    }

    // le ultime importate possono essere tutte senza immagine (promo che TCGdex non ha): l'hero restava vuoto
    @Test
    void soloConImmagineSaltaLeCarteSenza() {
        carta("Pikachu", "https://assets.tcgdex.net/en/base/base1/58/high.webp", "2026-10-01T10:00:00Z");
        carta("Ditto (MEP Black Star Promos 106/0)", null, "2026-10-20T10:00:00Z");
        carta("Mew (MEP Black Star Promos 105/0)", null, "2026-10-20T11:00:00Z");

        var pagina = service.findAll(null, true, PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")));

        assertThat(pagina.content()).extracting(OggettoResponseDTO::nome).containsExactly("Pikachu");
    }

    @Test
    void senzaFiltroArrivanoTutte() {
        carta("Pikachu", "https://assets.tcgdex.net/en/base/base1/58/high.webp", "2026-10-01T10:00:00Z");
        carta("Ditto (MEP Black Star Promos 106/0)", null, "2026-10-20T10:00:00Z");

        var pagina = service.findAll(null, false, PageRequest.of(0, 20));

        assertThat(pagina.content()).hasSize(2);
    }

    private void carta(String nome, String immagine, String creata) {
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, immagine_url) VALUES (?, ?, 1.00, ?::timestamptz, ?)",
                UUID.randomUUID(), nome, creata, immagine);
    }
}
