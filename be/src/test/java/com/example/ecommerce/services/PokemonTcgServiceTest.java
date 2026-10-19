package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Variante;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.repositories.EspansioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;

import java.util.Collection;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class PokemonTcgServiceTest {

    private static final String BASE_URL = "https://api.pokemontcg.test/v2";

    // tre carte di Pikachu: la prima ha il nome composto già usato nel catalogo, la seconda e la terza
    // hanno lo stesso nome composto tra loro (stesso set e numero, id diversi)
    private static final String RISPOSTA_PIKACHU = """
            {"data": [
              {"id": "base1-58", "name": "Pikachu", "number": "58",
               "set": {"id": "base1", "name": "Base", "printedTotal": 102},
               "cardmarket": {"prices": {"trendPrice": 2.5}}, "nationalPokedexNumbers": [25]},
              {"id": "jungle-60", "name": "Pikachu", "number": "60",
               "set": {"id": "jungle", "name": "Jungle", "printedTotal": 64},
               "cardmarket": {"prices": {"trendPrice": 1.2}}, "nationalPokedexNumbers": [25]},
              {"id": "jungle-60b", "name": "Pikachu", "number": "60",
               "set": {"id": "jungle", "name": "Jungle", "printedTotal": 64},
               "cardmarket": {"prices": {"trendPrice": 1.3}}, "nationalPokedexNumbers": [25]}
            ], "page": 1, "pageSize": 100, "count": 3, "totalCount": 3}
            """;

    // due carte: la prima con le varianti di tcgplayer, la seconda senza il blocco tcgplayer
    private static final String RISPOSTA_CON_VARIANTI = """
            {"data": [
              {"id": "sv1-1", "name": "Sprigatito", "number": "1", "rarity": "Double Rare", "artist": "Mitsuhiro Arita",
               "set": {"id": "sv1", "name": "Scarlet", "printedTotal": 198},
               "tcgplayer": {"prices": {"normal": {"low": 0.1}, "reverseHolofoil": {"low": 0.2}}},
               "cardmarket": {"prices": {"trendPrice": 0.5}}},
              {"id": "sv1-2", "name": "Floragato", "number": "2",
               "set": {"id": "sv1", "name": "Scarlet", "printedTotal": 198},
               "cardmarket": {"prices": {"trendPrice": 0.6}}}
            ], "page": 1, "pageSize": 100, "count": 2, "totalCount": 2}
            """;

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

    private MockRestServiceServer pokemontcg;
    private PokemonTcgService service;

    @BeforeEach
    void prepara() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        pokemontcg = MockRestServiceServer.bindTo(builder).build();
        // TransactionTemplate vero su un transaction manager finto: esegue il codice e basta
        TransactionTemplate transazione = new TransactionTemplate(mock(PlatformTransactionManager.class));
        service = new PokemonTcgService(builder.build(), oggettoRepository, espansioneRepository, transazione);

        // lenient: la ricerca non salva espansioni, gli import sì
        lenient().when(espansioneRepository.save(any())).thenAnswer(invocazione -> invocazione.getArgument(0));
    }

    // un import in blocco controlla i nomi già usati con una sola query, non una per carta
    @Test
    void importControllaINomiConUnaSolaQuery() {
        // orderBy=id: con l'ordine di default pokemontcg.io pagina in modo instabile (vedi scaricaCarte)
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("orderBy=id"),
                        containsString("page=1"), containsString("pageSize=100"))))
                .andRespond(withSuccess(RISPOSTA_PIKACHU, MediaType.APPLICATION_JSON));
        when(oggettoRepository.findNomiPresenti(any())).thenReturn(Set.of("Pikachu (Base 58/102)"));

        PokemonTcgService.EsitoImport esito = service.importaPokemon(25);

        verify(oggettoRepository, times(1)).findNomiPresenti(nomiCercati.capture());
        verify(oggettoRepository, never()).existsByNome(anyString());
        assertThat(nomiCercati.getValue()).containsExactlyInAnyOrder("Pikachu (Base 58/102)", "Pikachu (Jungle 60/64)");

        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getNome).containsExactly(
                "Pikachu (Base 58/102) [base1-58]",
                "Pikachu (Jungle 60/64)",
                "Pikachu (Jungle 60/64) [jungle-60b]");
        assertThat(esito).isEqualTo(new PokemonTcgService.EsitoImport(3, 3, 0, 0, 2));
        pokemontcg.verify();
    }

    // pagina della vista: 24 carte nell'ordine chiesto, salvate nel catalogo come un import
    @Test
    void paginaAlVoloChiedeVentiquattroCarteESalva() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("orderBy=number"),
                        containsString("page=3"), containsString("pageSize=24"), containsString("set.id"))))
                .andRespond(withSuccess(RISPOSTA_PIKACHU.replace("\"totalCount\": 3", "\"totalCount\": 102"),
                        MediaType.APPLICATION_JSON));
        Oggetto salvato = new Oggetto();
        when(oggettoRepository.findConEspansioneByIdEsternoIn(any())).thenReturn(List.of(salvato));

        PokemonTcgService.PaginaCarte pagina = service.paginaCarte("set.id:base1", 2, "number");

        verify(oggettoRepository).saveAll(any());
        verify(oggettoRepository).findConEspansioneByIdEsternoIn(idEsterni.capture());
        assertThat(idEsterni.getValue()).containsExactlyInAnyOrder("base1-58", "jungle-60", "jungle-60b");
        assertThat(pagina.carte()).containsExactly(salvato);
        assertThat(pagina.totale()).isEqualTo(102);
        pokemontcg.verify();
    }

    // il frontend richiede la pagina ogni 3 secondi finché il set non è completo: pokemontcg.io la vede una volta
    @Test
    void paginaAlVoloRichiestaDiNuovoArrivaDallaCache() {
        pokemontcg.expect(requestTo(startsWith(BASE_URL + "/cards")))
                .andRespond(withSuccess(RISPOSTA_PIKACHU, MediaType.APPLICATION_JSON));
        when(oggettoRepository.findConEspansioneByIdEsternoIn(any())).thenReturn(List.of(new Oggetto()));

        service.paginaCarte("set.id:base1", 0, "number");
        PokemonTcgService.PaginaCarte seconda = service.paginaCarte("set.id:base1", 0, "number");

        assertThat(seconda.totale()).isEqualTo(3);
        pokemontcg.verify();
    }

    // import in background interrotto a metà: le pagine già scaricate restano salvate, il tentativo dopo riparte
    // da quelle (già presenti, si saltano) invece di buttarle
    @Test
    void importSetSalvaPaginaPerPagina() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("page=1"))))
                .andRespond(withSuccess(RISPOSTA_PIKACHU.replace("\"totalCount\": 3", "\"totalCount\": 250"),
                        MediaType.APPLICATION_JSON));
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("page=2"))))
                .andRespond(withBadRequest());

        assertThatThrownBy(() -> service.importaSet("base1")).isInstanceOf(RuntimeException.class);

        verify(oggettoRepository).saveAll(any());
        pokemontcg.verify();
    }

    // il dettaglio dell'errore viaggia nell'eccezione e lo scrive nel log una volta sola chi la gestisce
    // (GlobalExceptionHandler): il service non scrive più un ERROR a ogni tentativo
    @Test
    void erroreHttpHaIlDettaglioNelMessaggioESenzaLogNelService(CapturedOutput log) {
        // la ricerca admin: pagina 0 per noi, 1 per l'API, e senza orderBy
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("page=1"),
                        containsString("pageSize=10"), not(containsString("orderBy")))))
                .andRespond(withServerError().body("{\"error\":\"database pokemontcg in manutenzione\"}"));

        assertThatThrownBy(() -> service.cerca("pikachu", 0, 10))
                .isInstanceOf(ServizioEsternoException.class)
                .hasMessageContaining("500")
                .hasMessageContaining("database pokemontcg in manutenzione");
        assertThat(log.getOut()).doesNotContain("ERROR " + PokemonTcgService.class.getName());
    }

    @Test
    void cartaGiaNelCatalogoNonServeControllareINomi() {
        pokemontcg.expect(requestTo(startsWith(BASE_URL + "/cards")))
                .andRespond(withSuccess(RISPOSTA_PIKACHU, MediaType.APPLICATION_JSON));
        Oggetto esistente = new Oggetto("Pikachu (Base 58/102)", new java.math.BigDecimal("2.50"), null, "base1-58");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));
        when(oggettoRepository.findNomiPresenti(any())).thenReturn(Set.of("Pikachu (Base 58/102)"));

        PokemonTcgService.EsitoImport esito = service.importaPokemon(25);

        // solo i nomi delle carte nuove: quella già importata non entra nella query
        verify(oggettoRepository).findNomiPresenti(nomiCercati.capture());
        assertThat(nomiCercati.getValue()).containsExactly("Pikachu (Jungle 60/64)");
        assertThat(esito).isEqualTo(new PokemonTcgService.EsitoImport(3, 2, 1, 0, 1));
    }

    // la richiesta chiede anche tcgplayer, da cui si leggono le varianti
    private void rispondeConVarianti() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("tcgplayer"))))
                .andRespond(withSuccess(RISPOSTA_CON_VARIANTI, MediaType.APPLICATION_JSON));
    }

    @Test
    void cartaNuovaHaLeVariantiDiTcgplayer() {
        rispondeConVarianti();

        service.importaSet("sv1");

        verify(oggettoRepository).saveAll(salvati.capture());
        // senza tcgplayer la lista è vuota, non null: la carta è stata letta
        assertThat(salvati.getValue()).extracting(Oggetto::getVarianti).containsExactly(
                List.of(Variante.NORMALE, Variante.REVERSE_HOLO), List.of());
        pokemontcg.verify();
    }

    @Test
    void cartaEsistenteSenzaVariantiLeRiceve() {
        rispondeConVarianti();
        Oggetto esistente = new Oggetto("Sprigatito (Scarlet 1/198)", new java.math.BigDecimal("0.50"), null, "sv1-1");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));

        service.importaSet("sv1");

        assertThat(esistente.getVarianti()).containsExactly(Variante.NORMALE, Variante.REVERSE_HOLO);
    }

    @Test
    void cartaEsistenteConVariantiNonCambia() {
        rispondeConVarianti();
        Oggetto esistente = new Oggetto("Sprigatito (Scarlet 1/198)", new java.math.BigDecimal("0.50"), null, "sv1-1");
        esistente.setVarianti(List.of(Variante.REVERSE_HOLO));
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));

        service.importaSet("sv1");

        assertThat(esistente.getVarianti()).containsExactly(Variante.REVERSE_HOLO);
    }

    @Test
    void cartaNuovaHaLaRarita() {
        rispondeConVarianti();

        service.importaSet("sv1");

        verify(oggettoRepository).saveAll(salvati.capture());
        // senza rarità nella risposta resta '' (carta letta, nessuna indicata), non null
        assertThat(salvati.getValue()).extracting(Oggetto::getRarita).containsExactly("Double Rare", "");
        pokemontcg.verify();
    }

    @Test
    void cartaEsistenteSenzaRaritaLaRiceve() {
        rispondeConVarianti();
        Oggetto esistente = new Oggetto("Sprigatito (Scarlet 1/198)", new java.math.BigDecimal("0.50"), null, "sv1-1");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));

        service.importaSet("sv1");

        assertThat(esistente.getRarita()).isEqualTo("Double Rare");
    }

    @Test
    void cartaEsistenteConRaritaNonCambia() {
        rispondeConVarianti();
        Oggetto esistente = new Oggetto("Sprigatito (Scarlet 1/198)", new java.math.BigDecimal("0.50"), null, "sv1-1");
        esistente.setRarita("Common");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));

        service.importaSet("sv1");

        assertThat(esistente.getRarita()).isEqualTo("Common");
    }

    // la richiesta chiede anche il campo artist
    @Test
    void cartaNuovaRiceveLArtista() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("artist"))))
                .andRespond(withSuccess(RISPOSTA_CON_VARIANTI, MediaType.APPLICATION_JSON));

        service.importaSet("sv1");

        verify(oggettoRepository).saveAll(salvati.capture());
        // senza artista nella risposta resta '' (carta letta, nessuno indicato), non null
        assertThat(salvati.getValue()).extracting(Oggetto::getArtista).containsExactly("Mitsuhiro Arita", "");
        pokemontcg.verify();
    }

    @Test
    void artistaMaiLettoSiRiempie() {
        rispondeConVarianti();
        Oggetto esistente = new Oggetto("Sprigatito (Scarlet 1/198)", new java.math.BigDecimal("0.50"), null, "sv1-1");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));

        service.importaSet("sv1");

        assertThat(esistente.getArtista()).isEqualTo("Mitsuhiro Arita");
    }

    // pokemontcg.io completa gli artisti dei set recenti in ritardo: quando arriva, '' si sovrascrive
    @Test
    void artistaVuotoSiSovrascriveQuandoArriva() {
        rispondeConVarianti();
        Oggetto esistente = new Oggetto("Sprigatito (Scarlet 1/198)", new java.math.BigDecimal("0.50"), null, "sv1-1");
        esistente.setArtista("");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));

        service.importaSet("sv1");

        assertThat(esistente.getArtista()).isEqualTo("Mitsuhiro Arita");
    }

    @Test
    void artistaNotoNonSiTocca() {
        rispondeConVarianti();
        Oggetto esistente = new Oggetto("Sprigatito (Scarlet 1/198)", new java.math.BigDecimal("0.50"), null, "sv1-1");
        esistente.setArtista("Ken Sugimori");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));

        service.importaSet("sv1");

        assertThat(esistente.getArtista()).isEqualTo("Ken Sugimori");
    }

    @Test
    void artistaVuotoRestaVuotoSeLApiNonLoDa() {
        rispondeConVarianti();
        Oggetto esistente = new Oggetto("Floragato (Scarlet 2/198)", new java.math.BigDecimal("0.60"), null, "sv1-2");
        esistente.setArtista("");
        when(oggettoRepository.findByIdEsternoIn(any())).thenReturn(List.of(esistente));

        service.importaSet("sv1");

        assertThat(esistente.getArtista()).isEmpty();
    }

    // download completo: le carte del set non più restituite portano a '' anche l'artista rimasto null
    @Test
    void riempiVariantiMetteVuotoAgliArtistiMancanti() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("set.id"))))
                .andRespond(withSuccess(RISPOSTA_CON_VARIANTI, MediaType.APPLICATION_JSON));
        Oggetto sparita = new Oggetto("Carta sparita (Base 9/102)", new java.math.BigDecimal("1.00"), null, "base1-9");
        when(oggettoRepository.findCarteDaRiempireDelSet("base1")).thenReturn(List.of(sparita));

        service.riempiVarianti("base1");

        assertThat(sparita.getArtista()).isEmpty();
        pokemontcg.verify();
    }

    // pagina di risposta con le carte x-da .. x-(da+quante-1), senza artista né prezzo
    private static String paginaDiCarte(int da, int quante, long totale) {
        StringBuilder carte = new StringBuilder();
        for (int i = da; i < da + quante; i++) {
            if (carte.length() > 0) {
                carte.append(',');
            }
            carte.append("{\"id\": \"x-").append(i).append("\", \"name\": \"Carta\", \"number\": \"").append(i)
                    .append("\", \"set\": {\"id\": \"x\", \"name\": \"X\", \"printedTotal\": 500}}");
        }
        return "{\"data\": [" + carte + "], \"page\": 1, \"pageSize\": 100, \"count\": " + quante
                + ", \"totalCount\": " + totale + "}";
    }

    private void rispondePagina(int pagina, String corpo) {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("page=" + pagina + "&"))))
                .andRespond(withSuccess(corpo, MediaType.APPLICATION_JSON));
    }

    // gli artisti grandi sono 17 pagine su un'API che dà spesso 500: ogni pagina si salva appena arriva
    @Test
    void importaArtistaSalvaOgniPagina() {
        rispondePagina(1, paginaDiCarte(1, 100, 101));
        rispondePagina(2, paginaDiCarte(101, 1, 101));

        PokemonTcgService.EsitoImport esito = service.importaArtista("artist:\"Mitsuhiro Arita\"");

        verify(oggettoRepository, times(2)).saveAll(salvati.capture());
        assertThat(salvati.getAllValues()).extracting(Collection::size).containsExactly(100, 1);
        assertThat(esito.trovate()).isEqualTo(101);
        pokemontcg.verify();
    }

    @Test
    void importaArtistaErroreAMetaTieneLaPrimaPagina() {
        rispondePagina(1, paginaDiCarte(1, 100, 101));
        // 400: errore non temporaneo, nessun tentativo né attesa
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("page=2&"))))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST));

        assertThatThrownBy(() -> service.importaArtista("artist:\"Mitsuhiro Arita\""))
                .isInstanceOf(ServizioEsternoException.class);

        verify(oggettoRepository, times(1)).saveAll(salvati.capture());
        assertThat(salvati.getValue()).hasSize(100);
    }

    // la query arriva da artisti.json già verificata: si usa così com'è
    @Test
    void importaArtistaUsaLaQueryDelJson() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("q=artist%3A%22M%2Akayu%22"))))
                .andRespond(withSuccess(paginaDiCarte(1, 1, 1), MediaType.APPLICATION_JSON));

        service.importaArtista("artist:\"M*kayu\"");

        pokemontcg.verify();
    }

    // download completo delle carte senza artista: escono da Sconosciuto quelle non più restituite
    @Test
    void senzaArtistaCompletoLiberaLeCarteCheHannoUnArtista() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("-artist"))))
                .andRespond(withSuccess(paginaDiCarte(1, 2, 2), MediaType.APPLICATION_JSON));

        service.importaSenzaArtista();

        verify(oggettoRepository).liberaSenzaArtista(idEsterni.capture());
        assertThat(idEsterni.getValue()).containsExactlyInAnyOrder("x-1", "x-2");
    }

    @Test
    void senzaArtistaParzialeNonLiberaNiente() {
        rispondePagina(1, paginaDiCarte(1, 100, 150));
        rispondePagina(2, PAGINA_VUOTA);

        service.importaSenzaArtista();

        verify(oggettoRepository, never()).liberaSenzaArtista(any());
    }

    // nessuna carta è una risposta anomala, non "tutte le carte hanno ormai un artista"
    @Test
    void senzaArtistaVuotoNonLiberaNiente() {
        rispondePagina(1, PAGINA_VUOTA);

        service.importaSenzaArtista();

        verify(oggettoRepository, never()).liberaSenzaArtista(any());
    }

    // download completo: le carte del set non più restituite portano a '' anche la rarità rimasta null
    @Test
    void riempiVariantiPortaAVuotaLaRaritaDelleCarteNonPiuRestituite() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("set.id"))))
                .andRespond(withSuccess(RISPOSTA_CON_VARIANTI, MediaType.APPLICATION_JSON));
        Oggetto sparita = new Oggetto("Carta sparita (Base 9/102)", new java.math.BigDecimal("1.00"), null, "base1-9");
        when(oggettoRepository.findCarteDaRiempireDelSet("base1")).thenReturn(List.of(sparita));

        service.riempiVarianti("base1");

        assertThat(sparita.getRarita()).isEmpty();
        pokemontcg.verify();
    }

    // download parziale: la rarità resta null e il job riprova al giro dopo
    @Test
    void riempiVariantiConDownloadParzialeLasciaNullLaRarita() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("set.id"), containsString("page=1"))))
                .andRespond(withSuccess(RISPOSTA_CON_VARIANTI.replace("\"totalCount\": 2", "\"totalCount\": 5"),
                        MediaType.APPLICATION_JSON));
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("set.id"), containsString("page=2"))))
                .andRespond(withSuccess(PAGINA_VUOTA, MediaType.APPLICATION_JSON));
        Oggetto nonLetta = new Oggetto("Carta non letta (Scarlet 3/198)", new java.math.BigDecimal("1.00"), null, "sv1-3");
        lenient().when(oggettoRepository.findCarteDaRiempireDelSet("sv1")).thenReturn(List.of(nonLetta));

        service.riempiVarianti("sv1");

        assertThat(nonLetta.getRarita()).isNull();
        pokemontcg.verify();
    }

    // il job: le carte del set che pokemontcg.io non restituisce più escono dalla coda con lista vuota
    @Test
    void riempiVariantiSvuotaLeCarteNonPiuRestituite() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("set.id"))))
                .andRespond(withSuccess(RISPOSTA_CON_VARIANTI, MediaType.APPLICATION_JSON));
        Oggetto sparita = new Oggetto("Carta sparita (Base 9/102)", new java.math.BigDecimal("1.00"), null, "base1-9");
        when(oggettoRepository.findCarteDaRiempireDelSet("base1"))
                .thenReturn(List.of(sparita));

        service.riempiVarianti("base1");

        assertThat(sparita.getVarianti()).isEmpty();
        assertThat(sparita.getVarianti()).isNotNull();
        pokemontcg.verify();
    }

    // download incompleto (pokemontcg.io dice 5 carte, poi la pagina 2 arriva vuota): le carte non lette
    // restano senza varianti, così il job le riprova al giro dopo invece di segnarle per sempre
    @Test
    void riempiVariantiConDownloadParzialeNonSvuotaLeAltre() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("set.id"), containsString("page=1"))))
                .andRespond(withSuccess(RISPOSTA_CON_VARIANTI.replace("\"totalCount\": 2", "\"totalCount\": 5"),
                        MediaType.APPLICATION_JSON));
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("set.id"), containsString("page=2"))))
                .andRespond(withSuccess(PAGINA_VUOTA, MediaType.APPLICATION_JSON));
        Oggetto nonLetta = new Oggetto("Carta non letta (Scarlet 3/198)", new java.math.BigDecimal("1.00"), null, "sv1-3");
        lenient().when(oggettoRepository.findCarteDaRiempireDelSet("sv1"))
                .thenReturn(List.of(nonLetta));

        service.riempiVarianti("sv1");

        assertThat(nonLetta.getVarianti()).isNull();
        // le carte lette ricevono comunque le loro varianti
        verify(oggettoRepository).saveAll(salvati.capture());
        assertThat(salvati.getValue()).extracting(Oggetto::getVarianti).containsExactly(
                List.of(Variante.NORMALE, Variante.REVERSE_HOLO), List.of());
        pokemontcg.verify();
    }

    // nessuna carta scaricata: errore, niente cambia e il set resta in coda per il giro dopo
    @Test
    void riempiVariantiSenzaCarteLanciaENonCambiaNulla() {
        pokemontcg.expect(requestTo(allOf(startsWith(BASE_URL + "/cards"), containsString("set.id"))))
                .andRespond(withSuccess(PAGINA_VUOTA, MediaType.APPLICATION_JSON));
        Oggetto nonLetta = new Oggetto("Carta non letta (Base 9/102)", new java.math.BigDecimal("1.00"), null, "base1-9");
        lenient().when(oggettoRepository.findCarteDaRiempireDelSet("base1"))
                .thenReturn(List.of(nonLetta));

        assertThatThrownBy(() -> service.riempiVarianti("base1"))
                .isInstanceOf(ServizioEsternoException.class)
                .hasMessageContaining("base1");

        assertThat(nonLetta.getVarianti()).isNull();
        verify(oggettoRepository, never()).saveAll(any());
        pokemontcg.verify();
    }

    private static final String PAGINA_VUOTA = """
            {"data": [], "page": 1, "pageSize": 100, "count": 0, "totalCount": 0}
            """;
}
