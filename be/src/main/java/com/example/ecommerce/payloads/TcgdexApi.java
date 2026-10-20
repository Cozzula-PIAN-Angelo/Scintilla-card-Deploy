package com.example.ecommerce.payloads;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;

// struttura delle risposte di TCGdex (api.tcgdex.net/v2, in inglese), solo con i campi usati.
// Uso interno di TcgdexClient e CatalogoService: non viene mai restituita ai client
public final class TcgdexApi {

    private TcgdexApi() {
    }

    // releaseDate nel formato "2026-05-22"; logo e symbol sono URL senza estensione
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Set(String id, String name, String releaseDate, String logo, String symbol, Serie serie,
                      CardCount cardCount) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Serie(String id, String name) {
    }

    // official: il totale stampato sulle carte (es. 165 in "6/165"); total comprende le segrete
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CardCount(Integer total, Integer official) {
    }

    // risposta della GraphQL dei set: {"data": {"sets": [...]}}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RispostaSet(DatiSet data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DatiSet(List<Set> sets) {
    }

    // elemento di GET /cards: image manca nelle carte senza immagine
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CartaBreve(String id, String localId, String name, String image) {
    }

    // dexId: i Pokémon raffigurati (più di uno nelle carte "tag team"); assente per allenatori ed energie.
    // localId: il numero nel set, a volte con zeri davanti ("006") o con lettere ("TG01")
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Carta(String id, String localId, String name, String rarity, String illustrator, String image,
                        List<Integer> dexId, SetDellaCarta set, Varianti variants, Prezzi pricing) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SetDellaCarta(String id, String name, CardCount cardCount) {
    }

    // holo: la stampa holo di una rara holo, che per noi è la sua versione normale
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Varianti(boolean normal, boolean reverse, boolean holo, boolean firstEdition) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Prezzi(Cardmarket cardmarket) {
    }

    // prezzi in euro; 0 o null quando un valore non è disponibile
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Cardmarket(BigDecimal trend, BigDecimal avg) {
    }
}
