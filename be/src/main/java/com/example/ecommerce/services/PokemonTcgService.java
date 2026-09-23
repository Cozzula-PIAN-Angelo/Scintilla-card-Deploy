package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.CartaEsternaDTO;
import com.example.ecommerce.payloads.ImportaCartaDTO;
import com.example.ecommerce.payloads.ImportaSetResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.PokemonTcgApi.Carta;
import com.example.ecommerce.payloads.PokemonTcgApi.RispostaCarta;
import com.example.ecommerce.payloads.PokemonTcgApi.RispostaRicerca;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Stream;

// niente @Transactional sui metodi pubblici: una transazione terrebbe occupata una connessione
// al DB per tutta la durata della chiamata HTTP (fino a 10 secondi). Le singole operazioni
// del repository sono già transazionali; un import simultaneo della stessa carta viene
// fermato dal vincolo UNIQUE su id_esterno (409 dall'handler globale)
@Slf4j
@Service
@RequiredArgsConstructor
public class PokemonTcgService {

    private static final int MAX_SIZE = 50;
    private static final String CAMPI_RICHIESTI = "id,name,number,rarity,set,images,cardmarket";
    private static final BigDecimal PREZZO_MASSIMO = new BigDecimal("999999.99");
    // import in blocco: le carte senza prezzo Cardmarket entrano con questo prezzo, modificabile dall'admin
    private static final BigDecimal PREZZO_RIPIEGO = new BigDecimal("1.00");
    // pagine più piccole del massimo (250): la risposta resta sotto il timeout di lettura
    private static final int PAGINA_SET = 100;
    // pokemontcg.io risponde spesso 500/502 a caso: l'import in blocco ritenta con attese crescenti
    private static final int TENTATIVI_SET = 6;
    private static final long ATTESA_BASE_MS = 1000;

    private final RestClient pokemonTcgRestClient;
    private final OggettoRepository oggettoRepository;

    public PageResponse<CartaEsternaDTO> cerca(String nome, int page, int size) {
        String nomePulito = pulisciNome(nome);
        if (nomePulito.replaceAll("[^\\p{L}\\p{N}]", "").length() < 2) {
            throw new BadRequestException("Il parametro nome è obbligatorio e deve contenere almeno 2 lettere o cifre");
        }
        if (page < 0) {
            throw new BadRequestException("Il parametro page non può essere negativo");
        }
        if (size < 1) {
            throw new BadRequestException("Il parametro size deve essere almeno 1");
        }
        int dimensione = Math.min(size, MAX_SIZE);

        // l'API esterna numera le pagine da 1, la nostra PageResponse da 0
        RispostaRicerca risposta = chiama(() -> pokemonTcgRestClient.get()
                        .uri(uri -> uri.path("/cards")
                                .queryParam("q", "{q}")
                                .queryParam("page", page + 1)
                                .queryParam("pageSize", dimensione)
                                .queryParam("select", CAMPI_RICHIESTI)
                                .build(Map.of("q", creaQuery(nomePulito))))
                        .retrieve()
                        .body(RispostaRicerca.class),
                "Ricerca non disponibile");

        List<Carta> carte = risposta.data() == null ? List.of() : risposta.data();
        List<String> idEsterni = carte.stream().map(Carta::id).toList();
        Set<String> giaImportate = idEsterni.isEmpty() ? Set.of() : oggettoRepository.findIdEsterniPresenti(idEsterni);

        List<CartaEsternaDTO> contenuto = carte.stream()
                .map(carta -> toDTO(carta, giaImportate.contains(carta.id())))
                .toList();
        int totalePagine = (int) Math.ceil((double) risposta.totalCount() / dimensione);

        return new PageResponse<>(contenuto, page, dimensione, risposta.totalCount(), totalePagine);
    }

