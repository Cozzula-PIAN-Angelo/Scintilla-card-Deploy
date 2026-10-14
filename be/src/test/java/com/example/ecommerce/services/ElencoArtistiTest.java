package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.payloads.ArtistaCartaDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// ElencoArtisti.get() legge src/test/resources/artisti.json, che nei test fa ombra a quello vero
class ElencoArtistiTest {

    private final ElencoArtisti elenco = ElencoArtisti.get();

    // artista non ancora letto da pokemontcg.io: nel dettaglio della carta la riga non compare
    @Test
    void artistiDiNullEVuoto() {
        assertThat(elenco.artistiDi(null)).isEmpty();
    }

    @Test
    void artistiDiVuotoESconosciuto() {
        assertThat(elenco.artistiDi("")).containsExactly(new ArtistaCartaDTO("Artista sconosciuto", "sconosciuto"));
    }

    @Test
    void artistiDiGrafiaSingola() {
        assertThat(elenco.artistiDi("Mitsuhiro Arita")).containsExactly(new ArtistaCartaDTO("Mitsuhiro Arita", "mitsuhiro-arita"));
    }

    @Test
    void coautoriNellOrdineDellaGrafia() {
        assertThat(elenco.artistiDi("Shinji Higuchi + Sachiko Eba")).containsExactly(
                new ArtistaCartaDTO("Shinji Higuchi", "shinji-higuchi"),
                new ArtistaCartaDTO("Sachiko Eba", "sachiko-eba"));
    }

    // artista uscito dopo la generazione del JSON: il nome si mostra, senza link
    @Test
    void grafiaSconosciutaSenzaLink() {
        assertThat(elenco.artistiDi("Nuovo  Artista\n")).containsExactly(new ArtistaCartaDTO("Nuovo Artista", null));
    }

    @Test
    void perSlug() {
        assertThat(elenco.perSlug("sachiko-eba")).map(ElencoArtisti.Artista::nome).contains("Sachiko Eba");
        assertThat(elenco.perSlug("Sachiko-Eba")).isEmpty();
        // la pagina delle carte senza artista non è un artista dell'elenco
        assertThat(elenco.perSlug("sconosciuto")).isEmpty();
    }

    @Test
    void elencoInOrdineAlfabetico() {
        assertThat(elenco.elenco()).extracting(ElencoArtisti.Artista::nome)
                .containsExactly("Mitsuhiro Arita", "Sachiko Eba", "Shinji Higuchi");
        assertThat(elenco.sconosciuti()).isEqualTo(12);
    }

    // il dettaglio della carta riceve gli autori già divisi, con lo slug per il link
    @Test
    void ilDtoDellaCartaPortaGliArtisti() {
        Oggetto carta = new Oggetto("Carta in coppia", new BigDecimal("1.00"));
        carta.setArtista("Shinji Higuchi + Sachiko Eba");

        assertThat(OggettoResponseDTO.from(carta).artisti()).extracting(ArtistaCartaDTO::slug)
                .containsExactly("shinji-higuchi", "sachiko-eba");
    }

    @Test
    void fileNonValidoFermaIlCaricamento() {
        assertThatThrownBy(() -> ElencoArtisti.da(new ByteArrayInputStream("{".getBytes(StandardCharsets.UTF_8))))
                .isInstanceOf(IllegalStateException.class);
    }
}
