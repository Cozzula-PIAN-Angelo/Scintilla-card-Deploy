package com.example.ecommerce.payloads;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;

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
    public record Carta(String id, String name, String number, String rarity,
                        Espansione set, Immagini images, Cardmarket cardmarket) {
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Cardmarket(PrezziCardmarket prices) {
    }

    // prezzi in euro; l'API usa 0.0 quando un valore non è disponibile
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PrezziCardmarket(BigDecimal trendPrice, BigDecimal averageSellPrice) {
    }
}
