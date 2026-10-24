package com.example.ecommerce.services;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.util.Map;

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
        assertThat(abbinamento.riserva("sm7.5-1")).contains("/immagini/carte/sm7.5-1.webp");
        assertThat(abbinamento.riserva("sv03.5-006")).isEmpty();
        assertThat(abbinamento.riservaVecchia("sm2-121a")).contains("/immagini/carte/sm2-121a.webp");
        assertThat(abbinamento.simbolo("sv03.5")).contains("/immagini/set/sv03.5-simbolo.webp");
        assertThat(abbinamento.logo("30th")).contains("/immagini/set/30th-logo.webp");
        assertThat(abbinamento.logo("sv03.5")).isEmpty();
    }

    // ConversioneIdTcgdex rifiuta un id nuovo che è l'id vecchio di un'altra carta: con catene o scambi (a -> b, b -> c)
    // non si distinguono le carte già convertite, e il seeder, che la rilancia a ogni export, le sposterebbe di nuovo.
    // Il file vero non ne deve avere (src/main: nei test il classpath ha quello di prova)
    @Test
    void fileVeroSenzaCateneDiId() throws IOException {
        try (InputStream json = Files.newInputStream(Path.of("src/main/resources/abbinamento-id.json"))) {
            Map<String, String> carte = AbbinamentoTcgdex.da(json).carte();
            assertThat(carte).isNotEmpty();
            assertThat(carte.entrySet()).filteredOn(voce -> !voce.getKey().equals(voce.getValue()))
                    .extracting(Map.Entry::getValue)
                    .doesNotContainAnyElementsOf(carte.entrySet().stream()
                            .filter(voce -> !voce.getKey().equals(voce.getValue())).map(Map.Entry::getKey).toList());
        }
    }

    // i doppioni uniti dalla V14 sono abbinati allo stesso modo nel file vero, con l'immagine locale per le carte di
    // TCGdex che non ce l'hanno: così anche un import nuovo o un vecchio export li converte giusti
    @Test
    void fileVeroConIDoppioniDellaV14() throws IOException {
        try (InputStream json = Files.newInputStream(Path.of("src/main/resources/abbinamento-id.json"))) {
            AbbinamentoTcgdex abbinamento = AbbinamentoTcgdex.da(json);
            assertThat(abbinamento.carte()).containsAllEntriesOf(UnioneDoppioniTcgdex.DOPPIONI);
            assertThat(abbinamento.riserva("30th-c-019")).contains("/immagini/carte/me55c-99.webp");
            assertThat(abbinamento.riserva("30th-c-020")).contains("/immagini/carte/me55c-100.webp");
            assertThat(abbinamento.riserva("30th-c-022")).contains("/immagini/carte/me55c-106p.webp");
        }
    }

    // un file generato prima delle copie locali non ha le mappe delle immagini: vuote, non un errore
    @Test
    void mappeDelleImmaginiFacoltative() {
        AbbinamentoTcgdex abbinamento = AbbinamentoTcgdex.da(new ByteArrayInputStream(
                "{\"set\": {}, \"carte\": {}, \"immagini\": {}, \"riserve\": {}}".getBytes(StandardCharsets.UTF_8)));

        assertThat(abbinamento.simbolo("base1")).isEmpty();
        assertThat(abbinamento.logo("30th")).isEmpty();
        assertThat(abbinamento.riservaVecchia("sm2-121a")).isEmpty();
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
