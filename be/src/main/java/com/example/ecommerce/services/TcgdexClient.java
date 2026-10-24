package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.TcgdexApi;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

// tutte e sole le chiamate HTTP a TCGdex (in inglese). Niente database: la conversione nel catalogo è di
// CatalogoService. Errori temporanei (5xx, 429, rete) ritentati; 404 -> NotFoundException; il resto
// ServizioEsternoException, col dettaglio nel messaggio
@Slf4j
@Component
public class TcgdexClient {

    private static final int TENTATIVI = 3;
    // dettagli in parallelo: 24 carte in circa mezzo secondo senza martellare TCGdex
    private static final int DETTAGLI_IN_PARALLELO = 8;
    private static final String QUERY_SET =
            "{ sets { id name releaseDate logo symbol serie { id name } cardCount { total official } } }";
    // tutte le carte (circa 23.000, 1,7 MB): per allineare nomi e numeri del catalogo
    private static final String QUERY_CARTE = "{ cards { id name localId set { id } } }";

    private final RestClient tcgdexRestClient;
    private final long attesaBaseMs;
    private final ExecutorService dettagliExecutor;

    @Autowired
    public TcgdexClient(RestClient tcgdexRestClient) {
        this(tcgdexRestClient, 1000);
    }

    // per i test: attese brevi tra i tentativi
    TcgdexClient(RestClient tcgdexRestClient, long attesaBaseMs) {
        this.tcgdexRestClient = tcgdexRestClient;
        this.attesaBaseMs = attesaBaseMs;
        AtomicInteger numero = new AtomicInteger();
        this.dettagliExecutor = Executors.newFixedThreadPool(DETTAGLI_IN_PARALLELO, compito -> {
            Thread thread = new Thread(compito, "tcgdex-" + numero.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        });
    }

    @PreDestroy
    void chiudi() {
        dettagliExecutor.shutdownNow();
    }

    // tutti i set in una chiamata (la GraphQL dà data e serie, l'elenco REST no), anche quelli di TCG Pocket
    public List<TcgdexApi.Set> set() {
        TcgdexApi.RispostaSet risposta = graphql(QUERY_SET, TcgdexApi.RispostaSet.class, "elenco dei set");
        controllaErrori(risposta.errors());
        return risposta.data() == null || risposta.data().sets() == null ? List.of() : risposta.data().sets();
    }

    // tutte le carte di TCGdex in una chiamata, con id, nome, numero e set
    public List<TcgdexApi.CartaDelCatalogo> carteDelCatalogo() {
        TcgdexApi.RispostaCarte risposta = graphql(QUERY_CARTE, TcgdexApi.RispostaCarte.class, "elenco delle carte");
        controllaErrori(risposta.errors());
        return risposta.data() == null || risposta.data().cards() == null ? List.of() : risposta.data().cards();
    }

    private <R> R graphql(String query, Class<R> tipo, String descrizione) {
        return conTentativi(() -> chiama(() -> tcgdexRestClient.post()
                        .uri("/graphql")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("query", query))
                        .retrieve()
                        .body(tipo),
                Character.toUpperCase(descrizione.charAt(0)) + descrizione.substring(1) + " non trovato su TCGdex"),
                descrizione);
    }

    // errori della query: TCGdex risponde comunque 200
    private static void controllaErrori(List<TcgdexApi.ErroreGraphql> errori) {
        if (errori != null && !errori.isEmpty()) {
            throw new ServizioEsternoException("La GraphQL di TCGdex ha risposto con errori: "
                    + errori.stream().map(TcgdexApi.ErroreGraphql::message).toList(), null);
        }
    }

    // elenco breve di tutte le carte del filtro, senza paginazione; più chiamate unite per id, nell'ordine di arrivo
    public List<TcgdexApi.CartaBreve> elenco(FiltroCarte filtro) {
        Map<String, TcgdexApi.CartaBreve> carte = new LinkedHashMap<>();
        for (Map.Entry<String, String> chiamata : filtro.chiamate()) {
            TcgdexApi.CartaBreve[] risposta = conTentativi(() -> chiama(() -> tcgdexRestClient.get()
                            .uri(uri -> uri.path("/en/cards").queryParam(chiamata.getKey(), "{valore}")
                                    .build(Map.of("valore", chiamata.getValue())))
                            .retrieve()
                            .body(TcgdexApi.CartaBreve[].class),
                    "Carte non trovate su TCGdex (" + filtro.chiave() + ")"), filtro.chiave());
            Arrays.stream(risposta).forEach(carta -> carte.putIfAbsent(carta.id(), carta));
        }
        return new ArrayList<>(carte.values());
    }

