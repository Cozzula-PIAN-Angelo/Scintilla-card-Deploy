package com.example.ecommerce.services;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NumeriCartaTest {

    @Test
    void ordinaComeNellAlbum() {
        List<String> numeri = new ArrayList<>(Arrays.asList("TG01", "10", null, "2", "102", "SV", "4a", "4", "GG02", "GG01"));

        numeri.sort(NumeriCarta::confronta);

        // prima i numeri semplici (anche con suffisso), poi quelli con prefisso, poi senza cifre, null in fondo
        assertThat(numeri).containsExactly("2", "4", "4a", "10", "102", "GG01", "GG02", "TG01", "SV", null);
    }

    @Test
    void confrontaPerValoreNumericoENonPerTesto() {
        assertThat(NumeriCarta.confronta("9", "10")).isNegative();
        assertThat(NumeriCarta.confronta("010", "10")).isZero();
    }
}
