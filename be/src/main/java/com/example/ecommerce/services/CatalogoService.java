package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Variante;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.ConflictException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.CartaEsternaDTO;
import com.example.ecommerce.payloads.ImportaCartaDTO;
import com.example.ecommerce.payloads.ImportaSetResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.TcgdexApi;
import com.example.ecommerce.payloads.TcgdexApi.Carta;
import com.example.ecommerce.payloads.TcgdexApi.CartaBreve;
import com.example.ecommerce.repositories.EspansioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

// Catalogo delle carte da TCGdex: converte le carte di TcgdexClient in Oggetto e le salva.
// Niente @Transactional sui metodi pubblici: una transazione terrebbe occupata una connessione
// al DB per tutta la durata delle chiamate HTTP. Le singole operazioni del repository sono già
// transazionali; un import simultaneo della stessa carta viene fermato dal vincolo UNIQUE su
// id_esterno (409 dall'handler globale)
@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogoService {

    private static final int MAX_SIZE = 50;
    private static final BigDecimal PREZZO_MASSIMO = new BigDecimal("999999.99");
    // import in blocco: le carte senza prezzo Cardmarket entrano con questo prezzo, modificabile dall'admin
    private static final BigDecimal PREZZO_RIPIEGO = new BigDecimal("1.00");
    // dettagli chiesti e salvati a blocchi: un errore a metà non butta via quelli già salvati
    static final int BLOCCO = 24;
    // pagina della vista (la griglia ne mostra 24)
    static final int PAGINA_VISTA = 24;
    // elenchi e pagine al volo appena presi: il frontend richiede la pagina ogni 3 secondi finché lo scaricamento
    // completo non è finito, e TCGdex non deve vederla ogni volta
    private static final Duration DURATA_PAGINA = Duration.ofMinutes(5);
    private final Map<String, InMemoria<List<CartaBreve>>> elenchiRecenti = new ConcurrentHashMap<>();
    private final Map<String, InMemoria<PaginaCarte>> pagineRecenti = new ConcurrentHashMap<>();

    private final TcgdexClient tcgdex;
    private final OggettoRepository oggettoRepository;
    private final EspansioneRepository espansioneRepository;
    private final TransactionTemplate transazione;

    // un import alla volta: un set e un Pokémon importati insieme conterrebbero le stesse carte,
    // e la seconda scrittura violerebbe il vincolo UNIQUE su id_esterno
    private final Object lockScrittura = new Object();

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

        List<CartaBreve> elenco = tcgdex.elenco(FiltroCarte.perNome(nomePulito));
        List<String> fetta = elenco.stream().skip((long) page * dimensione).limit(dimensione).map(CartaBreve::id).toList();
        List<Carta> carte = fetta.isEmpty() ? List.of() : tcgdex.dettagli(fetta).carte();
        Set<String> giaImportate = fetta.isEmpty() ? Set.of() : oggettoRepository.findIdEsterniPresenti(fetta);

        List<CartaEsternaDTO> contenuto = carte.stream()
                .map(carta -> toDTO(carta, giaImportate.contains(carta.id())))
                .toList();
        int totalePagine = (int) Math.ceil((double) elenco.size() / dimensione);
        return new PageResponse<>(contenuto, page, dimensione, elenco.size(), totalePagine);
    }

    public OggettoResponseDTO importa(String idEsterno, ImportaCartaDTO body) {
        // controllo prima della chiamata esterna: niente richiesta inutile se la carta c'è già
        if (oggettoRepository.existsByIdEsterno(idEsterno)) {
            throw new ConflictException("La carta " + idEsterno + " è già stata importata");
        }

        Carta carta = tcgdex.dettaglio(idEsterno);

        BigDecimal prezzo = body != null && body.prezzo() != null ? body.prezzo() : prezzoSuggerito(carta);
        if (prezzo == null) {
            throw new BadRequestException("Prezzo suggerito non disponibile per questa carta: "
                    + "indica il prezzo a mano nel body, es. {\"prezzo\": 9.99}");
        }
        if (prezzo.compareTo(PREZZO_MASSIMO) > 0) {
            throw new BadRequestException("Il prezzo suggerito (" + prezzo + " €) supera il massimo di "
                    + PREZZO_MASSIMO + ": indica il prezzo a mano nel body, es. {\"prezzo\": 999.99}");
        }

        String nome = nomeLibero(carta, nomiOccupati(List.of(componiNome(carta))));

        // flush immediato: così createdAt è valorizzato nella risposta
        Oggetto oggetto = nuovoOggetto(carta, nome, prezzo, transazione.execute(stato -> espansioneDi(carta.set())));
        return OggettoResponseDTO.from(oggettoRepository.saveAndFlush(oggetto));
    }

    // importa tutte le carte di un set (es. sv03.5) saltando quelle già complete nel catalogo. Salva a blocchi:
    // interrotto a metà (TCGdex giù), i blocchi salvati restano e il tentativo dopo li salta
    public ImportaSetResponseDTO importaSet(String setId) {
        String id = setId == null ? "" : setId.trim().toLowerCase();
        if (!id.matches("[a-z0-9.-]{2,30}")) {
            throw new BadRequestException("Id del set non valido: usa l'id di TCGdex, es. base1, sv03.5, swsh1");
        }

        Download download = scarica(FiltroCarte.diSet(id), "set " + id);
        if (download.elenco().isEmpty()) {
            throw new NotFoundException("Nessuna carta trovata per il set " + id + " su TCGdex");
        }

        EsitoImport esito = download.esito();
        // entity gestita: al commit si scrive solo "importata" (@DynamicUpdate)
        transazione.executeWithoutResult(stato ->
                espansioneRepository.findById(id).ifPresent(espansione -> espansione.setImportata(true)));
        return new ImportaSetResponseDTO(id, esito.trovate(), esito.importate(), esito.saltate(), esito.scartate(),
                esito.rinominate());
    }

    // riempie varianti, rarità e artista delle carte di un set già importato. Passa da salvaCarte come un import,
    // quindi le carte nuove del set entrano nel catalogo; non tocca "importata". Arrivato fin qui il download è
    // completo (un dettaglio fallito lancia): le carte che TCGdex non restituisce più ricevono la lista vuota, la
    // rarità '' e l'artista '', così il job non le ripropone a ogni giro
    public void riempiVarianti(String setId) {
        Download download = scarica(FiltroCarte.diSet(setId), "set " + setId);
        if (download.elenco().isEmpty()) {
            // il set è nel catalogo: nessuna carta è una risposta anomala, non un set vuoto
            throw new ServizioEsternoException("Nessuna carta restituita da TCGdex per il set " + setId
                    + ": varianti non aggiornate", null);
        }
        transazione.executeWithoutResult(stato ->
                oggettoRepository.findCarteDaRiempireDelSet(setId).forEach(oggetto -> {
                    if (oggetto.getVarianti() == null) {
                        oggetto.setVarianti(List.of());
                    }
                    if (oggetto.getRarita() == null) {
                        oggetto.setRarita("");
                    }
                    if (oggetto.getArtista() == null) {
                        oggetto.setArtista("");
                    }
                }));
        log.info("Varianti, rarità e artisti del set {} aggiornate ({} carte)", setId, download.elenco().size());
    }

    // importa tutte le carte in cui compare un Pokémon (numero del Pokédex nazionale), da qualunque set.
    // Nessuna carta non è un errore: alcuni Pokémon non ne hanno ancora
    public EsitoImport importaPokemon(int numeroPokedex) {
        return scarica(FiltroCarte.diPokemon(numeroPokedex), "Pokémon #" + numeroPokedex).esito();
    }

    // importa tutte le carte di un artista: grafie da artisti.json, una chiamata per grafia
    public EsitoImport importaArtista(List<String> grafie) {
        return scarica(FiltroCarte.diArtista(grafie), "artista " + String.join(" | ", grafie)).esito();
    }

    // importa le carte per cui TCGdex non indica l'artista (pagina "Artista sconosciuto"). Con un download completo
    // e non vuoto, le carte che nel catalogo sono ancora '' ma non arrivano più tra quelle senza artista ne hanno
    // ricevuto uno: tornano null, così il job o la pagina del loro artista le rileggono
    public EsitoImport importaSenzaArtista() {
        Download download = scarica(FiltroCarte.senzaArtista(), "carte senza artista");
        if (!download.elenco().isEmpty()) {
            Set<String> ancoraSenza = download.elenco().stream().map(CartaBreve::id).collect(Collectors.toSet());
            Integer liberate = transazione.execute(stato -> oggettoRepository.liberaSenzaArtista(ancoraSenza));
            log.info("Carte senza artista: {} hanno ricevuto un artista", liberate);
        }
        return download.esito();
    }

    // saltate: già nel catalogo (o senza espansione nella risposta); scartate: prezzo oltre il massimo;
    // rinominate: importate con l'id di TCGdex nel nome, perché quello composto era già usato
    public record EsitoImport(int trovate, int importate, int saltate, int scartate, int rinominate) {

        static final EsitoImport NESSUNO = new EsitoImport(0, 0, 0, 0, 0);

        EsitoImport piu(EsitoImport altro) {
            return new EsitoImport(trovate + altro.trovate, importate + altro.importate, saltate + altro.saltate,
                    scartate + altro.scartate, rinominate + altro.rinominate);
        }
    }

    // carte della pagina di una vista (da 0), salvate nel catalogo come un import: così il "+", i preferiti e il
    // binder funzionano subito. piuRecenti: Pokémon e artisti, dal set più recente; altrimenti per numero (set).
    // totale = carte del filtro su TCGdex. Un dettaglio che non arriva manca dalla pagina (lo prende lo
    // scaricamento completo), e la pagina allora non si tiene in memoria
    public PaginaCarte paginaCarte(FiltroCarte filtro, int pagina, boolean piuRecenti) {
        String chiave = filtro.chiave() + "|" + pagina + "|" + piuRecenti;
        PaginaCarte recente = recente(pagineRecenti, chiave);
        if (recente != null) {
            return recente;
        }
        List<CartaBreve> elenco = recente(elenchiRecenti, filtro.chiave());
        if (elenco == null) {
            elenco = tcgdex.elenco(filtro);
            ricorda(elenchiRecenti, filtro.chiave(), elenco);
        }
        List<String> fetta = elenco.stream()
                .sorted(piuRecenti ? OrdineCarte.breviDallaPiuRecente(dataPerSet()) : OrdineCarte.breviPerNumero())
                .skip((long) pagina * PAGINA_VISTA)
                .limit(PAGINA_VISTA)
                .map(CartaBreve::id)
                .toList();
        if (fetta.isEmpty()) {
            return new PaginaCarte(List.of(), elenco.size());
        }
        TcgdexClient.Dettagli dettagli = tcgdex.dettagli(fetta);
        salvaCarte(dettagli.carte());
        Map<String, Oggetto> salvate = oggettoRepository.findConEspansioneByIdEsternoIn(fetta).stream()
                .collect(Collectors.toMap(Oggetto::getIdEsterno, Function.identity()));
        PaginaCarte presa = new PaginaCarte(fetta.stream().map(salvate::get).filter(Objects::nonNull).toList(), elenco.size());
        if (dettagli.falliti().isEmpty()) {
            ricorda(pagineRecenti, chiave, presa);
        }
        return presa;
    }

    public record PaginaCarte(List<Oggetto> carte, int totale) {
    }

    // id del set -> data d'uscita, per l'ordine delle pagine al volo (date anche null: il set è noto)
    private Map<String, LocalDate> dataPerSet() {
        Map<String, LocalDate> date = new HashMap<>();
        espansioneRepository.findAll().forEach(espansione -> date.put(espansione.getId(), espansione.getDataUscita()));
        return date;
    }

    private record InMemoria<T>(T valore, Instant presoIl) {
    }

    private static <T> T recente(Map<String, InMemoria<T>> memoria, String chiave) {
        InMemoria<T> trovato = memoria.get(chiave);
        return trovato != null && trovato.presoIl().isAfter(Instant.now().minus(DURATA_PAGINA)) ? trovato.valore() : null;
    }

    // via le scadute, così la mappa resta piccola (quello che si è visto negli ultimi minuti)
    private static <T> void ricorda(Map<String, InMemoria<T>> memoria, String chiave, T valore) {
        Instant adesso = Instant.now();
        memoria.values().removeIf(vecchio -> vecchio.presoIl().isBefore(adesso.minus(DURATA_PAGINA)));
        memoria.put(chiave, new InMemoria<>(valore, adesso));
    }

    // elenco: tutte le carte del filtro su TCGdex; esito: delle carte lette più quelle già complete (saltate)
    private record Download(List<CartaBreve> elenco, EsitoImport esito) {
    }

    // elenco completo del filtro, poi i dettagli delle sole carte che mancano nel catalogo o sono incomplete,
    // a blocchi salvati appena arrivano. Se qualche dettaglio non arriva lancia, dopo aver salvato gli altri:
    // chi chiama non segna l'import come riuscito e si riprova al giro dopo
    private Download scarica(FiltroCarte filtro, String descrizione) {
        List<CartaBreve> elenco = tcgdex.elenco(filtro);
        List<String> ids = elenco.stream().map(CartaBreve::id).toList();
        Set<String> complete = ids.isEmpty() ? Set.of() : oggettoRepository.findIdEsterniCompleti(ids);
        List<String> daLeggere = ids.stream().filter(id -> !complete.contains(id)).toList();

        EsitoImport esito = new EsitoImport(complete.size(), 0, complete.size(), 0, 0);
        List<String> falliti = new ArrayList<>();
        for (int da = 0; da < daLeggere.size(); da += BLOCCO) {
            TcgdexClient.Dettagli dettagli = tcgdex.dettagli(daLeggere.subList(da, Math.min(da + BLOCCO, daLeggere.size())));
            esito = esito.piu(salvaCarte(dettagli.carte()));
            falliti.addAll(dettagli.falliti());
        }
        log.info("Import {}: {}", descrizione, esito);
        if (!falliti.isEmpty()) {
            throw new ServizioEsternoException("Import " + descrizione + ": " + falliti.size()
                    + " carte non lette da TCGdex, si riprova più tardi", null);
        }
        return new Download(elenco, esito);
    }

    // salva le carte lette: le nuove entrano nel catalogo, quelle già presenti ricevono i dati
    // mancanti (espansione, numero, numeri di Pokédex, varianti, rarità, artista). Le carte possono venire da set diversi
    EsitoImport salvaCarte(List<Carta> carte) {
        if (carte.isEmpty()) {
            return EsitoImport.NESSUNO;
        }
        synchronized (lockScrittura) {
            return transazione.execute(stato -> {
                Map<String, Espansione> espansioni = new HashMap<>();
                Map<String, Oggetto> giaImportate = oggettoRepository.findByIdEsternoIn(carte.stream().map(Carta::id).toList())
                        .stream()
                        .collect(Collectors.toMap(Oggetto::getIdEsterno, Function.identity()));
                // nomi già nel catalogo tra quelli delle carte nuove, letti tutti insieme; nomeLibero ci
                // aggiunge man mano quelli assegnati in questo import, non ancora salvati
                Set<String> nomiUsati = nomiOccupati(carte.stream()
                        .filter(carta -> carta.set() != null && carta.set().id() != null)
                        .filter(carta -> !giaImportate.containsKey(carta.id()))
                        .map(CatalogoService::componiNome)
                        .collect(Collectors.toSet()));
                List<Oggetto> nuovi = new ArrayList<>();
                int saltate = 0;
                int scartate = 0;
                int rinominate = 0;

                for (Carta carta : carte) {
                    if (carta.set() == null || carta.set().id() == null) {
                        log.warn("Carta {} senza espansione nella risposta di TCGdex: non importata", carta.id());
                        saltate++;
                        continue;
                    }
                    Espansione espansione = espansioni.computeIfAbsent(carta.set().id(), chiave -> espansioneDi(carta.set()));
                    Oggetto esistente = giaImportate.get(carta.id());
                    if (esistente != null) {
                        completa(esistente, carta, espansione);
                        saltate++;
                        continue;
                    }
                    BigDecimal prezzo = prezzoSuggerito(carta);
                    if (prezzo == null) {
                        prezzo = PREZZO_RIPIEGO;
                    } else if (prezzo.compareTo(PREZZO_MASSIMO) > 0) {
                        log.warn("Carta {}: prezzo suggerito {} oltre il massimo, non importata", carta.id(), prezzo);
                        scartate++;
                        continue;
                    }
                    String nome = nomeLibero(carta, nomiUsati);
                    if (!nome.equals(componiNome(carta))) {
                        rinominate++;
                    }
                    nuovi.add(nuovoOggetto(carta, nome, prezzo, espansione));
                }

                oggettoRepository.saveAll(nuovi);
                return new EsitoImport(carte.size(), nuovi.size(), saltate, scartate, rinominate);
            });
        }
    }

    // entity gestita: le modifiche si salvano al commit. Si riempie solo quello che manca: i dati già noti
    // (anche corretti a mano) restano. L'artista si scrive anche sopra '': TCGdex può completarlo in ritardo
    private void completa(Oggetto esistente, Carta carta, Espansione espansione) {
        if (esistente.getEspansione() == null) {
            esistente.setEspansione(espansione);
            esistente.setNumero(numeroDaLocalId(carta.localId()));
        }
        if (esistente.getNumeriPokedex().isEmpty() && carta.dexId() != null) {
            esistente.getNumeriPokedex().addAll(carta.dexId());
        }
        if (esistente.getVarianti() == null) {
            esistente.setVarianti(Variante.daVariantiTcgdex(carta.variants()));
        }
        if (esistente.getRarita() == null) {
            esistente.setRarita(rarita(carta));
        }
        if (esistente.getArtista() == null || (esistente.getArtista().isEmpty() && carta.illustrator() != null)) {
            esistente.setArtista(artista(carta));
        }
    }

    // scarica tutti i set di TCGdex (senza TCG Pocket) e li salva; restituisce quanti sono. La chiamata HTTP sta
    // fuori dalla transazione, il salvataggio dentro: le entity restano gestite e, con @DynamicUpdate, si scrivono
    // solo i campi davvero cambiati (mai "importata")
    public int sincronizzaEspansioni() {
        List<TcgdexApi.Set> set = tcgdex.set();
        transazione.executeWithoutResult(stato -> set.forEach(dati -> espansioneRepository.save(aggiornaDa(dati))));
        return set.size();
    }

    // il simbolo si scrive solo se manca: quelli di TCGdex oggi non si caricano (400), e i set già nel catalogo
    // tengono quello che hanno
    private Espansione aggiornaDa(TcgdexApi.Set dati) {
        Espansione espansione = espansioneRepository.findById(dati.id()).orElseGet(() -> new Espansione(dati.id()));
        espansione.setNome(dati.name());
        espansione.setSerie(dati.serie() == null ? null : dati.serie().name());
        espansione.setTotaleCarte(totale(dati.cardCount()));
        espansione.setDataUscita(dataUscita(dati.releaseDate()));
        espansione.setLogoUrl(dati.logo() == null ? null : dati.logo() + ".png");
        if (espansione.getSimboloUrl() == null && dati.symbol() != null) {
            espansione.setSimboloUrl(dati.symbol() + ".png");
        }
        return espansione;
    }

    // l'espansione di una carta: quella del catalogo, oppure una nuova con i soli dati che la carta porta (nome
    // e totale; serie, data e logo arrivano con la sincronizzazione). Sempre in transazione
    private Espansione espansioneDi(TcgdexApi.SetDellaCarta dati) {
        return espansioneRepository.findById(dati.id()).orElseGet(() -> {
            Espansione nuova = new Espansione(dati.id());
            nuova.setNome(dati.name());
            nuova.setTotaleCarte(totale(dati.cardCount()));
            return espansioneRepository.save(nuova);
        });
    }

    private static Integer totale(TcgdexApi.CardCount conteggio) {
        if (conteggio == null) {
            return null;
        }
        return conteggio.total() != null ? conteggio.total() : conteggio.official();
    }

    private static LocalDate dataUscita(String testo) {
        if (testo == null || testo.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(testo);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private Oggetto nuovoOggetto(Carta carta, String nome, BigDecimal prezzo, Espansione espansione) {
        Oggetto oggetto = new Oggetto(nome, prezzo, immagineUrl(carta), carta.id());
        oggetto.setEspansione(espansione);
        oggetto.setNumero(numeroDaLocalId(carta.localId()));
        if (carta.dexId() != null) {
            oggetto.getNumeriPokedex().addAll(carta.dexId());
        }
        oggetto.setVarianti(Variante.daVariantiTcgdex(carta.variants()));
        oggetto.setRarita(rarita(carta));
        oggetto.setArtista(artista(carta));
        return oggetto;
    }

    // il numero come lo scrivevano le carte già nel catalogo: senza zeri davanti se fatto solo di cifre
    // ("006" -> "6"); le sigle con lettere ("TG01", "SV001") restano come sono
    static String numeroDaLocalId(String localId) {
        if (localId == null || !localId.matches("\\d+")) {
            return localId;
        }
        return localId.replaceFirst("^0+(?=\\d)", "");
    }

    // senza rarità (o "None", usato da TCGdex per le promo) '': carta letta, nessuna indicata
    private static String rarita(Carta carta) {
        return carta.rarity() == null || carta.rarity().equals("None") ? "" : carta.rarity();
    }

    // senza artista nella risposta '' (carta letta, nessuno indicato)
    private static String artista(Carta carta) {
        return carta.illustrator() == null ? "" : carta.illustrator();
    }

    // immagine grande di TCGdex; senza, la riserva di pokemontcg.io dal file di abbinamento; altrimenti null
    private static String immagineUrl(Carta carta) {
        if (carta.image() != null && !carta.image().isBlank()) {
            return carta.image() + "/high.webp";
        }
        return AbbinamentoTcgdex.get().riserva(carta.id()).orElse(null);
    }

    private static String immaginePiccola(Carta carta) {
        if (carta.image() != null && !carta.image().isBlank()) {
            return carta.image() + "/low.webp";
        }
        return immagineUrl(carta);
    }

    // trend di Cardmarket, altrimenti la media; 0 o valori mancanti significano "non disponibile"
    private static BigDecimal prezzoSuggerito(Carta carta) {
        if (carta.pricing() == null || carta.pricing().cardmarket() == null) {
            return null;
        }
        return Stream.of(carta.pricing().cardmarket().trend(), carta.pricing().cardmarket().avg())
                .filter(Objects::nonNull)
                .filter(prezzo -> prezzo.signum() > 0)
                .findFirst()
                .map(prezzo -> prezzo.setScale(2, RoundingMode.HALF_UP))
                .orElse(null);
    }

    // tiene lettere (anche accentate, es. Flabébé), cifre, spazi e i pochi segni presenti nei nomi
    // delle carte (Mr. Mime, Ho-Oh, Farfetch'd); tutto il resto viene rimosso
    private static String pulisciNome(String nome) {
        if (nome == null) {
            return "";
        }
        return nome.replaceAll("[^\\p{L}\\p{N} .'\\-]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static CartaEsternaDTO toDTO(Carta carta, boolean giaImportata) {
        return new CartaEsternaDTO(
                carta.id(),
                carta.name(),
                carta.set() == null ? null : carta.set().name(),
                numeroDaLocalId(carta.localId()),
                rarita(carta),
                immagineUrl(carta),
                immaginePiccola(carta),
                prezzoSuggerito(carta),
                giaImportata
        );
    }

    // Il nome dell'oggetto è unico, ma quello composto non sempre: due varianti della stessa carta con
    // stesso set e numero, o un oggetto creato a mano con quel nome. La carta entra allora col suo id di
    // TCGdex, che è unico. nomiUsati: i nomi già nel catalogo (vedi nomiOccupati) più quelli assegnati nello stesso import
    private static String nomeLibero(Carta carta, Set<String> nomiUsati) {
        String nome = componiNome(carta);
        if (nomiUsati.add(nome)) {
            return nome;
        }
        String alternativo = nome + " [" + carta.id() + "]";
        nomiUsati.add(alternativo);
        log.info("Nome '{}' già usato: la carta {} entra come '{}'", nome, carta.id(), alternativo);
        return alternativo;
    }

    // tra i nomi candidati, quelli già usati nel catalogo, con una sola query invece di una per carta.
    // Insieme modificabile: nomeLibero ci aggiunge i nomi assegnati man mano
    private Set<String> nomiOccupati(Collection<String> candidati) {
        return candidati.isEmpty() ? new HashSet<>() : new HashSet<>(oggettoRepository.findNomiPresenti(candidati));
    }

    // es. "Charizard ex (151 6/165)", oppure "Energia (Set X 1)" se il totale non è disponibile
    private static String componiNome(Carta carta) {
        String espansione = carta.set() == null ? null : carta.set().name();
        String numero = numeroDaLocalId(carta.localId());
        Integer ufficiali = carta.set() == null || carta.set().cardCount() == null ? null : carta.set().cardCount().official();
        if (numero != null && ufficiali != null) {
            numero = numero + "/" + ufficiali;
        }

        String dettaglio = Stream.of(espansione, numero)
                .filter(Objects::nonNull)
                .reduce((a, b) -> a + " " + b)
                .orElse(null);
        return dettaglio == null ? carta.name() : carta.name() + " (" + dettaglio + ")";
    }
}