    public TcgdexApi.Carta dettaglio(String id) {
        return conTentativi(() -> chiama(() -> tcgdexRestClient.get()
                        .uri("/en/cards/{id}", id)
                        .retrieve()
                        .body(TcgdexApi.Carta.class),
                "Carta " + id + " non trovata su TCGdex"), "carta " + id);
    }

    // carte: quelle arrivate, nell'ordine degli id; falliti: gli id che non sono arrivati per un errore temporaneo
    // (da riprovare). Le carte che TCGdex non ha (404) non sono né l'una né l'altra cosa: riprovando non cambia
    public record Dettagli(List<TcgdexApi.Carta> carte, List<String> falliti) {
    }

    // i dettagli in parallelo; un fallimento non ferma gli altri: chi chiama salva quelli arrivati
    public Dettagli dettagli(List<String> ids) {
        List<CompletableFuture<TcgdexApi.Carta>> richieste = ids.stream()
                .map(id -> CompletableFuture.supplyAsync(() -> dettaglio(id), dettagliExecutor))
                .toList();
        List<TcgdexApi.Carta> carte = new ArrayList<>();
        List<String> falliti = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            try {
                carte.add(richieste.get(i).join());
            } catch (RuntimeException ex) {
                Throwable causa = ex.getCause() != null ? ex.getCause() : ex;
                if (causa instanceof NotFoundException) {
                    log.warn("Carta {} elencata ma non trovata su TCGdex: saltata", ids.get(i));
                    continue;
                }
                log.warn("Carta {} non letta da TCGdex: {}", ids.get(i), causa.getMessage());
                falliti.add(ids.get(i));
            }
        }
        return new Dettagli(carte, falliti);
    }

    // ritenta solo gli errori temporanei (5xx, 429, timeout); 404 e 400 non cambiano riprovando
    private <T> T conTentativi(Supplier<T> chiamata, String descrizione) {
        for (int tentativo = 1; ; tentativo++) {
            try {
                return chiamata.get();
            } catch (ServizioEsternoException ex) {
                boolean temporaneo = !(ex.getCause() instanceof RestClientResponseException risposta)
                        || risposta.getStatusCode().is5xxServerError()
                        || risposta.getStatusCode().value() == 429;
                if (!temporaneo || tentativo >= TENTATIVI) {
                    throw ex;
                }
                long attesa = attesaBaseMs * tentativo;
                log.warn("TCGdex non disponibile ({}), tentativo {}/{} fallito, il prossimo tra {} ms: {}",
                        descrizione, tentativo, TENTATIVI, attesa, ex.getMessage());
                try {
                    Thread.sleep(attesa);
                } catch (InterruptedException interrotto) {
                    Thread.currentThread().interrupt();
                    throw ex;
                }
            }
        }
    }

    // traduce gli errori HTTP e di rete nelle eccezioni dell'applicazione. Niente log qui: il dettaglio viaggia
    // nel messaggio, e lo scrive una volta sola chi la gestisce (conTentativi, GlobalExceptionHandler)
    private <T> T chiama(Supplier<T> chiamata, String messaggioNonTrovato) {
        T risposta;
        try {
            risposta = chiamata.get();
        } catch (HttpClientErrorException.NotFound ex) {
            throw new NotFoundException(messaggioNonTrovato);
        } catch (RestClientResponseException ex) {
            String corpo = ex.getResponseBodyAsString();
            throw new ServizioEsternoException("TCGdex ha risposto " + ex.getStatusCode() + ": "
                    + (corpo.length() > 500 ? corpo.substring(0, 500) + "..." : corpo), ex);
        } catch (RestClientException ex) {
            // timeout, connessione rifiutata, risposta non deserializzabile
            throw new ServizioEsternoException("Chiamata a TCGdex fallita: " + ex.getMessage(), ex);
        }

        if (risposta == null) {
            throw new ServizioEsternoException("TCGdex ha risposto senza body", null);
        }
        return risposta;
    }
}
