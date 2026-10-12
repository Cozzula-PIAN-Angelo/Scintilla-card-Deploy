package com.example.ecommerce.payloads;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

// struttura delle risposte di pokemontcg.io v2, solo con i campi richiesti tramite "select".
// Uso interno del service: non viene mai restituita ai client
public final class PokemonTcgApi {

    private PokemonTcgApi() {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RispostaRicerca(List<Carta> data, int page, int pageSize, int count, long totalCount) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RispostaCarta(Carta data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    // nationalPokedexNumbers: i Pokémon raffigurati (più di uno nelle carte "tag team"); vuoto per
    // allenatori ed energie
    public record Carta(String id, String name, String number, String rarity, String supertype, List<String> subtypes,
                        Espansione set, Immagini images, Cardmarket cardmarket, List<Integer> nationalPokedexNumbers, Tcgplayer tcgplayer) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RispostaEspansioni(List<Espansione> data, long totalCount) {
    }

    // releaseDate nel formato "2026/09/16"
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Espansione(String id, String name, String series, Integer printedTotal, Integer total,
                             String releaseDate, ImmaginiEspansione images) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ImmaginiEspansione(String symbol, String logo) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Immagini(String small, String large) {
    }

    // prices: le chiavi sono le varianti stampate (normal, reverseHolofoil...); dei valori non serve nulla
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Tcgplayer(Map<String, Object> prices) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Cardmarket(PrezziCardmarket prices) {
    }

    // prezzi in euro; l'API usa 0.0 quando un valore non è disponibile
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PrezziCardmarket(BigDecimal trendPrice, BigDecimal averageSellPrice) {
    }
}
