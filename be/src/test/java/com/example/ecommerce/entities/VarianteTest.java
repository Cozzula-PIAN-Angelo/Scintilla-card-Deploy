package com.example.ecommerce.entities;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class VarianteTest {

    // il risultato segue l'ordine dell'enum, non quello delle chiavi
    @Test
    void chiaviNote() {
        assertThat(Variante.daChiaviTcgplayer(List.of("reverseHolofoil", "normal")))
                .containsExactly(Variante.NORMALE, Variante.REVERSE_HOLO);
    }

    @Test
    void chiaviEquivalentiSenzaDoppioni() {
        assertThat(Variante.daChiaviTcgplayer(List.of("normal", "unlimited"))).containsExactly(Variante.NORMALE);
    }

    // niente Holo: la stampa holofoil di una rara holo è la sua Normale
    @Test
    void holofoilContaComeNormale() {
        assertThat(Variante.daChiaviTcgplayer(List.of("holofoil", "unlimitedHolofoil"))).containsExactly(Variante.NORMALE);
        assertThat(Variante.daChiaviTcgplayer(List.of("normal", "holofoil", "reverseHolofoil")))
                .containsExactly(Variante.NORMALE, Variante.REVERSE_HOLO);
    }

    @Test
    void primaEdizione() {
        assertThat(Variante.daChiaviTcgplayer(List.of("1stEditionHolofoil", "1stEditionNormal", "1stEdition")))
                .containsExactly(Variante.PRIMA_EDIZIONE);
    }

    @Test
    void chiaviSconosciuteIgnorate() {
        assertThat(Variante.daChiaviTcgplayer(List.of("normal", "metalFoil"))).containsExactly(Variante.NORMALE);
    }

    @Test
    void nessunaChiave() {
        assertThat(Variante.daChiaviTcgplayer(null)).isEmpty();
        assertThat(Variante.daChiaviTcgplayer(List.of())).isEmpty();
    }
}
