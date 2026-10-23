package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Variante;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.CartaEsternaDTO;
import com.example.ecommerce.payloads.ImportaCartaDTO;
import com.example.ecommerce.payloads.ImportaSetResponseDTO;
import com.example.ecommerce.payloads.PageResponse;
import com.example.ecommerce.payloads.TcgdexApi;
import com.example.ecommerce.repositories.EspansioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CatalogoServiceTest {

    private static final TcgdexApi.Varianti NORMALE_E_REVERSE = new TcgdexApi.Varianti(true, true, false, false);

    @Mock
    private TcgdexClient client;
    @Mock
    private OggettoRepository oggettoRepository;
    @Mock
    private EspansioneRepository espansioneRepository;
    @Captor
    private ArgumentCaptor<Collection<Oggetto>> salvati;
    @Captor
    private ArgumentCaptor<Collection<String>> nomiCercati;
    @Captor
    private ArgumentCaptor<Collection<String>> idEsterni;
    @Captor
    private ArgumentCaptor<List<String>> idChiesti;

    private CatalogoService service;

    @BeforeEach
    void prepara() {
        // TransactionTemplate vero su un transaction manager finto: esegue il codice e basta
        TransactionTemplate transazione = new TransactionTemplate(mock(PlatformTransactionManager.class));
        service = new CatalogoService(client, oggettoRepository, espansioneRepository, transazione);
        lenient().when(espansioneRepository.save(any())).thenAnswer(invocazione -> invocazione.getArgument(0));
    }

    // carta di TCGdex con i campi che contano nei test; set e numero dall'id ("sv1-1" -> set sv1, localId 1)
    private static TcgdexApi.Carta carta(String id, String nome, String nomeSet, Integer ufficiali, TcgdexApi.Varianti varianti,
                                         String trend, String rarita, String artista) {
        String set = id.substring(0, id.lastIndexOf('-'));
        String localId = id.substring(id.lastIndexOf('-') + 1);
        TcgdexApi.Prezzi prezzi = trend == null ? null
                : new TcgdexApi.Prezzi(new TcgdexApi.Cardmarket(new BigDecimal(trend), null));
        return new TcgdexApi.Carta(id, localId, nome, rarita, artista, "https://assets.tcgdex.net/en/x/" + set + "/" + localId,
                List.of(25), new TcgdexApi.SetDellaCarta(set, nomeSet, new TcgdexApi.CardCount(null, ufficiali)), varianti, prezzi);
    }

    private static TcgdexApi.Carta carta(String id, String nome) {
        return carta(id, nome, "Scarlet", 198, NORMALE_E_REVERSE, "0.50", "Common", "Mitsuhiro Arita");
    }

    private static TcgdexApi.CartaBreve breve(TcgdexApi.Carta carta) {
        return new TcgdexApi.CartaBreve(carta.id(), carta.localId(), carta.name(), carta.image());
    }

    // l'elenco del filtro e i dettagli delle carte; gli id in "falliti" non arrivano (errore temporaneo), quelli
    // che non sono né tra le carte né tra i falliti sono le carte che TCGdex non ha (404)
    private void risponde(FiltroCarte filtro, List<TcgdexApi.Carta> carte, String... falliti) {
        lenient().when(client.elenco(filtro)).thenReturn(carte.stream().map(CatalogoServiceTest::breve).toList());
        Map<String, TcgdexApi.Carta> perId = new LinkedHashMap<>();
        carte.forEach(c -> perId.put(c.id(), c));
        List<String> nonArrivate = Arrays.asList(falliti);
        lenient().when(client.dettagli(anyList())).thenAnswer(invocazione -> {
            List<String> ids = invocazione.getArgument(0);
            return new TcgdexClient.Dettagli(
                    ids.stream().filter(perId::containsKey).filter(id -> !nonArrivate.contains(id)).map(perId::get).toList(),
                    ids.stream().filter(nonArrivate::contains).toList());
        });
    }

    private static Oggetto esistente(String nome, String idEsterno) {
        return new Oggetto(nome, new BigDecimal("0.50"), null, idEsterno);
    }

    // --- conversione

    @Test
    void numeroDaLocalId() {
        assertThat(CatalogoService.numeroDaLocalId("006")).isEqualTo("6");
        assertThat(CatalogoService.numeroDaLocalId("0")).isEqualTo("0");
        assertThat(CatalogoService.numeroDaLocalId("58")).isEqualTo("58");
        assertThat(CatalogoService.numeroDaLocalId("TG01")).isEqualTo("TG01");
        assertThat(CatalogoService.numeroDaLocalId("SV001")).isEqualTo("SV001");
        assertThat(CatalogoService.numeroDaLocalId("!")).isEqualTo("!");
        assertThat(CatalogoService.numeroDaLocalId(null)).isNull();
    }

    @Test
    void cartaNuovaConvertitaDaTcgdex() {
        TcgdexApi.Carta charizard = new TcgdexApi.Carta("sv03.5-006", "006", "Charizard ex", "Double rare", "PLANETA Mochizuki",
                "https://assets.tcgdex.net/en/sv/sv03.5/006", List.of(6),
                new TcgdexApi.SetDellaCarta("sv03.5", "151", new TcgdexApi.CardCount(207, 165)),
                new TcgdexApi.Varianti(false, false, true, false),
                new TcgdexApi.Prezzi(new TcgdexApi.Cardmarket(new BigDecimal("7.23"), new BigDecimal("8.27"))));
        risponde(FiltroCarte.diPokemon(6), List.of(charizard));

        service.importaPokemon(6);

        verify(oggettoRepository).saveAll(salvati.capture());
        Oggetto salvato = salvati.getValue().iterator().next();
        assertThat(salvato.getNome()).isEqualTo("Charizard ex (151 6/165)");
        assertThat(salvato.getNumero()).isEqualTo("6");
        assertThat(salvato.getIdEsterno()).isEqualTo("sv03.5-006");
        assertThat(salvato.getImmagineUrl()).isEqualTo("https://assets.tcgdex.net/en/sv/sv03.5/006/high.webp");
        assertThat(salvato.getPrezzo()).isEqualByComparingTo("7.23");
        assertThat(salvato.getVarianti()).containsExactly(Variante.NORMALE);
        assertThat(salvato.getRarita()).isEqualTo("Double rare");
        assertThat(salvato.getArtista()).isEqualTo("PLANETA Mochizuki");
        assertThat(salvato.getNumeriPokedex()).containsExactly(6);
        assertThat(salvato.getEspansione().getId()).isEqualTo("sv03.5");
    }

    // sm7.5-1 nel file di abbinamento dei test ha la riserva di pokemontcg.io
    @Test
    void senzaImmagineUsaLaRiservaOppureNiente() {
        TcgdexApi.Carta conRiserva = senzaImmagine(carta("sm7.5-1", "Charmander"));
        TcgdexApi.Carta senzaNiente = senzaImmagine(carta("sm7.5-2", "Charmeleon"));
        risponde(FiltroCarte.diSet("sm7.5"), List.of(conRiserva, senzaNiente));

        service.importaSet("sm7.5");

        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getImmagineUrl)
                .containsExactly("/immagini/carte/sm7.5-1.webp", null);
    }

    private static TcgdexApi.Carta senzaImmagine(TcgdexApi.Carta c) {
        return new TcgdexApi.Carta(c.id(), c.localId(), c.name(), c.rarity(), c.illustrator(), null, c.dexId(), c.set(),
                c.variants(), c.pricing());
    }

    @Test
    void prezzoTrendPoiMediaPoiRipiego() {
        TcgdexApi.Carta conTrend = carta("sv1-1", "Uno");
        TcgdexApi.Carta conMedia = new TcgdexApi.Carta("sv1-2", "2", "Due", "Common", "A", null, List.of(), conTrend.set(),
                NORMALE_E_REVERSE, new TcgdexApi.Prezzi(new TcgdexApi.Cardmarket(BigDecimal.ZERO, new BigDecimal("0.6"))));
        TcgdexApi.Carta senzaPrezzi = carta("sv1-3", "Tre", "Scarlet", 198, NORMALE_E_REVERSE, null, "Common", "A");
        risponde(FiltroCarte.diSet("sv1"), List.of(conTrend, conMedia, senzaPrezzi));

        service.importaSet("sv1");

        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getPrezzo)
                .usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("0.50"), new BigDecimal("0.60"), new BigDecimal("1.00"));
    }

    @Test
    void importSingoloSenzaPrezzoChiedeIlPrezzo() {
        when(client.dettaglio("sv1-3")).thenReturn(carta("sv1-3", "Tre", "Scarlet", 198, NORMALE_E_REVERSE, null, "Common", "A"));

        assertThatThrownBy(() -> service.importa("sv1-3", null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("prezzo");
    }

    // risposta di TCGdex senza espansione: errore del servizio esterno (502), non un 500
    @Test
    void importSingoloSenzaSetEErroreEsterno() {
        TcgdexApi.Carta senzaSet = new TcgdexApi.Carta("xx-1", "1", "Energia", null, null, null, null, null, null, null);
        when(client.dettaglio("xx-1")).thenReturn(senzaSet);

        assertThatThrownBy(() -> service.importa("xx-1", new ImportaCartaDTO(BigDecimal.ONE)))
                .isInstanceOf(ServizioEsternoException.class)
                .hasMessageContaining("xx-1");
        verify(oggettoRepository, never()).saveAndFlush(any());
    }

    // Review Focus 4: dettaglio a cui mancano i blocchi facoltativi
    @Test
    void dettaglioSenzaCampiNonSiRompe() {
        TcgdexApi.Carta spoglia = new TcgdexApi.Carta("xx-1", "1", "Energia", null, null, null, null,
                new TcgdexApi.SetDellaCarta("xx", "Set X", null), null, null);
        risponde(FiltroCarte.diSet("xx"), List.of(spoglia));

        service.importaSet("xx");

        verify(oggettoRepository).saveAll(salvati.capture());
        Oggetto salvato = salvati.getValue().iterator().next();
        assertThat(salvato.getNome()).isEqualTo("Energia (Set X 1)");
        assertThat(salvato.getVarianti()).isEmpty();
        assertThat(salvato.getNumeriPokedex()).isEmpty();
        assertThat(salvato.getPrezzo()).isEqualByComparingTo("1.00");
        assertThat(salvato.getImmagineUrl()).isNull();
        assertThat(salvato.getRarita()).isEmpty();
        assertThat(salvato.getArtista()).isEmpty();
    }

    @Test
    void raritaNoneDiventaVuota() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno", "Scarlet", 198, NORMALE_E_REVERSE, "0.5", "None", "A")));

        service.importaSet("sv1");

        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getRarita).containsExactly("");
    }

    // TCGdex scrive "Rare" per le holo dei set vecchi (Charizard del Set Base): se la carta esiste solo holo è una
    // "Rare Holo", come la chiamava pokemontcg.io, e il frontend le dà l'effetto olografico
    @Test
    void rareSoloHoloDiventaRareHolo() {
        TcgdexApi.Varianti soloHolo = new TcgdexApi.Varianti(false, false, true, true);
        TcgdexApi.Varianti normaleEHolo = new TcgdexApi.Varianti(true, false, true, false);
        risponde(FiltroCarte.diSet("base1"), List.of(
                carta("base1-4", "Charizard", "Base", 102, soloHolo, "300", "Rare", "Mitsuhiro Arita"),
                carta("base1-5", "Clefairy", "Base", 102, normaleEHolo, "10", "Rare", "Ken Sugimori"),
                carta("base1-6", "Gyarados", "Base", 102, soloHolo, "20", "Common", "Ken Sugimori")));

        service.importaSet("base1");

        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getRarita).containsExactly("Rare Holo", "Rare", "Common");
    }

    // carte fuori dai set importati (arrivate da Pokédex e artisti) da rileggere: dettagli a blocchi, quelle che non
    // arrivano restano da leggere senza fermare le altre
    @Test
    void riempiCarteLeggeIDettagliESalva() {
        List<TcgdexApi.Carta> trenta = IntStream.rangeClosed(1, 30).mapToObj(i -> carta("sv1-" + i, "Carta " + i)).toList();
        risponde(FiltroCarte.diSet("sv1"), trenta, "sv1-30");

        int lette = service.riempiCarte(trenta.stream().map(TcgdexApi.Carta::id).toList());

        verify(oggettoRepository, times(2)).saveAll(salvati.capture());
        assertThat(salvati.getAllValues()).extracting(Collection::size).containsExactly(24, 5);
        assertThat(lette).isEqualTo(29);
    }

    // una carta che TCGdex non ha più (404) riceve i valori vuoti, così il job non la ripropone a ogni giro;
    // una fallita per un errore temporaneo resta da leggere
    @Test
    void riempiCarteSegnaLeCarteCheTcgdexNonHaPiu() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno")), "sv1-2");
        Oggetto sparita = esistente("Sparita", "sv1-3");
        sparita.setArtista("Già letto");
        // la stessa query serve anche a salvaCarte per la carta arrivata
        when(oggettoRepository.findByIdEsternoIn(any())).thenAnswer(invocazione ->
                invocazione.<Collection<String>>getArgument(0).contains("sv1-3") ? List.of(sparita) : List.of());

        int lette = service.riempiCarte(List.of("sv1-1", "sv1-2", "sv1-3"));

        assertThat(lette).isEqualTo(1);
        verify(oggettoRepository).findByIdEsternoIn(List.of("sv1-3"));
        assertThat(sparita.getVarianti()).isEmpty();
        assertThat(sparita.getRarita()).isEmpty();
        assertThat(sparita.getArtista()).isEqualTo("Già letto");
    }

    // --- minimo e massimo di Cardmarket (valore del binder come fascia)

    // pezzo vero di swsh3-136: normale da 0,02 a 0,15, reverse ("-holo") da 0,08 a 0,28
    private static final TcgdexApi.Cardmarket CARDMARKET = new TcgdexApi.Cardmarket("2026-10-22T13:13:24.189Z",
            new BigDecimal("0.05"), new BigDecimal("0.07"), new BigDecimal("0.02"), new BigDecimal("0.15"),
            new BigDecimal("0.06"), new BigDecimal("0.06"), new BigDecimal("0.25"), new BigDecimal("0.28"),
            new BigDecimal("0.08"), new BigDecimal("0.25"), new BigDecimal("0.25"), new BigDecimal("0.26"));

    private static TcgdexApi.Carta conPrezzi(TcgdexApi.Carta carta, TcgdexApi.Cardmarket cardmarket) {
        return new TcgdexApi.Carta(carta.id(), carta.localId(), carta.name(), carta.rarity(), carta.illustrator(),
                carta.image(), carta.dexId(), carta.set(), carta.variants(), new TcgdexApi.Prezzi(cardmarket));
    }

    @Test
    void importSalvaMinimoEMassimo() {
        risponde(FiltroCarte.diPokemon(25), List.of(conPrezzi(carta("sv1-1", "Uno"), CARDMARKET)));

        service.importaPokemon(25);

        verify(oggettoRepository).saveAll(salvati.capture());
        Oggetto salvato = salvati.getValue().iterator().next();
        assertThat(salvato.getPrezzoMinimo()).isEqualByComparingTo("0.02");
        assertThat(salvato.getPrezzoMassimo()).isEqualByComparingTo("0.15");
        assertThat(salvato.getPrezzoMinimoReverse()).isEqualByComparingTo("0.08");
        assertThat(salvato.getPrezzoMassimoReverse()).isEqualByComparingTo("0.28");
        assertThat(salvato.getPrezziAggiornatiIl()).isNotNull();
    }

    // senza prezzi di Cardmarket: letti comunque (la data c'è), valori vuoti
    @Test
    void importSenzaCardmarketLasciaVuoto() {
        risponde(FiltroCarte.diPokemon(25), List.of(carta("sv1-1", "Uno", "Scarlet", 198, NORMALE_E_REVERSE, null, "Common", "A")));

        service.importaPokemon(25);

        verify(oggettoRepository).saveAll(salvati.capture());
        Oggetto salvato = salvati.getValue().iterator().next();
        assertThat(salvato.getPrezzoMinimo()).isNull();
        assertThat(salvato.getPrezzoMassimoReverse()).isNull();
        assertThat(salvato.getPrezziAggiornatiIl()).isNotNull();
    }

    // un massimo oltre la colonna (numeric 8,2) si salva vuoto: la carta entra lo stesso
    @Test
    void massimoOltreIlTettoSalvatoVuoto() {
        risponde(FiltroCarte.diPokemon(25), List.of(conPrezzi(carta("sv1-1", "Uno"),
                new TcgdexApi.Cardmarket(new BigDecimal("5"), new BigDecimal("1000000")))));

        service.importaPokemon(25);

        verify(oggettoRepository).saveAll(salvati.capture());
        Oggetto salvato = salvati.getValue().iterator().next();
        assertThat(salvato.getPrezzo()).isEqualByComparingTo("5");
        assertThat(salvato.getPrezzoMinimo()).isEqualByComparingTo("5");
        assertThat(salvato.getPrezzoMassimo()).isNull();
    }

    // carte già nel catalogo rilette: i prezzi solo se mai letti, e il prezzo singolo non cambia
    @Test
    void completaScriveIPrezziSoloSeMaiLetti() {
        risponde(FiltroCarte.diSet("sv1"), List.of(conPrezzi(carta("sv1-1", "Uno"), CARDMARKET),
                conPrezzi(carta("sv1-2", "Due"), CARDMARKET)));
        Oggetto maiLetta = esistente("Uno", "sv1-1");
        Oggetto giaLetta = esistente("Due", "sv1-2");
        giaLetta.setPrezzoMinimo(new BigDecimal("9.00"));
        giaLetta.setPrezziAggiornatiIl(Instant.parse("2026-10-20T10:00:00Z"));
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(maiLetta, giaLetta));

        service.riempiCarte(List.of("sv1-1", "sv1-2"));

        assertThat(maiLetta.getPrezzoMinimo()).isEqualByComparingTo("0.02");
        assertThat(maiLetta.getPrezzoMassimoReverse()).isEqualByComparingTo("0.28");
        assertThat(maiLetta.getPrezziAggiornatiIl()).isNotNull();
        assertThat(maiLetta.getPrezzo()).isEqualByComparingTo("0.50");
        assertThat(giaLetta.getPrezzoMinimo()).isEqualByComparingTo("9.00");
        assertThat(giaLetta.getPrezziAggiornatiIl()).isEqualTo(Instant.parse("2026-10-20T10:00:00Z"));
    }

    // rinfresco settimanale delle carte nei binder: valori, data e anche il prezzo singolo (trend)
    @Test
    void rinfrescaPrezziAggiornaValoriDataEPrezzo() {
        risponde(FiltroCarte.diSet("sv1"), List.of(conPrezzi(carta("sv1-1", "Uno"), CARDMARKET)));
        Oggetto vecchia = esistente("Uno", "sv1-1");
        vecchia.setPrezzoMinimo(new BigDecimal("9.00"));
        vecchia.setPrezziAggiornatiIl(Instant.parse("2026-10-01T10:00:00Z"));
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(vecchia));

        int arrivate = service.rinfrescaPrezzi(List.of("sv1-1"));

        assertThat(arrivate).isEqualTo(1);
        assertThat(vecchia.getPrezzoMinimo()).isEqualByComparingTo("0.02");
        assertThat(vecchia.getPrezzoMassimoReverse()).isEqualByComparingTo("0.28");
        assertThat(vecchia.getPrezzo()).isEqualByComparingTo("0.05");
        assertThat(vecchia.getPrezziAggiornatiIl()).isAfter(Instant.parse("2026-10-01T10:00:00Z"));
    }

    // carta che TCGdex non ha più (404): solo la data, così il giro dopo non la ripropone
    @Test
    void rinfrescaPrezziSegnaLeSparite() {
        risponde(FiltroCarte.diSet("sv1"), List.of());
        Oggetto sparita = esistente("Sparita", "sv1-3");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(sparita));

        int arrivate = service.rinfrescaPrezzi(List.of("sv1-3"));

        assertThat(arrivate).isZero();
        assertThat(sparita.getPrezziAggiornatiIl()).isNotNull();
        assertThat(sparita.getPrezzoMinimo()).isNull();
        assertThat(sparita.getPrezzo()).isEqualByComparingTo("0.50");
    }

    // errore temporaneo: la carta resta com'era e si riprova al giro dopo
    @Test
    void rinfrescaPrezziLasciaLeFallite() {
        risponde(FiltroCarte.diSet("sv1"), List.of(), "sv1-2");
        Oggetto fallita = esistente("Fallita", "sv1-2");
        fallita.setPrezziAggiornatiIl(Instant.parse("2026-10-01T10:00:00Z"));
        lenient().when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(fallita));

        service.rinfrescaPrezzi(List.of("sv1-2"));

        assertThat(fallita.getPrezziAggiornatiIl()).isEqualTo(Instant.parse("2026-10-01T10:00:00Z"));
    }

    // --- nomi (come con pokemontcg.io)

    // un import in blocco controlla i nomi già usati con una sola query, non una per carta
    @Test
    void importControllaINomiConUnaSolaQuery() {
        risponde(FiltroCarte.diPokemon(25), List.of(
                carta("base1-58", "Pikachu", "Base", 102, null, "2.5", "Common", "A"),
                carta("jungle-60", "Pikachu", "Jungle", 64, null, "1.2", "Common", "A"),
                new TcgdexApi.Carta("jungle-60b", "60", "Pikachu", "Common", "A", null, List.of(25),
                        new TcgdexApi.SetDellaCarta("jungle", "Jungle", new TcgdexApi.CardCount(null, 64)), null, null)));
        when(oggettoRepository.findNomiPresenti(any())).thenReturn(Set.of("Pikachu (Base 58/102)"));

        CatalogoService.EsitoImport esito = service.importaPokemon(25);

        verify(oggettoRepository, times(1)).findNomiPresenti(nomiCercati.capture());
        verify(oggettoRepository, never()).existsByNome(anyString());
        assertThat(nomiCercati.getValue()).containsExactlyInAnyOrder("Pikachu (Base 58/102)", "Pikachu (Jungle 60/64)");
        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getNome).containsExactly(
                "Pikachu (Base 58/102) [base1-58]",
                "Pikachu (Jungle 60/64)",
                "Pikachu (Jungle 60/64) [jungle-60b]");
        assertThat(esito).isEqualTo(new CatalogoService.EsitoImport(3, 3, 0, 0, 2));
    }

    @Test
    void cartaGiaNelCatalogoNonServeControllareINomi() {
        risponde(FiltroCarte.diPokemon(25), List.of(
                carta("base1-58", "Pikachu", "Base", 102, null, "2.5", "Common", "A"),
                carta("jungle-60", "Pikachu", "Jungle", 64, null, "1.2", "Common", "A")));
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente("Pikachu (Base 58/102)", "base1-58")));

        CatalogoService.EsitoImport esito = service.importaPokemon(25);

        verify(oggettoRepository).findNomiPresenti(nomiCercati.capture());
        assertThat(nomiCercati.getValue()).containsExactly("Pikachu (Jungle 60/64)");
        assertThat(esito).isEqualTo(new CatalogoService.EsitoImport(2, 1, 1, 0, 0));
    }

    // --- varianti, rarità e artista delle carte già presenti

    @Test
    void cartaNuovaHaLeVariantiDiTcgdex() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno"),
                carta("sv1-2", "Due", "Scarlet", 198, null, "0.5", "Common", "A")));

        service.importaSet("sv1");

        verify(oggettoRepository).saveAll(salvati.capture());
        // senza variants la lista è vuota, non null: la carta è stata letta
        assertThat(salvati.getValue()).extracting(Oggetto::getVarianti).containsExactly(
                List.of(Variante.NORMALE, Variante.REVERSE_HOLO), List.of());
    }

    @Test
    void cartaEsistenteSenzaVariantiRaritaEArtistaLiRiceve() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno")));
        Oggetto vecchia = esistente("Uno (Scarlet 1/198)", "sv1-1");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(vecchia));

        service.importaSet("sv1");

        assertThat(vecchia.getVarianti()).containsExactly(Variante.NORMALE, Variante.REVERSE_HOLO);
        assertThat(vecchia.getRarita()).isEqualTo("Common");
        assertThat(vecchia.getArtista()).isEqualTo("Mitsuhiro Arita");
    }

    @Test
    void cartaEsistenteConDatiNonCambia() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno")));
        Oggetto vecchia = esistente("Uno (Scarlet 1/198)", "sv1-1");
        vecchia.setVarianti(List.of(Variante.REVERSE_HOLO));
        vecchia.setRarita("Rare");
        vecchia.setArtista("Ken Sugimori");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(vecchia));

        service.importaSet("sv1");

        assertThat(vecchia.getVarianti()).containsExactly(Variante.REVERSE_HOLO);
        assertThat(vecchia.getRarita()).isEqualTo("Rare");
        assertThat(vecchia.getArtista()).isEqualTo("Ken Sugimori");
    }

    @Test
    void artistaVuotoSiSovrascriveQuandoArriva() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno")));
        Oggetto vecchia = esistente("Uno (Scarlet 1/198)", "sv1-1");
        vecchia.setArtista("");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(vecchia));

        service.importaSet("sv1");

        assertThat(vecchia.getArtista()).isEqualTo("Mitsuhiro Arita");
    }

    // --- scaricamento completo

    @Test
    void scaricamentoChiedeSoloLeCarteMancanti() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno"), carta("sv1-2", "Due"), carta("sv1-3", "Tre")));
        when(oggettoRepository.findIdEsterniCompleti(any())).thenReturn(Set.of("sv1-2"));

        ImportaSetResponseDTO esito = service.importaSet("sv1");

        verify(client).dettagli(idChiesti.capture());
        assertThat(idChiesti.getValue()).containsExactly("sv1-1", "sv1-3");
        assertThat(esito.trovate()).isEqualTo(3);
        assertThat(esito.saltate()).isEqualTo(1);
    }

    // a blocchi di 24: un errore a metà non butta via i blocchi già salvati
    @Test
    void importaArtistaSalvaABlocchiDiVentiquattro() {
        List<TcgdexApi.Carta> trenta = IntStream.rangeClosed(1, 30).mapToObj(i -> carta("x-" + i, "Carta " + i)).toList();
        risponde(FiltroCarte.diArtista(List.of("Mitsuhiro Arita")), trenta);

        CatalogoService.EsitoImport esito = service.importaArtista(List.of("Mitsuhiro Arita"));

        verify(oggettoRepository, times(2)).saveAll(salvati.capture());
        assertThat(salvati.getAllValues()).extracting(Collection::size).containsExactly(24, 6);
        assertThat(esito.trovate()).isEqualTo(30);
    }

    @Test
    void dettaglioFallitoSalvaGliAltriELancia() {
        risponde(FiltroCarte.diArtista(List.of("A")), List.of(carta("x-1", "Uno"), carta("x-2", "Due")), "x-2");

        assertThatThrownBy(() -> service.importaArtista(List.of("A")))
                .isInstanceOf(ServizioEsternoException.class)
                .hasMessageContaining("1 carte");

        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getIdEsterno).containsExactly("x-1");
    }

    @Test
    void dettaglioFallitoNonSegnaImportato() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno"), carta("sv1-2", "Due")), "sv1-2");
        Espansione set = new Espansione("sv1");
        lenient().when(espansioneRepository.findById("sv1")).thenReturn(Optional.of(set));

        assertThatThrownBy(() -> service.importaSet("sv1")).isInstanceOf(ServizioEsternoException.class);

        assertThat(set.isImportata()).isFalse();
    }

    @Test
    void importaSetCompletoSegnaImportato() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno")));
        Espansione set = new Espansione("sv1");
        when(espansioneRepository.findById("sv1")).thenReturn(Optional.of(set));

        service.importaSet("sv1");

        assertThat(set.isImportata()).isTrue();
    }

    // Review Focus 5: dopo la migrazione un id di pokemontcg.io non trova niente su TCGdex
    @Test
    void importaSetConIdVecchio() {
        when(client.elenco(FiltroCarte.diSet("sv3pt5"))).thenReturn(List.of());

        assertThatThrownBy(() -> service.importaSet("sv3pt5"))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("sv3pt5");
        verify(oggettoRepository, never()).saveAll(any());
    }

    @Test
    void importaSetConIdNonValido() {
        assertThatThrownBy(() -> service.importaSet("sv1; drop")).isInstanceOf(BadRequestException.class);
    }

    // --- riempimento delle varianti (job)

    @Test
    void riempiVariantiSvuotaLeCarteNonPiuRestituite() {
        risponde(FiltroCarte.diSet("base1"), List.of(carta("base1-1", "Uno")));
        Oggetto sparita = esistente("Carta sparita (Base 9/102)", "base1-9");
        when(oggettoRepository.findCarteDaRiempireDelSet("base1")).thenReturn(List.of(sparita));

        service.riempiVarianti("base1");

        assertThat(sparita.getVarianti()).isNotNull().isEmpty();
        assertThat(sparita.getRarita()).isEmpty();
        assertThat(sparita.getArtista()).isEmpty();
    }

    // download incompleto: le carte non lette restano null, il job le riprova al giro dopo
    @Test
    void riempiVariantiConDettaglioFallitoNonSvuotaLeAltre() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno"), carta("sv1-2", "Due")), "sv1-2");
        Oggetto nonLetta = esistente("Carta non letta (Scarlet 3/198)", "sv1-3");
        lenient().when(oggettoRepository.findCarteDaRiempireDelSet("sv1")).thenReturn(List.of(nonLetta));

        assertThatThrownBy(() -> service.riempiVarianti("sv1")).isInstanceOf(ServizioEsternoException.class);

        assertThat(nonLetta.getVarianti()).isNull();
        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getIdEsterno).containsExactly("sv1-1");
    }

    @Test
    void riempiVariantiSenzaCarteLanciaENonCambiaNulla() {
        when(client.elenco(FiltroCarte.diSet("base1"))).thenReturn(List.of());
        Oggetto nonLetta = esistente("Carta non letta (Base 9/102)", "base1-9");
        lenient().when(oggettoRepository.findCarteDaRiempireDelSet("base1")).thenReturn(List.of(nonLetta));

        assertThatThrownBy(() -> service.riempiVarianti("base1"))
                .isInstanceOf(ServizioEsternoException.class)
                .hasMessageContaining("base1");

        assertThat(nonLetta.getVarianti()).isNull();
        verify(oggettoRepository, never()).saveAll(any());
    }

    // --- carte senza artista

    @Test
    void senzaArtistaCompletoLiberaLeCarteCheHannoUnArtista() {
        risponde(FiltroCarte.senzaArtista(), List.of(carta("x-1", "Uno"), carta("x-2", "Due")));

        service.importaSenzaArtista();

        verify(oggettoRepository).liberaSenzaArtista(idEsterni.capture());
        assertThat(idEsterni.getValue()).containsExactlyInAnyOrder("x-1", "x-2");
    }

    @Test
    void senzaArtistaConDettaglioFallitoNonLiberaNiente() {
        risponde(FiltroCarte.senzaArtista(), List.of(carta("x-1", "Uno"), carta("x-2", "Due")), "x-2");

        assertThatThrownBy(() -> service.importaSenzaArtista()).isInstanceOf(ServizioEsternoException.class);

        verify(oggettoRepository, never()).liberaSenzaArtista(any());
    }

    // nessuna carta è una risposta anomala, non "tutte le carte hanno ormai un artista"
    @Test
    void senzaArtistaVuotoNonLiberaNiente() {
        when(client.elenco(FiltroCarte.senzaArtista())).thenReturn(List.of());

        service.importaSenzaArtista();

        verify(oggettoRepository, never()).liberaSenzaArtista(any());
    }

    // --- set

    @Test
    void sincronizzaConvertiISetETieneIlSimboloSalvato() {
        Espansione salvata = new Espansione("me04");
        salvata.setSimboloUrl("https://images.pokemontcg.io/me4/symbol.png");
        when(espansioneRepository.findById("me04")).thenReturn(Optional.of(salvata));
        when(client.set()).thenReturn(List.of(
                new TcgdexApi.Set("me04", "Chaos Rising", "2026-05-22", "https://assets.tcgdex.net/en/me/me04/logo",
                        "https://assets.tcgdex.net/univ/me/me04/symbol", new TcgdexApi.Serie("me", "Mega Evolution"),
                        new TcgdexApi.CardCount(122, 86)),
                new TcgdexApi.Set("me05", "Pitch Black", null, null, "https://assets.tcgdex.net/univ/me/me05/symbol",
                        new TcgdexApi.Serie("me", "Mega Evolution"), new TcgdexApi.CardCount(null, 84))));

        assertThat(service.sincronizzaEspansioni()).isEqualTo(2);

        assertThat(salvata.getNome()).isEqualTo("Chaos Rising");
        assertThat(salvata.getSerie()).isEqualTo("Mega Evolution");
        assertThat(salvata.getDataUscita()).isEqualTo(LocalDate.of(2026, 5, 22));
        assertThat(salvata.getTotaleCarte()).isEqualTo(122);
        assertThat(salvata.getLogoUrl()).isEqualTo("https://assets.tcgdex.net/en/me/me04/logo.png");
        assertThat(salvata.getSimboloUrl()).isEqualTo("https://images.pokemontcg.io/me4/symbol.png");
        ArgumentCaptor<Espansione> nuove = ArgumentCaptor.forClass(Espansione.class);
        verify(espansioneRepository, times(2)).save(nuove.capture());
        Espansione nuova = nuove.getAllValues().get(1);
        assertThat(nuova.getTotaleCarte()).isEqualTo(84);
        assertThat(nuova.getDataUscita()).isNull();
        assertThat(nuova.getLogoUrl()).isNull();
        // i simboli di TCGdex non si caricano: senza copia locale il set resta senza
        assertThat(nuova.getSimboloUrl()).isNull();
    }

    // 59 set su TCGdex non hanno logo (30th, Temporal Forces, promo...): senza copia locale resta quello salvato
    @Test
    void sincronizzaTieneIlLogoSalvatoSeTcgdexNonLoHa() {
        Espansione salvata = new Espansione("sv05");
        salvata.setLogoUrl("https://images.pokemontcg.io/sv5/logo.png");
        when(espansioneRepository.findById("sv05")).thenReturn(Optional.of(salvata));
        when(client.set()).thenReturn(List.of(new TcgdexApi.Set("sv05", "Temporal Forces", "2024-03-22", null, null,
                new TcgdexApi.Serie("me", "Mega Evolution"), new TcgdexApi.CardCount(161, 128))));

        service.sincronizzaEspansioni();

        assertThat(salvata.getLogoUrl()).isEqualTo("https://images.pokemontcg.io/sv5/logo.png");
    }

    // logo e simbolo copiati in fe/public (abbinamento-id.json): il simbolo locale vince sempre (quelli di TCGdex
    // non si caricano), il logo locale solo se TCGdex non ne ha
    @Test
    void sincronizzaUsaLogoESimboloLocali() {
        Espansione trenta = new Espansione("30th");
        trenta.setLogoUrl("https://images.scrydex.com/pokemon/me55-logo/logo");
        Espansione centocinquantuno = new Espansione("sv03.5");
        centocinquantuno.setSimboloUrl("https://images.pokemontcg.io/sv3pt5/symbol.png");
        when(espansioneRepository.findById("30th")).thenReturn(Optional.of(trenta));
        when(espansioneRepository.findById("sv03.5")).thenReturn(Optional.of(centocinquantuno));
        when(client.set()).thenReturn(List.of(
                new TcgdexApi.Set("30th", "30th Celebration", "2026-09-16", null, null, new TcgdexApi.Serie("me", "Mega Evolution"),
                        new TcgdexApi.CardCount(161, 128)),
                new TcgdexApi.Set("sv03.5", "151", "2023-09-22", "https://assets.tcgdex.net/en/sv/sv03.5/logo",
                        "https://assets.tcgdex.net/univ/sv/sv03.5/symbol", new TcgdexApi.Serie("sv", "Scarlet & Violet"),
                        new TcgdexApi.CardCount(207, 165))));

        service.sincronizzaEspansioni();

        assertThat(trenta.getLogoUrl()).isEqualTo("/immagini/set/30th-logo.webp");
        assertThat(centocinquantuno.getLogoUrl()).isEqualTo("https://assets.tcgdex.net/en/sv/sv03.5/logo.png");
        assertThat(centocinquantuno.getSimboloUrl()).isEqualTo("/immagini/set/sv03.5-simbolo.webp");
    }

    // la carta porta solo id, nome e totali del set: un set già nel catalogo non perde serie, data e logo
    @Test
    void cartaNonRovinaIlSetGiaSalvato() {
        Espansione salvata = new Espansione("sv1");
        salvata.setSerie("Scarlet & Violet");
        salvata.setDataUscita(LocalDate.of(2023, 3, 31));
        lenient().when(espansioneRepository.findById("sv1")).thenReturn(Optional.of(salvata));
        risponde(FiltroCarte.diPokemon(25), List.of(carta("sv1-1", "Uno")));

        service.importaPokemon(25);

        assertThat(salvata.getSerie()).isEqualTo("Scarlet & Violet");
        assertThat(salvata.getDataUscita()).isEqualTo(LocalDate.of(2023, 3, 31));
    }

    // --- pagine al volo

    // le carte salvate tornano dal database in un ordine qualunque: la pagina le rimette nell'ordine della fetta
    private void salvateTornanoAlContrario() {
        when(oggettoRepository.findConEspansioneByIdEsternoIn(any())).thenAnswer(invocazione -> {
            List<Oggetto> trovate = new ArrayList<>();
            for (String id : invocazione.<Collection<String>>getArgument(0)) {
                trovate.addFirst(esistente("Carta " + id, id));
            }
            return trovate;
        });
    }

    private static Espansione set(String id, int anno) {
        Espansione espansione = new Espansione(id);
        espansione.setDataUscita(LocalDate.of(anno, 1, 1));
        return espansione;
    }

    @Test
    void paginaDiUnSetInOrdineNaturale() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-10", "Dieci"), carta("sv1-TG01", "Galleria"),
                carta("sv1-2", "Due"), carta("sv1-001", "Uno")));
        salvateTornanoAlContrario();

        CatalogoService.PaginaCarte pagina = service.paginaCarte(FiltroCarte.diSet("sv1"), 0, false);

        assertThat(pagina.carte()).extracting(Oggetto::getIdEsterno).containsExactly("sv1-001", "sv1-2", "sv1-10", "sv1-TG01");
        assertThat(pagina.totale()).isEqualTo(4);
    }

    @Test
    void paginaDiUnPokemonDalSetPiuRecente() {
        when(espansioneRepository.findAll()).thenReturn(List.of(set("base1", 1999), set("me05", 2026), set("sv03.5", 2023),
                set("tk-ex-latia", 2004), set("tk", 2010)));
        risponde(FiltroCarte.diPokemon(25), List.of(carta("base1-58", "Pikachu"), carta("tk-ex-latia-1", "Pikachu"),
                carta("me05-030", "Pikachu"), carta("sv03.5-025", "Pikachu"), carta("ignoto-1", "Pikachu")));
        salvateTornanoAlContrario();

        CatalogoService.PaginaCarte pagina = service.paginaCarte(FiltroCarte.diPokemon(25), 0, true);

        // tk-ex-latia-1 è del set tk-ex-latia (2004), non di tk (2010); senza set noto in fondo
        assertThat(pagina.carte()).extracting(Oggetto::getIdEsterno)
                .containsExactly("me05-030", "sv03.5-025", "tk-ex-latia-1", "base1-58", "ignoto-1");
    }

    @Test
    void totaleELunghezzaDellElenco() {
        risponde(FiltroCarte.diSet("sv1"), IntStream.rangeClosed(1, 30).mapToObj(i -> carta("sv1-" + i, "Carta " + i)).toList());
        salvateTornanoAlContrario();

        CatalogoService.PaginaCarte pagina = service.paginaCarte(FiltroCarte.diSet("sv1"), 1, false);

        verify(client).dettagli(idChiesti.capture());
        assertThat(idChiesti.getValue()).containsExactly("sv1-25", "sv1-26", "sv1-27", "sv1-28", "sv1-29", "sv1-30");
        assertThat(pagina.carte()).hasSize(6);
        assertThat(pagina.totale()).isEqualTo(30);
    }

    // Review Focus 3
    @Test
    void paginaOltreLUltimaEVuotaSenzaDettagli() {
        risponde(FiltroCarte.diSet("sv1"), IntStream.rangeClosed(1, 30).mapToObj(i -> carta("sv1-" + i, "Carta " + i)).toList());

        CatalogoService.PaginaCarte pagina = service.paginaCarte(FiltroCarte.diSet("sv1"), 99, false);

        assertThat(pagina.carte()).isEmpty();
        assertThat(pagina.totale()).isEqualTo(30);
        verify(client, never()).dettagli(anyList());
    }

    // il frontend chiede la pagina ogni 3 secondi finché lo scaricamento non è finito: TCGdex vede l'elenco una
    // volta, e la stessa pagina non si richiede
    @Test
    void elencoEPagineInCache() {
        risponde(FiltroCarte.diSet("sv1"), IntStream.rangeClosed(1, 30).mapToObj(i -> carta("sv1-" + i, "Carta " + i)).toList());
        salvateTornanoAlContrario();

        service.paginaCarte(FiltroCarte.diSet("sv1"), 0, false);
        service.paginaCarte(FiltroCarte.diSet("sv1"), 1, false);
        service.paginaCarte(FiltroCarte.diSet("sv1"), 0, false);

        verify(client, times(1)).elenco(FiltroCarte.diSet("sv1"));
        verify(client, times(2)).dettagli(anyList());
    }

    // Pokémon e artisti: le date dei set si leggono una volta per l'elenco, non a ogni pagina
    @Test
    void dateDeiSetLetteUnaVoltaPerElenco() {
        when(espansioneRepository.findAll()).thenReturn(List.of(set("sv1", 2023)));
        risponde(FiltroCarte.diPokemon(25), IntStream.rangeClosed(1, 30).mapToObj(i -> carta("sv1-" + i, "Pikachu")).toList());
        salvateTornanoAlContrario();

        service.paginaCarte(FiltroCarte.diPokemon(25), 0, true);
        service.paginaCarte(FiltroCarte.diPokemon(25), 1, true);

        verify(espansioneRepository, times(1)).findAll();
        verify(client, times(1)).elenco(FiltroCarte.diPokemon(25));
    }

    @Test
    void dettaglioFallitoEsceSenzaQuellaCarta() {
        risponde(FiltroCarte.diSet("sv1"), List.of(carta("sv1-1", "Uno"), carta("sv1-2", "Due")), "sv1-2");
        // nel catalogo c'è solo la carta arrivata
        when(oggettoRepository.findConEspansioneByIdEsternoIn(any())).thenReturn(List.of(esistente("Uno", "sv1-1")));

        CatalogoService.PaginaCarte pagina = service.paginaCarte(FiltroCarte.diSet("sv1"), 0, false);

        assertThat(pagina.carte()).extracting(Oggetto::getIdEsterno).containsExactly("sv1-1");
        assertThat(pagina.totale()).isEqualTo(2);
    }

    // --- ricerca dell'admin

    @Test
    void cercaRestituisceLaFettaChiestaConLImmaginePiccola() {
        List<TcgdexApi.Carta> carte = new ArrayList<>(IntStream.rangeClosed(1, 5).mapToObj(i -> carta("sv1-" + i, "Pikachu")).toList());
        risponde(FiltroCarte.perNome("pikachu"), carte);
        when(oggettoRepository.findIdEsterniPresenti(any())).thenReturn(Set.of("sv1-3"));

        PageResponse<CartaEsternaDTO> pagina = service.cerca("pikachu", 1, 2);

        assertThat(pagina.content()).extracting(CartaEsternaDTO::idEsterno).containsExactly("sv1-3", "sv1-4");
        assertThat(pagina.content()).extracting(CartaEsternaDTO::giaImportata).containsExactly(true, false);
        assertThat(pagina.content().getFirst().immagineUrlPiccola()).isEqualTo("https://assets.tcgdex.net/en/x/sv1/3/low.webp");
        assertThat(pagina.totalElements()).isEqualTo(5);
        assertThat(pagina.totalPages()).isEqualTo(3);
    }

    @Test
    void cercaRifiutaNomiTroppoCorti() {
        assertThatThrownBy(() -> service.cerca("a", 0, 10)).isInstanceOf(BadRequestException.class);
    }
}
