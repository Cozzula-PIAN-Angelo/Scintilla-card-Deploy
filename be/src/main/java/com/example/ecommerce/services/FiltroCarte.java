package com.example.ecommerce.services;

import java.util.List;
import java.util.Map;

// quali carte chiedere a TCGdex. chiave: stabile, per la cache delle pagine al volo. parametri: della query di
// GET /cards, uno per chiamata; più valori = più chiamate unite per id (un artista con più grafie)
public record FiltroCarte(String chiave, String parametro, List<String> valori) {

    public FiltroCarte {
        valori = List.copyOf(valori);
    }

    public static FiltroCarte diSet(String id) {
        return new FiltroCarte("set:" + id, "set.id", List.of("eq:" + id));
    }

    public static FiltroCarte diPokemon(int numero) {
        return new FiltroCarte("pokemon:" + numero, "dexId", List.of("eq:" + numero));
    }

    // grafie: i valori grezzi del campo illustrator in cui compare l'artista (artisti.json)
    public static FiltroCarte diArtista(List<String> grafie) {
        return new FiltroCarte("artista:" + String.join("|", grafie), "illustrator",
                grafie.stream().map(grafia -> "eq:" + grafia).toList());
    }

    public static FiltroCarte senzaArtista() {
        return new FiltroCarte("senza-artista", "illustrator", List.of("null:"));
    }

    // testo già pulito: contiene, senza badare a maiuscole
    public static FiltroCarte perNome(String testo) {
        return new FiltroCarte("nome:" + testo, "name", List.of("like:" + testo));
    }

    // per il client: parametro -> valore di ciascuna chiamata
    List<Map.Entry<String, String>> chiamate() {
        return valori.stream().map(valore -> Map.entry(parametro, valore)).toList();
    }
}
