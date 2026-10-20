package com.example.ecommerce.services;

import com.example.ecommerce.entities.Variante;
import com.example.ecommerce.payloads.TcgdexApi;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.example.ecommerce.entities.Variante.NORMALE;
import static com.example.ecommerce.entities.Variante.PRIMA_EDIZIONE;
import static com.example.ecommerce.entities.Variante.REVERSE_HOLO;
import static com.example.ecommerce.services.VariantiMaster.effettive;
import static org.assertj.core.api.Assertions.assertThat;

// regola delle varianti del master set e lettura delle varianti di TCGdex
class VariantiMasterTest {

    @Test
    void lettaConReverse() {
        assertThat(effettive(List.of(NORMALE, REVERSE_HOLO))).containsExactly(NORMALE, REVERSE_HOLO);
    }

    @Test
    void primaEdizioneTolta() {
        assertThat(effettive(List.of(NORMALE, PRIMA_EDIZIONE))).containsExactly(NORMALE);
    }

    @Test
    void soloPrimaEdizioneValeNormale() {
        assertThat(effettive(List.of(PRIMA_EDIZIONE))).containsExactly(NORMALE);
    }

    @Test
    void soloReverseRestaSoloReverse() {
        assertThat(effettive(List.of(REVERSE_HOLO))).containsExactly(REVERSE_HOLO);
    }

    @Test
    void vuotaValeNormale() {
        assertThat(effettive(List.of())).containsExactly(NORMALE);
    }

    @Test
    void maiLettaValeNormale() {
        assertThat(effettive(null)).containsExactly(NORMALE);
    }

    @Test
    void holoDiTcgdexContaComeNormale() {
        assertThat(Variante.daVariantiTcgdex(new TcgdexApi.Varianti(false, false, true, false))).containsExactly(NORMALE);
    }

    @Test
    void normaleEReverseDiTcgdex() {
        assertThat(Variante.daVariantiTcgdex(new TcgdexApi.Varianti(true, true, false, false))).containsExactly(NORMALE, REVERSE_HOLO);
    }

    @Test
    void normaleEHoloDiTcgdexSenzaDoppioni() {
        assertThat(Variante.daVariantiTcgdex(new TcgdexApi.Varianti(true, false, true, false))).containsExactly(NORMALE);
    }

    @Test
    void primaEdizioneDiTcgdex() {
        assertThat(Variante.daVariantiTcgdex(new TcgdexApi.Varianti(false, false, true, true))).containsExactly(NORMALE, PRIMA_EDIZIONE);
    }

    @Test
    void variantiDiTcgdexAssentiDannoListaVuota() {
        assertThat(Variante.daVariantiTcgdex(null)).isEmpty();
    }
}
