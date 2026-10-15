package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.ConflictException;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.TreeMap;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DisposizioneTest {

    private static final int TOTALE = 9;

    @Test
    void inserisciInTascaVuota() {
        assertThat(Disposizione.inserisci(tasche(Map.of(0, "A", 2, "B")), TOTALE, 1, "X"))
                .isEqualTo(Map.of(0, "A", 1, "X", 2, "B"));
    }

    @Test
    void inserisciInMezzoScalaFinoAlBuco() {
        assertThat(Disposizione.inserisci(tasche(Map.of(0, "A", 1, "B", 2, "C", 4, "D")), TOTALE, 1, "X"))
                .isEqualTo(Map.of(0, "A", 1, "X", 2, "B", 3, "C", 4, "D"));
    }

    @Test
    void inserisciSenzaBuchiDopo409() {
        // l'unico buco è prima della tasca: non conta
        TreeMap<Integer, String> tasche = piene(TOTALE);
        tasche.remove(0);
        assertThatThrownBy(() -> Disposizione.inserisci(tasche, TOTALE, 3, "X"))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Binder pieno: non c'è una tasca libera dopo questa");
    }

    @Test
    void inserisciUltimaTasca() {
        assertThatThrownBy(() -> Disposizione.inserisci(tasche(Map.of(8, "A")), TOTALE, 8, "X"))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void inserisciTascaVuotaInBinderPieno() {
        TreeMap<Integer, String> tasche = piene(TOTALE);
        tasche.remove(5);
        assertThat(Disposizione.inserisci(tasche, TOTALE, 5, "X")).containsEntry(5, "X").hasSize(TOTALE);
    }

    @Test
    void inserisciNonModificaLInput() {
        TreeMap<Integer, String> tasche = tasche(Map.of(0, "A"));
        Disposizione.inserisci(tasche, TOTALE, 0, "X");
        assertThat(tasche).isEqualTo(Map.of(0, "A"));
    }

    @Test
    void togliRichiudeFinoAlBuco() {
        assertThat(Disposizione.togli(tasche(Map.of(0, "A", 1, "B", 2, "C", 4, "D")), TOTALE, 0))
                .isEqualTo(Map.of(0, "B", 1, "C", 4, "D"));
    }

    @Test
    void togliSenzaBuchiDopo() {
        assertThat(Disposizione.togli(tasche(Map.of(6, "A", 7, "B", 8, "C")), TOTALE, 6))
                .isEqualTo(Map.of(6, "B", 7, "C"));
    }

    @Test
    void togliUltimaTasca() {
        assertThat(Disposizione.togli(tasche(Map.of(7, "A", 8, "B")), TOTALE, 8)).isEqualTo(Map.of(7, "A"));
    }

    @Test
    void spostaSuTascaVuotaNonScala() {
        assertThat(Disposizione.sposta(tasche(Map.of(0, "A", 1, "B")), TOTALE, 0, 5))
                .isEqualTo(Map.of(1, "B", 5, "A"));
    }

    @Test
    void spostaAvanti() {
        // A finisce subito prima di C, la carta che era nella tasca d'arrivo
        assertThat(Disposizione.sposta(tasche(Map.of(0, "A", 1, "B", 2, "C", 3, "D")), TOTALE, 0, 2))
                .isEqualTo(Map.of(0, "B", 1, "A", 2, "C", 3, "D"));
    }

    @Test
    void spostaIndietro() {
        assertThat(Disposizione.sposta(tasche(Map.of(0, "A", 1, "B", 2, "C")), TOTALE, 2, 0))
                .isEqualTo(Map.of(0, "C", 1, "A", 2, "B"));
    }

    @Test
    void spostaTraPagine() {
        // 18 tasche = due pagine da 9: da pagina 0 tasca 3 a pagina 1 tasca 3
        assertThat(Disposizione.sposta(tasche(Map.of(3, "A", 4, "B", 12, "C", 13, "D")), 18, 3, 12))
                .isEqualTo(Map.of(3, "B", 12, "A", 13, "C", 14, "D"));
    }

    @Test
    void spostaAvantiOltreIlGruppoSenzaBuchiDopo() {
        // dopo l'arrivo non c'è posto: la carta va subito prima di C5 facendo arretrare quelle prima, nel buco lasciato
        TreeMap<Integer, String> tasche = piene(TOTALE);
        tasche.remove(1);
        tasche.put(0, "A");
        assertThat(Disposizione.sposta(tasche, TOTALE, 0, 5))
                .isEqualTo(Map.of(1, "C2", 2, "C3", 3, "C4", 4, "A", 5, "C5", 6, "C6", 7, "C7", 8, "C8"));
    }

    @Test
    void copieDellaStessaCarta() {
        assertThat(Disposizione.togli(tasche(Map.of(0, "A", 1, "A")), TOTALE, 0)).isEqualTo(Map.of(0, "A"));
        assertThat(Disposizione.inserisci(tasche(Map.of(0, "A")), TOTALE, 0, "A")).isEqualTo(Map.of(0, "A", 1, "A"));
    }

    private static TreeMap<Integer, String> tasche(Map<Integer, String> carte) {
        return new TreeMap<>(carte);
    }

    private static TreeMap<Integer, String> piene(int totale) {
        TreeMap<Integer, String> tasche = new TreeMap<>();
        IntStream.range(0, totale).forEach(i -> tasche.put(i, "C" + i));
        return tasche;
    }
}
