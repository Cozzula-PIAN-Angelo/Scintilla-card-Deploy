package com.example.ecommerce.payloads;

import org.junit.jupiter.api.Test;

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

    // immagini degli oggetti creati a mano: si usa quella grande
    @Test
    void altriIndirizziRestanoUguali() {
        assertThat(OggettoResponseDTO.immaginePiccola("https://esempio.it/carta.jpg")).isEqualTo("https://esempio.it/carta.jpg");
        assertThat(OggettoResponseDTO.immaginePiccola(null)).isNull();
    }
}