    public OggettoResponseDTO importa(String idEsterno, ImportaCartaDTO body) {
        // controllo prima della chiamata esterna: niente richiesta inutile se la carta c'è già
        if (oggettoRepository.existsByIdEsterno(idEsterno)) {
            throw new ConflictException("La carta " + idEsterno + " è già stata importata");
        }

        RispostaCarta risposta = chiama(() -> pokemonTcgRestClient.get()
                        .uri("/cards/{id}?select={select}", idEsterno, CAMPI_RICHIESTI)
                        .retrieve()
                        .body(RispostaCarta.class),
                "Carta " + idEsterno + " non trovata su pokemontcg.io");
        Carta carta = risposta.data();

        BigDecimal prezzo = body != null && body.prezzo() != null ? body.prezzo() : prezzoSuggerito(carta);
        if (prezzo == null) {
            throw new BadRequestException("Prezzo suggerito non disponibile per questa carta: "
                    + "indica il prezzo a mano nel body, es. {\"prezzo\": 9.99}");
        }
        if (prezzo.compareTo(PREZZO_MASSIMO) > 0) {
            throw new BadRequestException("Il prezzo suggerito (" + prezzo + " €) supera il massimo di "
                    + PREZZO_MASSIMO + ": indica il prezzo a mano nel body, es. {\"prezzo\": 999.99}");
        }

        String nome = componiNome(carta);
        if (oggettoRepository.existsByNome(nome)) {
            throw new ConflictException("Esiste già un oggetto con nome '" + nome + "'");
        }

        // flush immediato: così createdAt è valorizzato nella risposta
        Oggetto oggetto = oggettoRepository.saveAndFlush(
                new Oggetto(nome, prezzo, immagineUrl(carta), carta.id()));
        return OggettoResponseDTO.from(oggetto);
    }

    // importa tutte le carte di un set (es. base1) saltando quelle già presenti nel catalogo
    public ImportaSetResponseDTO importaSet(String setId) {
        String id = setId == null ? "" : setId.trim().toLowerCase();
        if (!id.matches("[a-z0-9.-]{2,30}")) {
            throw new BadRequestException("Id del set non valido: usa l'id di pokemontcg.io, es. base1, sv1, swsh1");
        }

        List<Carta> carte = scaricaSet(id);
        if (carte.isEmpty()) {
            throw new NotFoundException("Nessuna carta trovata per il set " + id + " su pokemontcg.io");
        }

        Set<String> giaImportate = oggettoRepository.findIdEsterniPresenti(carte.stream().map(Carta::id).toList());
        Set<String> nomiUsati = new HashSet<>();
        List<Oggetto> nuovi = new ArrayList<>();
        int saltate = 0;
        int scartate = 0;

        for (Carta carta : carte) {
            String nome = componiNome(carta);
            if (giaImportate.contains(carta.id()) || !nomiUsati.add(nome) || oggettoRepository.existsByNome(nome)) {
                saltate++;
                continue;
            }
            BigDecimal prezzo = prezzoSuggerito(carta);
            if (prezzo == null) {
                prezzo = PREZZO_RIPIEGO;
            } else if (prezzo.compareTo(PREZZO_MASSIMO) > 0) {
                scartate++;
                continue;
            }
            nuovi.add(new Oggetto(nome, prezzo, immagineUrl(carta), carta.id()));
        }

        oggettoRepository.saveAll(nuovi);
        log.info("Import set {}: {} trovate, {} importate, {} saltate, {} scartate",
                id, carte.size(), nuovi.size(), saltate, scartate);
        return new ImportaSetResponseDTO(id, carte.size(), nuovi.size(), saltate, scartate);
    }

