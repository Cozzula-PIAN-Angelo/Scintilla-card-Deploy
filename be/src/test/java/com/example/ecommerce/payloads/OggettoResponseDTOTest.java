package com.example.ecommerce.payloads;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OggettoResponseDTOTest {

    @Test
    void immaginePiccolaDiTcgdex() {
        assertThat(OggettoResponseDTO.immaginePiccola("https://assets.tcgdex.net/en/sv/sv03.5/006/high.webp"))
                .isEqualTo("https://assets.tcgdex.net/en/sv/sv03.5/006/low.webp");
    }

    // riserve di pokemontcg.io e immagini degli oggetti creati a mano: si usa quella grande
    @Test
    void altriIndirizziRestanoUguali() {
        assertThat(OggettoResponseDTO.immaginePiccola("https://images.pokemontcg.io/sm75/1_hires.png"))
                .isEqualTo("https://images.pokemontcg.io/sm75/1_hires.png");
        assertThat(OggettoResponseDTO.immaginePiccola("https://esempio.it/carta.jpg")).isEqualTo("https://esempio.it/carta.jpg");
        assertThat(OggettoResponseDTO.immaginePiccola(null)).isNull();
    }
}
