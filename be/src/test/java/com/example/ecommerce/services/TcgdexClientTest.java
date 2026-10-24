package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.TcgdexApi;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.RequestMatcher;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TcgdexClientTest {

    private static final String BASE_URL = "https://api.tcgdex.test/v2";

    private MockRestServiceServer tcgdex;
    private TcgdexClient client;

    @BeforeEach
    void prepara() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        // ordine libero: i dettagli in parallelo arrivano in un ordine qualunque
        tcgdex = MockRestServiceServer.bindTo(builder).ignoreExpectOrder(true).build();
        // attese di 1 ms tra i tentativi: il test non deve aspettare secondi
        client = new TcgdexClient(builder.build(), 1);
    }

    // il parametro della query decodificato: i valori come "eq:25" viaggiano codificati (eq%3A25)
    private static RequestMatcher parametro(String nome, String valore) {
        return richiesta -> {
            List<String> valori = UriComponentsBuilder.fromUri(richiesta.getURI()).build().getQueryParams().get(nome);
            List<String> decodificati = valori == null ? List.of()
                    : valori.stream().map(v -> URLDecoder.decode(v, StandardCharsets.UTF_8)).toList();
            assertThat(decodificati).as("parametro " + nome).containsExactly(valore);
        };
    }

    private static String cartaBreve(String id) {
        return "{\"id\": \"" + id + "\", \"localId\": \"1\", \"name\": \"Carta " + id + "\"}";
    }

    @Test
    void setComprendeTcgPocket() {
        tcgdex.expect(requestTo(BASE_URL + "/graphql"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("releaseDate")))
                .andRespond(withSuccess("""
                        {"data": {"sets": [
                          {"id": "me04", "name": "Chaos Rising", "releaseDate": "2026-05-22",
                           "logo": "https://assets.tcgdex.net/en/me/me04/logo", "serie": {"id": "me", "name": "Mega Evolution"},
                           "cardCount": {"total": 122, "official": 86}},
                          {"id": "A1", "name": "Genetic Apex", "releaseDate": "2024-10-30",
                           "serie": {"id": "tcgp", "name": "Pokémon TCG Pocket"}, "cardCount": {"total": 286, "official": 226}}
                        ]}}
                        """, MediaType.APPLICATION_JSON));

        List<TcgdexApi.Set> set = client.set();

        assertThat(set).extracting(TcgdexApi.Set::id).containsExactly("me04", "A1");
        assertThat(set.getFirst().serie().name()).isEqualTo("Mega Evolution");
        assertThat(set.getFirst().cardCount().total()).isEqualTo(122);
        tcgdex.verify();
    }

    // tutte le carte in una chiamata, solo id, nome, numero e set: per allineare i nomi del catalogo
    @Test
    void carteDelCatalogoInUnaChiamata() {
        tcgdex.expect(requestTo(BASE_URL + "/graphql"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("rarity")))
                .andRespond(withSuccess("""
                        {"data": {"cards": [
                          {"id": "30th-c-025", "name": "Scizor ex", "localId": "025", "set": {"id": "30th-c"},
                           "image": "https://assets.tcgdex.net/en/me/30th-c/025", "rarity": "Double rare"}
                        ]}}
                        """, MediaType.APPLICATION_JSON));

        List<TcgdexApi.CartaDelCatalogo> carte = client.carteDelCatalogo();

        assertThat(carte).singleElement().satisfies(carta -> {
            assertThat(carta.id()).isEqualTo("30th-c-025");
            assertThat(carta.name()).isEqualTo("Scizor ex");
            assertThat(carta.localId()).isEqualTo("025");
            assertThat(carta.set().id()).isEqualTo("30th-c");
            assertThat(carta.image()).isEqualTo("https://assets.tcgdex.net/en/me/30th-c/025");
            assertThat(carta.rarity()).isEqualTo("Double rare");
        });
        tcgdex.verify();
    }

    @Test
    void carteDelCatalogoConErroriGraphqlSonoUnErroreEsterno() {
        tcgdex.expect(requestTo(BASE_URL + "/graphql"))
                .andRespond(withSuccess("{\"errors\": [{\"message\": \"query troppo grande\"}]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.carteDelCatalogo())
                .isInstanceOf(ServizioEsternoException.class)
                .hasMessageContaining("query troppo grande");
    }

    @Test
    void filtroDelPokemonDiventaDexId() {
        tcgdex.expect(requestTo(startsWith(BASE_URL + "/en/cards?")))
                .andExpect(parametro("dexId", "eq:25"))
                .andRespond(withSuccess("[" + cartaBreve("base1-58") + "]", MediaType.APPLICATION_JSON));

        assertThat(client.elenco(FiltroCarte.diPokemon(25))).extracting(TcgdexApi.CartaBreve::id).containsExactly("base1-58");
        tcgdex.verify();
    }

    @Test
    void filtroDelSetDiventaSetId() {
        tcgdex.expect(requestTo(startsWith(BASE_URL + "/en/cards?")))
                .andExpect(parametro("set.id", "eq:sv03.5"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(client.elenco(FiltroCarte.diSet("sv03.5"))).isEmpty();
        tcgdex.verify();
    }

    @Test
    void filtroSenzaArtistaCercaIllustratorNull() {
        tcgdex.expect(requestTo(startsWith(BASE_URL + "/en/cards?")))
                .andExpect(parametro("illustrator", "null:"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(client.elenco(FiltroCarte.senzaArtista())).isEmpty();
        tcgdex.verify();
    }

    @Test
    void filtroPerNomeCercaConLike() {
        tcgdex.expect(requestTo(startsWith(BASE_URL + "/en/cards?")))
                .andExpect(parametro("name", "like:mr. mime"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(client.elenco(FiltroCarte.perNome("mr. mime"))).isEmpty();
        tcgdex.verify();
    }

    @Test
    void artistaConPiuGrafieUnisceSenzaDoppioni() {
        tcgdex.expect(once(), requestTo(startsWith(BASE_URL + "/en/cards?")))
                .andExpect(parametro("illustrator", "eq:Ken Sugimori"))
                .andRespond(withSuccess("[" + cartaBreve("base1-1") + "," + cartaBreve("base1-2") + "]", MediaType.APPLICATION_JSON));
        tcgdex.expect(once(), requestTo(startsWith(BASE_URL + "/en/cards?")))
                .andExpect(parametro("illustrator", "eq:Ken Sugimori + Mitsuhiro Arita"))
                .andRespond(withSuccess("[" + cartaBreve("base1-2") + "," + cartaBreve("jungle-3") + "]", MediaType.APPLICATION_JSON));

        List<TcgdexApi.CartaBreve> carte = client.elenco(FiltroCarte.diArtista(List.of("Ken Sugimori", "Ken Sugimori + Mitsuhiro Arita")));

        assertThat(carte).extracting(TcgdexApi.CartaBreve::id).containsExactlyInAnyOrder("base1-1", "base1-2", "jungle-3");
        tcgdex.verify();
    }

    @Test
    void chiaviDeiFiltriStabili() {
        assertThat(FiltroCarte.diSet("sv03.5").chiave()).isEqualTo("set:sv03.5");
        assertThat(FiltroCarte.diPokemon(25).chiave()).isEqualTo("pokemon:25");
        assertThat(FiltroCarte.diArtista(List.of("A", "B")).chiave()).isEqualTo("artista:A|B");
        assertThat(FiltroCarte.senzaArtista().chiave()).isEqualTo("senza-artista");
        assertThat(FiltroCarte.perNome("pikachu").chiave()).isEqualTo("nome:pikachu");
    }

    @Test
    void dettaglioLeggeICampiUsati() {
        tcgdex.expect(requestTo(BASE_URL + "/en/cards/sv03.5-006"))
                .andRespond(withSuccess("""
                        {"id": "sv03.5-006", "localId": "006", "name": "Charizard ex", "rarity": "Double rare",
                         "illustrator": "PLANETA Mochizuki", "image": "https://assets.tcgdex.net/en/sv/sv03.5/006",
                         "dexId": [6], "set": {"id": "sv03.5", "name": "151", "cardCount": {"official": 165, "total": 207}},
                         "variants": {"normal": false, "reverse": false, "holo": true, "firstEdition": false},
                         "pricing": {"cardmarket": {"unit": "EUR", "avg": 8.27, "trend": 7.23, "avg-holo": null}}}
                        """, MediaType.APPLICATION_JSON));

        TcgdexApi.Carta carta = client.dettaglio("sv03.5-006");

        assertThat(carta.localId()).isEqualTo("006");
        assertThat(carta.dexId()).containsExactly(6);
        assertThat(carta.set().cardCount().official()).isEqualTo(165);
        assertThat(carta.variants().holo()).isTrue();
        assertThat(carta.pricing().cardmarket().trend()).isEqualByComparingTo("7.23");
        assertThat(carta.pricing().cardmarket().avg()).isEqualByComparingTo("8.27");
    }

    @Test
    void erroreTemporaneoSiRiprova() {
        tcgdex.expect(once(), requestTo(BASE_URL + "/en/cards/base1-4")).andRespond(withServerError());
        tcgdex.expect(once(), requestTo(BASE_URL + "/en/cards/base1-4"))
                .andRespond(withSuccess("{\"id\": \"base1-4\", \"localId\": \"4\", \"name\": \"Charizard\"}", MediaType.APPLICATION_JSON));

        assertThat(client.dettaglio("base1-4").name()).isEqualTo("Charizard");
        tcgdex.verify();
    }

    @Test
    void cartaInesistenteNonSiRiprova() {
        tcgdex.expect(once(), requestTo(BASE_URL + "/en/cards/zzz-1")).andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> client.dettaglio("zzz-1")).isInstanceOf(NotFoundException.class);
        tcgdex.verify();
    }

    @Test
    void troppiErroriLanciano() {
        tcgdex.expect(times(3), requestTo(BASE_URL + "/en/cards/base1-4"))
                .andRespond(withServerError().body("{\"error\":\"manutenzione\"}"));

        assertThatThrownBy(() -> client.dettaglio("base1-4"))
                .isInstanceOf(ServizioEsternoException.class)
                .hasMessageContaining("500")
                .hasMessageContaining("manutenzione");
        tcgdex.verify();
    }

    // una carta che TCGdex elenca ma non ha (404) non si ritenta: riprovando non cambia, e bloccherebbe per sempre
    // l'import del suo set
    @Test
    void cartaInesistenteNeiDettagliSiSalta() {
        tcgdex.expect(once(), requestTo(BASE_URL + "/en/cards/a-1"))
                .andRespond(withSuccess("{\"id\": \"a-1\", \"localId\": \"1\", \"name\": \"Uno\"}", MediaType.APPLICATION_JSON));
        tcgdex.expect(once(), requestTo(BASE_URL + "/en/cards/a-2")).andRespond(withStatus(HttpStatus.NOT_FOUND));

        TcgdexClient.Dettagli dettagli = client.dettagli(List.of("a-1", "a-2"));

        assertThat(dettagli.carte()).extracting(TcgdexApi.Carta::id).containsExactly("a-1");
        assertThat(dettagli.falliti()).isEmpty();
    }

    // la GraphQL risponde 200 anche con un errore: niente "0 set sincronizzati" silenzioso
    @Test
    void erroreGraphqlDeiSetLancia() {
        tcgdex.expect(requestTo(BASE_URL + "/graphql"))
                .andRespond(withSuccess("{\"errors\": [{\"message\": \"Cannot query field\"}], \"data\": null}",
                        MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.set())
                .isInstanceOf(ServizioEsternoException.class)
                .hasMessageContaining("Cannot query field");
    }

    @Test
    void dettagliInParalleloConUnoFallito() {
        tcgdex.expect(once(), requestTo(BASE_URL + "/en/cards/a-1"))
                .andRespond(withSuccess("{\"id\": \"a-1\", \"localId\": \"1\", \"name\": \"Uno\"}", MediaType.APPLICATION_JSON));
        tcgdex.expect(times(3), requestTo(BASE_URL + "/en/cards/a-2")).andRespond(withServerError());
        tcgdex.expect(once(), requestTo(BASE_URL + "/en/cards/a-3"))
                .andRespond(withSuccess("{\"id\": \"a-3\", \"localId\": \"3\", \"name\": \"Tre\"}", MediaType.APPLICATION_JSON));

        TcgdexClient.Dettagli dettagli = client.dettagli(List.of("a-1", "a-2", "a-3"));

        assertThat(dettagli.carte()).extracting(TcgdexApi.Carta::id).containsExactly("a-1", "a-3");
        assertThat(dettagli.falliti()).containsExactly("a-2");
    }
}