    private List<Carta> scaricaSet(String setId) {
        List<Carta> carte = new ArrayList<>();
        int pagina = 1;
        long totale;
        do {
            int numeroPagina = pagina;
            RispostaRicerca risposta = conTentativi(() -> chiama(() -> pokemonTcgRestClient.get()
                            .uri(uri -> uri.path("/cards")
                                    .queryParam("q", "{q}")
                                    .queryParam("page", numeroPagina)
                                    .queryParam("pageSize", PAGINA_SET)
                                    .queryParam("select", CAMPI_RICHIESTI)
                                    .queryParam("orderBy", "number")
                                    .build(Map.of("q", "set.id:" + setId)))
                            .retrieve()
                            .body(RispostaRicerca.class),
                    "Set " + setId + " non trovato su pokemontcg.io"), "set " + setId + " pagina " + numeroPagina);
            if (risposta.data() == null || risposta.data().isEmpty()) {
                break;
            }
            carte.addAll(risposta.data());
            totale = risposta.totalCount();
            pagina++;
        } while (carte.size() < totale);
        return carte;
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
                if (!temporaneo || tentativo >= TENTATIVI_SET) {
                    throw ex;
                }
                long attesa = ATTESA_BASE_MS * tentativo;
                log.warn("pokemontcg.io non disponibile ({}), tentativo {}/{} tra {} ms",
                        descrizione, tentativo, TENTATIVI_SET, attesa);
                try {
                    Thread.sleep(attesa);
                } catch (InterruptedException interrotto) {
                    Thread.currentThread().interrupt();
                    throw ex;
                }
            }
        }
    }

    // traduce gli errori HTTP e di rete dell'API esterna nelle eccezioni dell'applicazione
    private <T> T chiama(Supplier<T> chiamata, String messaggioNonTrovato) {
        T risposta;
        try {
            risposta = chiamata.get();
        } catch (HttpClientErrorException.NotFound ex) {
            throw new NotFoundException(messaggioNonTrovato);
        } catch (RestClientResponseException ex) {
            // 5xx, 429 (limite di richieste) e gli altri 4xx, che dipendono da configurazione o query errate
            String corpo = ex.getResponseBodyAsString();
            log.error("pokemontcg.io ha risposto {}: {}", ex.getStatusCode(),
                    corpo.length() > 500 ? corpo.substring(0, 500) + "..." : corpo);
            throw new ServizioEsternoException("Errore HTTP da pokemontcg.io", ex);
        } catch (RestClientException ex) {
            // timeout, connessione rifiutata, risposta non deserializzabile
            log.error("Chiamata a pokemontcg.io fallita", ex);
            throw new ServizioEsternoException("Chiamata a pokemontcg.io fallita", ex);
        }

        if (risposta == null) {
            log.error("pokemontcg.io ha risposto senza body");
            throw new ServizioEsternoException("Risposta vuota da pokemontcg.io", null);
        }
        return risposta;
    }

    // tiene lettere (anche accentate, es. Flabébé), cifre, spazi e i pochi segni presenti nei nomi
    // delle carte (Mr. Mime, Ho-Oh, Farfetch'd); tutto il resto, compresi i caratteri speciali
    // della sintassi di ricerca (" * : ( ) ...), viene rimosso
    private String pulisciNome(String nome) {
        if (nome == null) {
            return "";
        }
        return nome.replaceAll("[^\\p{L}\\p{N} .'\\-]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    // una sola parola semplice: ricerca per prefisso (charizard -> Charizard, Charizard ex, ...);
    // altrimenti frase tra virgolette, come richiesto dalla sintassi dell'API
    private String creaQuery(String nomePulito) {
        if (nomePulito.matches("[\\p{L}\\p{N}]+")) {
            return "name:" + nomePulito + "*";
        }
        return "name:\"" + nomePulito + "\"";
    }

    private CartaEsternaDTO toDTO(Carta carta, boolean giaImportata) {
        return new CartaEsternaDTO(
                carta.id(),
                carta.name(),
                carta.set() == null ? null : carta.set().name(),
                carta.number(),
                carta.rarity(),
                immagineUrl(carta),
                prezzoSuggerito(carta),
                giaImportata
        );
    }

    private String immagineUrl(Carta carta) {
        if (carta.images() == null) {
            return null;
        }
        String large = carta.images().large();
        return large != null && !large.isBlank() ? large : carta.images().small();
    }

    // trendPrice, altrimenti averageSellPrice; 0 o valori mancanti significano "non disponibile"
    private BigDecimal prezzoSuggerito(Carta carta) {
        if (carta.cardmarket() == null || carta.cardmarket().prices() == null) {
            return null;
        }
        return Stream.of(carta.cardmarket().prices().trendPrice(), carta.cardmarket().prices().averageSellPrice())
                .filter(Objects::nonNull)
                .filter(prezzo -> prezzo.signum() > 0)
                .findFirst()
                .map(prezzo -> prezzo.setScale(2, RoundingMode.HALF_UP))
                .orElse(null);
    }

    // es. "Charizard (Base 4/102)", oppure "Charizard (Base 4)" se il totale non è disponibile
    private String componiNome(Carta carta) {
        String espansione = carta.set() == null ? null : carta.set().name();
        String numero = carta.number();
        if (numero != null && carta.set() != null && carta.set().printedTotal() != null) {
            numero = numero + "/" + carta.set().printedTotal();
        }

        String dettaglio = Stream.of(espansione, numero)
                .filter(Objects::nonNull)
                .reduce((a, b) -> a + " " + b)
                .orElse(null);
        return dettaglio == null ? carta.name() : carta.name() + " (" + dettaglio + ")";
    }
}
