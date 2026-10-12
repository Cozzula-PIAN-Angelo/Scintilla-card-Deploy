package com.example.ecommerce.entities;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ConvertitoreVariantiTest {

    private final ConvertitoreVarianti convertitore = new ConvertitoreVarianti();

    @Test
    void nullRestaNull() {
        assertThat(convertitore.convertToDatabaseColumn(null)).isNull();
        assertThat(convertitore.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void listaVuotaEStringaVuota() {
        assertThat(convertitore.convertToDatabaseColumn(List.of())).isEmpty();
        assertThat(convertitore.convertToEntityAttribute("")).isEmpty();
    }

    @Test
    void piuVarianti() {
        List<Variante> varianti = List.of(Variante.NORMALE, Variante.REVERSE_HOLO);

        assertThat(convertitore.convertToDatabaseColumn(varianti)).isEqualTo("NORMALE,REVERSE_HOLO");
        assertThat(convertitore.convertToEntityAttribute("NORMALE,REVERSE_HOLO")).isEqualTo(varianti);
    }
}
