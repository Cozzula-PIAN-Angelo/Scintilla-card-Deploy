package com.example.ecommerce.services;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

class PaginationHelperTest {

    private final PaginationHelper helper = new PaginationHelper(10, 50);

    // le carte importate in blocco hanno createdAt quasi uguali: senza un secondo criterio univoco
    // PostgreSQL può restituirle in ordine diverso da una pagina all'altra (doppioni o carte perse)
    @Test
    void ordinamentoDiDefaultHaIdComeSecondoCriterio() {
        Pageable pagina = helper.perOggetti(null, null, null);

        assertThat(pagina.getSort()).containsExactly(
                Sort.Order.desc("createdAt"),
                Sort.Order.asc("id"));
    }

    @Test
    void ordinamentoSceltoHaIdComeSecondoCriterio() {
        Pageable pagina = helper.perOggetti(0, 10, "prezzo,desc");

        assertThat(pagina.getSort()).containsExactly(
                Sort.Order.desc("prezzo"),
                Sort.Order.asc("id"));
    }

    // nei preferiti id è quello della riga del preferito, univoco anche lui
    @Test
    void preferitiHannoIdComeSecondoCriterio() {
        Pageable pagina = helper.perPreferiti(0, 10, "nome");

        assertThat(pagina.getSort()).containsExactly(
                Sort.Order.asc("oggetto.nome"),
                Sort.Order.asc("id"));
    }
}
