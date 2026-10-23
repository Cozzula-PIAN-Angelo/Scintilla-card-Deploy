package com.example.ecommerce.payloads;

import com.example.ecommerce.entities.Oggetto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class OggettoResponseDTOTest {

    @Test
    void immaginePiccolaDiTcgdex() {
        assertThat(OggettoResponseDTO.immaginePiccola("https://assets.tcgdex.net/en/sv/sv03.5/006/high.webp"))
                .isEqualTo("https://assets.tcgdex.net/en/sv/sv03.5/006/low.webp");
    }

    // riserve di pokemontcg.io (e carte non convertite): la piccola c'è, e pesa un decimo della grande
    @Test
    void immaginePiccolaDelleRiserve() {
        assertThat(OggettoResponseDTO.immaginePiccola("https://images.pokemontcg.io/sm75/1_hires.png"))
                .isEqualTo("https://images.pokemontcg.io/sm75/1.png");
        assertThat(OggettoResponseDTO.immaginePiccola("https://images.scrydex.com/pokemon/me55c-100/large"))
                .isEqualTo("https://images.scrydex.com/pokemon/me55c-100/small");
    }

    // minimo e massimo di Cardmarket salvati: arrivano con la carta (anche nelle tasche del binder)
    @Test
    void fasciaDiPrezzoSalvata() {
        Oggetto carta = new Oggetto("Furret", BigDecimal.ONE, null, "swsh3-136");
        carta.setPrezzoMinimo(new BigDecimal("0.02"));
        carta.setPrezzoMassimo(new BigDecimal("0.15"));
        carta.setPrezzoMinimoReverse(new BigDecimal("0.08"));
        carta.setPrezzoMassimoReverse(new BigDecimal("0.28"));

        OggettoResponseDTO dto = OggettoResponseDTO.from(carta);

        assertThat(dto.prezzoMinimo()).isEqualByComparingTo("0.02");
        assertThat(dto.prezzoMassimo()).isEqualByComparingTo("0.15");
        assertThat(dto.prezzoMinimoReverse()).isEqualByComparingTo("0.08");
        assertThat(dto.prezzoMassimoReverse()).isEqualByComparingTo("0.28");
    }

    // mai letti (o carta creata a mano): null, il frontend ripiega sul prezzo
    @Test
    void fasciaDiPrezzoMaiLetta() {
        OggettoResponseDTO dto = OggettoResponseDTO.from(new Oggetto("Furret", BigDecimal.ONE));

        assertThat(dto.prezzoMinimo()).isNull();
        assertThat(dto.prezzoMassimoReverse()).isNull();
    }

    // immagini degli oggetti creati a mano: si usa quella grande
    @Test
    void altriIndirizziRestanoUguali() {
        assertThat(OggettoResponseDTO.immaginePiccola("https://esempio.it/carta.jpg")).isEqualTo("https://esempio.it/carta.jpg");
        assertThat(OggettoResponseDTO.immaginePiccola(null)).isNull();
    }
}
