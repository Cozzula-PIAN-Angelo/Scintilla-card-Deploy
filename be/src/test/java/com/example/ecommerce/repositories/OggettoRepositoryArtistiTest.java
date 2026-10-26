package com.example.ecommerce.repositories;

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

// righe leggere del muro degli illustratori e controllo della carta simbolo scelta dall'admin
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class OggettoRepositoryArtistiTest {

    private static final String IMMAGINE = "https://assets.tcgdex.net/en/base/base1/4/high.webp";

    @Autowired
    private DataSource dataSource;
    @Autowired
    private OggettoRepository oggettoRepository;

    private JdbcTemplate jdbc;

    @BeforeEach
    void prepara() {
        jdbc = new JdbcTemplate(dataSource);
        carta("base1-4", "Charizard", "Mitsuhiro Arita", IMMAGINE, 6);
        carta("base1-2", "Blastoise", "Ken Sugimori", IMMAGINE, 9);
        carta("base1-58", "Pikachu", "Mitsuhiro Arita", null, 25);
        carta("base1-91", "Bill", "", IMMAGINE);
        carta("base1-92", "Energy Removal", null, IMMAGINE);
    }

    // solo carte con artista e immagine; i numeri del Pokédex contati (0 per gli allenatori)
    @Test
    void carteConArtistaSoloConArtistaEImmagine() {
        List<CartaDiArtista> carte = oggettoRepository.findCarteConArtista();

        assertThat(carte).extracting(CartaDiArtista::getIdEsterno).containsExactlyInAnyOrder("base1-4", "base1-2");
        CartaDiArtista charizard = carte.stream().filter(c -> c.getIdEsterno().equals("base1-4")).findFirst().orElseThrow();
        assertThat(charizard.getNumeriPokedex()).isEqualTo(1);
        assertThat(charizard.getArtista()).isEqualTo("Mitsuhiro Arita");
    }

    @Test
    void carteDiUnSoloIllustratore() {
        assertThat(oggettoRepository.findCarteDiArtista(List.of("Mitsuhiro Arita")))
                .extracting(CartaDiArtista::getIdEsterno).containsExactly("base1-4");
    }

    // la carta simbolo: sua, in archivio e con l'immagine
    @Test
    void cartaSimboloSoloSuaEConImmagine() {
        List<String> arita = List.of("Mitsuhiro Arita");

        assertThat(oggettoRepository.existsByIdEsternoAndArtistaInAndImmagineUrlIsNotNull("base1-4", arita)).isTrue();
        assertThat(oggettoRepository.existsByIdEsternoAndArtistaInAndImmagineUrlIsNotNull("base1-2", arita)).isFalse();
        assertThat(oggettoRepository.existsByIdEsternoAndArtistaInAndImmagineUrlIsNotNull("base1-58", arita)).isFalse();
        assertThat(oggettoRepository.existsByIdEsternoAndArtistaInAndImmagineUrlIsNotNull("non-esiste", arita)).isFalse();
    }

    private void carta(String idEsterno, String nome, String artista, String immagine, int... pokedex) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO oggetti (id, nome, prezzo, created_at, id_esterno, artista, immagine_url) VALUES (?, ?, 1.00, now(), ?, ?, ?)",
                id, nome, idEsterno, artista, immagine);
        for (int numero : pokedex) {
            jdbc.update("INSERT INTO oggetti_pokedex (oggetto_id, numero_pokedex) VALUES (?, ?)", id, numero);
        }
    }
}
