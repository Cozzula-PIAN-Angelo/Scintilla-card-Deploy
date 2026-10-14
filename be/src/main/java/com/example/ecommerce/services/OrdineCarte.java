package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;

import java.time.LocalDate;
import java.util.Comparator;

// ordine delle carte nelle pagine del Pokédex e degli artisti
final class OrdineCarte {

    // dal set più recente (senza data in fondo), poi per set e numero
    static final Comparator<Oggetto> DALLA_PIU_RECENTE =
            Comparator.comparing(OrdineCarte::dataUscita, Comparator.nullsLast(Comparator.<LocalDate>reverseOrder()))
                    .thenComparing(o -> o.getEspansione() == null ? "" : o.getEspansione().getId())
                    .thenComparing(Oggetto::getNumero, NumeriCarta::confronta);

    private OrdineCarte() {
    }

    private static LocalDate dataUscita(Oggetto oggetto) {
        Espansione espansione = oggetto.getEspansione();
        return espansione == null ? null : espansione.getDataUscita();
    }
}
