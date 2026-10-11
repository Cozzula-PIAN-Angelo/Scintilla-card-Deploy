package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
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

    @Mock
    private OggettoRepository oggettoRepository;
    @Mock
    private EspansioneRepository espansioneRepository;
    @Captor
    private ArgumentCaptor<Collection<Oggetto>> salvati;
    @Captor
    private ArgumentCaptor<Collection<String>> nomiCercati;

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
        pokemontcg.expect(requestTo(startsWith(BASE_URL + "/cards")))
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

    // il dettaglio dell'errore viaggia nell'eccezione e lo scrive nel log una volta sola chi la gestisce
    // (GlobalExceptionHandler): il service non scrive più un ERROR a ogni tentativo
    @Test
    void erroreHttpHaIlDettaglioNelMessaggioESenzaLogNelService(CapturedOutput log) {
        pokemontcg.expect(requestTo(startsWith(BASE_URL + "/cards")))
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
}
