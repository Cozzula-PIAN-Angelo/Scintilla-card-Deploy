package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.payloads.CriterioOrdine;

import java.text.Collator;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

// ordine delle carte nelle pagine del Pokédex e degli artisti, e criteri del riordino di un binder
final class OrdineCarte {

    // dal set più recente (senza data in fondo), poi per set e numero
    static final Comparator<Oggetto> DALLA_PIU_RECENTE =
            Comparator.comparing(OrdineCarte::dataUscita, Comparator.nullsLast(Comparator.<LocalDate>reverseOrder()))
                    .thenComparing(o -> o.getEspansione() == null ? "" : o.getEspansione().getId())
                    .thenComparing(Oggetto::getNumero, NumeriCarta::confronta);

    // dalla più comune alla più rara; le rarità di pokemontcg.io sono testo libero, quelle fuori scala vanno in fondo
    static final List<String> SCALA_RARITA = List.of(
            "Common", "Uncommon", "Rare", "Rare Holo", "Promo", "Classic Collection",
            "Rare Holo LV.X", "Rare Holo EX", "Rare Prime", "LEGEND", "Rare BREAK", "Rare Holo GX", "Rare Prism Star",
            "Rare Holo V", "Holo Rare V", "Rare Holo VMAX", "Holo Rare VMAX", "Rare Holo VSTAR", "Holo Rare VSTAR",
            "Double Rare", "Rare Ultra", "Ultra Rare", "MEGA_ATTACK_RARE", "Trainer Gallery Rare Holo", "Radiant Rare",
            "Amazing Rare", "ACE SPEC Rare", "Pikachu Rare", "Futuristic Rare", "Black White Rare",
            "Rare Shining", "Rare Shiny", "Shiny Rare", "Rare Shiny GX", "Shiny Ultra Rare",
            "Illustration Rare", "Special Illustration Rare", "Rare Holo Star", "Rare Rainbow", "Rare Secret",
            "Hyper Rare", "Mega Hyper Rare");

    private static final Map<String, Integer> POSIZIONE_RARITA = IntStream.range(0, SCALA_RARITA.size()).boxed()
            .collect(Collectors.toMap(i -> SCALA_RARITA.get(i).toLowerCase(Locale.ROOT), Function.identity()));

    // ordine "da album", spareggio di tutti i criteri del binder: set dal più vecchio (senza set in fondo), poi numero
    private static final Comparator<Oggetto> SET_NUMERO = Comparator
            .comparing(Oggetto::getEspansione, Comparator.nullsLast(
                    Comparator.comparing(Espansione::getDataUscita, Comparator.nullsLast(Comparator.<LocalDate>naturalOrder()))
                            .thenComparing(Espansione::getId)))
            .thenComparing(Oggetto::getNumero, NumeriCarta::confronta);

    private OrdineCarte() {
    }

    static Comparator<Oggetto> comparatore(CriterioOrdine criterio) {
        Comparator<Oggetto> primo = switch (criterio) {
            case SET_NUMERO -> (a, b) -> 0;
            case POKEDEX -> Comparator.comparing(OrdineCarte::pokedex);
            case NOME -> Comparator.comparing(Oggetto::getNome, nomi());
            case RARITA -> Comparator.comparing(OrdineCarte::rarita);
        };
        return primo.thenComparing(SET_NUMERO);
    }

    private static LocalDate dataUscita(Oggetto oggetto) {
        Espansione espansione = oggetto.getEspansione();
        return espansione == null ? null : espansione.getDataUscita();
    }

    // il numero più basso: una carta con due Pokémon sta col primo. Senza Pokémon (allenatori, energie) in fondo
    private static int pokedex(Oggetto carta) {
        return carta.getNumeriPokedex().isEmpty() ? Integer.MAX_VALUE : Collections.min(carta.getNumeriPokedex());
    }

    private static int rarita(Oggetto carta) {
        String rarita = carta.getRarita();
        return rarita == null ? Integer.MAX_VALUE : POSIZIONE_RARITA.getOrDefault(rarita.toLowerCase(Locale.ROOT), Integer.MAX_VALUE);
    }

    // PRIMARY: niente differenze tra maiuscole e accenti
    private static Collator nomi() {
        Collator collator = Collator.getInstance(Locale.ITALIAN);
        collator.setStrength(Collator.PRIMARY);
        return collator;
    }
}
