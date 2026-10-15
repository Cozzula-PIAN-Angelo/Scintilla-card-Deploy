package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.payloads.CriterioOrdine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class OrdineCarteTest {

    private static final Espansione BASE = espansione("base1", LocalDate.of(1999, 1, 9));
    private static final Espansione JUNGLE = espansione("base2", LocalDate.of(1999, 6, 16));
    private static final Espansione FOSSIL = espansione("base3", LocalDate.of(2000, 10, 10));

    @Test
    void setNumeroOrdinaPerDataDelSetPoiNumero() {
        Oggetto dieci = carta("Raichu", BASE, "10");
        Oggetto due = carta("Blastoise", BASE, "2");
        Oggetto uno = carta("Aerodactyl", FOSSIL, "1");

        assertThat(ordina(CriterioOrdine.SET_NUMERO, uno, dieci, due)).containsExactly(due, dieci, uno);
    }

    @Test
    void cartaSenzaSetInFondo() {
        Oggetto senzaSet = carta("Promo", null, "1");
        Oggetto conSet = carta("Fossil", FOSSIL, "99");

        assertThat(ordina(CriterioOrdine.SET_NUMERO, senzaSet, conSet)).containsExactly(conSet, senzaSet);
    }

    @Test
    void pokedexUsaIlNumeroPiuBasso() {
        Oggetto pikachuRaichu = carta("Pikachu & Raichu", BASE, "5", 25, 26);
        Oggetto rattata = carta("Rattata", BASE, "1", 30);
        Oggetto allenatore = carta("Professor Oak", BASE, "2");

        assertThat(ordina(CriterioOrdine.POKEDEX, allenatore, rattata, pikachuRaichu))
                .containsExactly(pikachuRaichu, rattata, allenatore);
    }

    @Test
    void nomeSenzaMaiuscoleConSpareggioSetNumero() {
        Oggetto bulbasaur = carta("Bulbasaur", BASE, "44");
        Oggetto abra = carta("abra", BASE, "43");
        Oggetto pikachuJungle = carta("Pikachu", JUNGLE, "60");
        Oggetto pikachuBase = carta("Pikachu", BASE, "58");

        assertThat(ordina(CriterioOrdine.NOME, pikachuJungle, bulbasaur, pikachuBase, abra))
                .containsExactly(abra, bulbasaur, pikachuBase, pikachuJungle);
    }

    @Test
    void raritaSuScalaFissa() {
        Oggetto hyper = rara("Hyper Rare", "1");
        Oggetto common = rara("Common", "2");
        Oggetto illustration = rara("Illustration Rare", "3");
        Oggetto uncommon = rara("uncommon", "4");
        Oggetto rare = rara("Rare", "5");
        Oggetto boh = rara("Boh", "6");
        Oggetto vuota = rara("", "7");
        Oggetto nulla = rara(null, "8");

        assertThat(ordina(CriterioOrdine.RARITA, nulla, hyper, boh, common, vuota, illustration, uncommon, rare))
                .containsExactly(common, uncommon, rare, illustration, hyper, boh, vuota, nulla);
    }

    private static List<Oggetto> ordina(CriterioOrdine criterio, Oggetto... carte) {
        List<Oggetto> lista = new ArrayList<>(Arrays.asList(carte));
        lista.sort(OrdineCarte.comparatore(criterio));
        return lista;
    }

    private static Oggetto rara(String rarita, String numero) {
        Oggetto carta = carta("Carta " + numero, BASE, numero);
        carta.setRarita(rarita);
        return carta;
    }

    private static Oggetto carta(String nome, Espansione espansione, String numero, Integer... pokedex) {
        Oggetto carta = new Oggetto(nome, BigDecimal.ONE);
        carta.setEspansione(espansione);
        carta.setNumero(numero);
        carta.setNumeriPokedex(Set.of(pokedex));
        return carta;
    }

    private static Espansione espansione(String id, LocalDate uscita) {
        Espansione espansione = new Espansione();
        espansione.setId(id);
        espansione.setDataUscita(uscita);
        return espansione;
    }
}
