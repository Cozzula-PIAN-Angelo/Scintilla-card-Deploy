package com.example.ecommerce.services;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AbbinamentoTcgdexTest {

    @Test
    void getUsaIlFileDelClasspath() {
        // nei test è src/test/resources/abbinamento-id.json, che copre quello vero
        AbbinamentoTcgdex abbinamento = AbbinamentoTcgdex.get();

        assertThat(abbinamento.set()).containsEntry("sv3pt5", "sv03.5").containsEntry("sm75", "sm7.5");
        assertThat(abbinamento.carte()).containsEntry("sv3pt5-6", "sv03.5-006");
        assertThat(abbinamento.immagine("sv03.5-006")).contains("https://assets.tcgdex.net/en/sv/sv03.5/006");
        assertThat(abbinamento.immagine("sm7.5-1")).isEmpty();
        assertThat(abbinamento.riserva("sm7.5-1")).contains("https://images.pokemontcg.io/sm75/1_hires.png");
        assertThat(abbinamento.riserva("sv03.5-006")).isEmpty();
    }

    @Test
    void rifiutaIlFileSenzaMappe() {
        assertThatThrownBy(() -> AbbinamentoTcgdex.da(new ByteArrayInputStream("{}".getBytes(StandardCharsets.UTF_8))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("abbinamento-id.json");
    }

    @Test
    void rifiutaIlFileRotto() {
        assertThatThrownBy(() -> AbbinamentoTcgdex.da(new ByteArrayInputStream("{rotto".getBytes(StandardCharsets.UTF_8))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("non leggibile");
    }
}
