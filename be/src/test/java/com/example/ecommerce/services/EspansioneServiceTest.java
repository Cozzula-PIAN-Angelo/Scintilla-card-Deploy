package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.EspansioneResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.StatoCarteDTO;
import com.example.ecommerce.repositories.EspansioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EspansioneServiceTest {

    @Mock
    private EspansioneRepository espansioneRepository;
    @Mock
    private OggettoRepository oggettoRepository;
    @Mock
    private CatalogoService catalogoService;
    @Mock
    private AllineamentoNomi allineamentoNomi;

    // l'import in background finisce in una coda che i test non eseguono
    private final List<Runnable> coda = new ArrayList<>();
    private EspansioneService service;

    @BeforeEach
    void prepara() {
        ImportInBackground background = new ImportInBackground(coda::add, new LimitatoreImport(10, 1000), Clock.systemUTC());
        service = new EspansioneService(espansioneRepository, oggettoRepository, catalogoService, background,
                allineamentoNomi);
    }

    // vetrina vuota e pokemontcg.io giù: dopo un fallimento le visite successive rispondono subito con
    // l'errore, invece di rifare ognuna tutti i tentativi verso un'API ancora giù
    @Test
    void dopoUnaSincronizzazioneFallitaNonSiRiprovaSubito() {
        when(espansioneRepository.count()).thenReturn(0L);
        when(catalogoService.sincronizzaEspansioni())
                .thenThrow(new ServizioEsternoException("pokemontcg.io ha risposto 502 BAD_GATEWAY", null));

        assertThatThrownBy(() -> service.findAll()).isInstanceOf(ServizioEsternoException.class);
        assertThatThrownBy(() -> service.findAll()).isInstanceOf(ServizioEsternoException.class);

        verify(catalogoService, times(1)).sincronizzaEspansioni();
    }

    @Test
    void vetrinaVuotaSiSincronizzaAllaPrimaVisita() {
        when(espansioneRepository.count()).thenReturn(0L, 0L, 1L);
        when(catalogoService.sincronizzaEspansioni()).thenReturn(1);
        Espansione base = new Espansione("base1");
        base.setNome("Base");
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(List.of(base));

        List<EspansioneResponseDTO> espansioni = service.findAll();

        assertThat(espansioni).extracting(EspansioneResponseDTO::id).containsExactly("base1");
        verify(catalogoService, times(1)).sincronizzaEspansioni();
        // la visita aspetta solo i set: i nomi delle carte li allinea la sincronizzazione notturna
        verifyNoInteractions(allineamentoNomi);
    }

    // all'avvio e ogni notte: prima i set (nome e carte ufficiali servono ai nomi), poi i nomi delle carte
    @Test
    void sincronizzaAllineaINomiDopoISet() {
        service.sincronizza();

        InOrder ordine = inOrder(catalogoService, allineamentoNomi);
        ordine.verify(catalogoService).sincronizzaEspansioni();
        ordine.verify(allineamentoNomi).allinea();
    }

    // TCGdex giù per l'elenco delle carte: i set sono già salvati, si riprova la notte dopo
    @Test
    void allineamentoFallitoNonFermaLaSincronizzazione() {
        when(allineamentoNomi.allinea()).thenThrow(new ServizioEsternoException("TCGdex ha risposto 502 BAD_GATEWAY", null));

        service.sincronizza();

        verify(catalogoService).sincronizzaEspansioni();
    }

    // vetrina già popolata: nessuna chiamata esterna
    @Test
    void vetrinaPopolataNonSincronizza() {
        when(espansioneRepository.count()).thenReturn(180L);

        service.findAll();

        verify(catalogoService, times(0)).sincronizzaEspansioni();
    }

    @Test
    void setCompletoNonChiamaPokemontcg() {
        when(espansioneRepository.findById("sv8")).thenReturn(Optional.of(set("sv8", true)));
        when(oggettoRepository.findByEspansioneId("sv8")).thenReturn(List.of(carta("10"), carta("2")));

        CarteDTO carte = service.carte("sv8", 3, "1.2.3.4");

        assertThat(carte.completo()).isTrue();
        assertThat(carte.carte()).extracting(OggettoResponseDTO::nome).containsExactly("Carta 2", "Carta 10");
        verify(catalogoService, never()).paginaCarte(any(), anyInt(), anyBoolean());
        assertThat(coda).isEmpty();
    }

    @Test
    void primaAperturaPaginaAlVoloEImportAccodato() {
        when(espansioneRepository.findById("sv8")).thenReturn(Optional.of(set("sv8", false)));
        when(catalogoService.paginaCarte(FiltroCarte.diSet("sv8"), 0, false))
                .thenReturn(new CatalogoService.PaginaCarte(List.of(carta("2"), carta("1")), 252));

        CarteDTO carte = service.carte("sv8", null, "1.2.3.4");

        assertThat(carte.completo()).isFalse();
        assertThat(carte.totale()).isEqualTo(252);
        assertThat(carte.carte()).extracting(OggettoResponseDTO::nome).containsExactly("Carta 1", "Carta 2");
        assertThat(coda).hasSize(1);
    }

    @Test
    void dueAperturePerUnSoloImport() {
        when(espansioneRepository.findById("sv8")).thenReturn(Optional.of(set("sv8", false)));
        when(catalogoService.paginaCarte(eq(FiltroCarte.diSet("sv8")), anyInt(), eq(false)))
                .thenReturn(new CatalogoService.PaginaCarte(List.of(carta("1")), 252));

        service.carte("sv8", 0, "1.2.3.4");
        service.carte("sv8", 1, "5.6.7.8");

        assertThat(coda).hasSize(1);
    }

    // set annunciato ma ancora senza carte: vuoto e completo, e per qualche ora niente più chiamate
    @Test
    void setAnnunciatoSenzaCarte() {
        when(espansioneRepository.findById("me6")).thenReturn(Optional.of(set("me6", false)));
        when(catalogoService.paginaCarte(FiltroCarte.diSet("me6"), 0, false)).thenReturn(new CatalogoService.PaginaCarte(List.of(), 0));

        CarteDTO prima = service.carte("me6", 0, "1.2.3.4");
        CarteDTO dopo = service.carte("me6", 0, "1.2.3.4");

        assertThat(prima.completo()).isTrue();
        assertThat(prima.carte()).isEmpty();
        assertThat(dopo.completo()).isTrue();
        verify(catalogoService, times(1)).paginaCarte(any(), anyInt(), anyBoolean());
        // niente scaricamento completo di un set vuoto (fallirebbe e consumerebbe il limite)
        assertThat(coda).isEmpty();
    }

    @Test
    void paginaNegativa400() {
        when(espansioneRepository.findById("sv8")).thenReturn(Optional.of(set("sv8", false)));

        assertThatThrownBy(() -> service.carte("sv8", -1, "1.2.3.4"))
                .isInstanceOf(BadRequestException.class).hasMessage("La pagina non può essere negativa");
    }

    // descrizione della hero: spazi tolti, vuota = nessuna
    @Test
    void descrizioneSenzaSpaziEVuotaLaToglie() {
        Espansione set = set("me05", true);
        when(espansioneRepository.findById("me05")).thenReturn(Optional.of(set));
        when(espansioneRepository.save(set)).thenReturn(set);

        assertThat(service.modificaDescrizione("me05", "  Il set del buio.  ").descrizione()).isEqualTo("Il set del buio.");
        assertThat(service.modificaDescrizione("me05", "   ").descrizione()).isNull();
    }

    @Test
    void descrizioneDiUnSetCheNonCe() {
        when(espansioneRepository.findById("nessuno")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.modificaDescrizione("nessuno", "x")).isInstanceOf(NotFoundException.class);
    }

    private static Espansione set(String id, boolean importata) {
        Espansione set = new Espansione(id);
        set.setNome(id);
        set.setImportata(importata);
        return set;
    }

    private static Oggetto carta(String numero) {
        Oggetto carta = new Oggetto("Carta " + numero, BigDecimal.ONE);
        carta.setNumero(numero);
        return carta;
    }

    // stato leggero per il controllo ogni 3 secondi del frontend: niente pagine, niente chiamate esterne
    @Test
    void statoDiUnSetImportatoECompleto() {
        when(espansioneRepository.findById("sv8")).thenReturn(Optional.of(set("sv8", true)));

        assertThat(service.stato("sv8", "1.2.3.4")).isEqualTo(new StatoCarteDTO(true, false));
        verifyNoInteractions(catalogoService);
    }

    // scaricamento fermo (pausa dopo un errore finita, o server riavviato): il controllo dello stato lo rilancia,
    // una volta sola, senza chiamare pokemontcg.io nella richiesta
    @Test
    void statoRilanciaLoScaricamentoFermo() {
        when(espansioneRepository.findById("sv8")).thenReturn(Optional.of(set("sv8", false)));

        assertThat(service.stato("sv8", "1.2.3.4")).isEqualTo(new StatoCarteDTO(false, false));
        service.stato("sv8", "1.2.3.4");

        verifyNoInteractions(catalogoService);
        assertThat(coda).hasSize(1);
    }
}
