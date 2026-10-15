package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.ConflictException;

import java.util.SortedMap;
import java.util.TreeMap;

// regole di "Fai spazio" sulle tasche di un binder, come mappa indice lineare (pagina * tasche + posizione) -> carta.
// Non modificano la mappa ricevuta: ne restituiscono una nuova. Le stesse regole sono in fe/.../binder/disposizione.ts
final class Disposizione {

    private Disposizione() {
    }

    // tasca occupata: le carte avanzano di una tasca fino al primo buco dopo, la nuova prende il posto
    static <T> TreeMap<Integer, T> inserisci(SortedMap<Integer, T> tasche, int totale, int indice, T carta) {
        TreeMap<Integer, T> nuove = new TreeMap<>(tasche);
        if (nuove.containsKey(indice)) {
            int buco = primoBuco(nuove, indice, totale);
            if (buco == totale) {
                throw new ConflictException("Binder pieno: non c'è una tasca libera dopo questa");
            }
            for (int i = buco - 1; i >= indice; i--) {
                nuove.put(i + 1, nuove.get(i));
            }
        }
        nuove.put(indice, carta);
        return nuove;
    }

    // le carte dopo arretrano di una tasca fino al buco successivo: i gruppi separati da tasche vuote restano separati
    static <T> TreeMap<Integer, T> togli(SortedMap<Integer, T> tasche, int totale, int indice) {
        TreeMap<Integer, T> nuove = new TreeMap<>(tasche);
        if (nuove.remove(indice) == null) {
            return nuove;
        }
        int buco = primoBuco(nuove, indice, totale);
        for (int i = indice + 1; i < buco; i++) {
            nuove.put(i - 1, nuove.get(i));
        }
        nuove.remove(buco - 1);
        return nuove;
    }

    // su una tasca vuota la carta va esattamente lì; su una occupata finisce subito prima della carta che c'era
    static <T> TreeMap<Integer, T> sposta(SortedMap<Integer, T> tasche, int totale, int da, int a) {
        TreeMap<Integer, T> nuove = new TreeMap<>(tasche);
        T carta = nuove.get(da);
        if (carta == null || da == a) {
            return nuove;
        }
        if (!nuove.containsKey(a)) {
            nuove.remove(da);
            nuove.put(a, carta);
            return nuove;
        }
        // la carta d'arrivo arretra di una tasca se sta nel gruppo che si richiude dopo la partenza
        int buco = primoBuco(nuove, da, totale);
        int dove = a > da && a < buco ? a - 1 : a;
        return inserisci(togli(nuove, totale, da), totale, dove, carta);
    }

    // primo indice libero dopo `indice`, oppure `totale` se non ce ne sono
    private static int primoBuco(SortedMap<Integer, ?> tasche, int indice, int totale) {
        int i = indice + 1;
        while (i < totale && tasche.containsKey(i)) {
            i++;
        }
        return i;
    }
}
