package com.example.ecommerce.payloads;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

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

        // Pokémon TCG Pocket, il gioco per telefono: l'unica serie digitale di TCGdex
        public boolean isPocket() {
            return "tcgp".equals(id);
        }
    }

    // official: il totale stampato sulle carte (es. 165 in "6/165"); total comprende le segrete
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CardCount(Integer total, Integer official) {
    }

    // risposta della GraphQL dei set: {"data": {"sets": [...]}}; errors c'è quando la query non va (con status 200)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RispostaSet(DatiSet data, List<ErroreGraphql> errors) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ErroreGraphql(String message) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DatiSet(List<Set> sets) {
    }

    // risposta della GraphQL di tutte le carte: {"data": {"cards": [...]}}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RispostaCarte(DatiCarte data, List<ErroreGraphql> errors) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DatiCarte(List<CartaDelCatalogo> cards) {
    }

    // carta dell'elenco completo: solo quel che serve a nome, numero, immagine e rarità (del set arriva solo l'id)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CartaDelCatalogo(String id, String localId, String name, String image, String rarity, SetDellaCarta set) {
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

    // prezzi in euro; 0 o null quando un valore non è disponibile. low: l'offerta più bassa; avg1/7/30: medie
    // degli ultimi 1, 7, 30 giorni. I "-holo" sono gli stessi valori per la versione holo (la Reverse delle carte
    // base). updated: data ISO dell'ultimo aggiornamento di TCGdex
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Cardmarket(String updated, BigDecimal trend, BigDecimal avg, BigDecimal low,
                             BigDecimal avg1, BigDecimal avg7, BigDecimal avg30,
                             @JsonProperty("trend-holo") BigDecimal trendHolo,
                             @JsonProperty("avg-holo") BigDecimal avgHolo,
                             @JsonProperty("low-holo") BigDecimal lowHolo,
                             @JsonProperty("avg1-holo") BigDecimal avg1Holo,
                             @JsonProperty("avg7-holo") BigDecimal avg7Holo,
                             @JsonProperty("avg30-holo") BigDecimal avg30Holo) {

        // all'import bastano trend e media
        public Cardmarket(BigDecimal trend, BigDecimal avg) {
            this(null, trend, avg, null, null, null, null, null, null, null, null, null, null);
        }
    }
}
