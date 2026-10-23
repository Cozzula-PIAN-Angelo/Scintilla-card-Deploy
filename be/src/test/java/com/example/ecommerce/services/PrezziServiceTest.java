package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.FasciaPrezzoDTO;
import com.example.ecommerce.payloads.PrezziCartaDTO;
import com.example.ecommerce.payloads.TcgdexApi;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrezziServiceTest {

    @Mock
    private TcgdexClient tcgdex;
    @Mock
    private OggettoRepository oggettoRepository;

    private PrezziService service;
    private final UUID id = UUID.randomUUID();

    @BeforeEach
    void prepara() {
        service = new PrezziService(tcgdex, oggettoRepository);
    }

    // il minimo è l'offerta più bassa; il massimo il più alto tra media, trend e medie a 1/7/30 giorni
    @Test
    void fasciaDaMinimoAlPiuAltoDelleMedie() {
        FasciaPrezzoDTO fascia = PrezziService.fascia(d("0.02"), d("0.05"), d("0.07"), d("0.15"), d("0.06"), d("0.06"));

        assertThat(fascia).isEqualTo(new FasciaPrezzoDTO(d("0.02"), d("0.15"), d("0.05"), d("0.06")));
    }

    // 0 e null per TCGdex vogliono dire "non disponibile"
    @Test
    void valoriMancantiOAZeroIgnorati() {
        FasciaPrezzoDTO fascia = PrezziService.fascia(BigDecimal.ZERO, null, d("1.234"), BigDecimal.ZERO, null, null);

        assertThat(fascia).isEqualTo(new FasciaPrezzoDTO(d("1.23"), d("1.23"), null, null));
    }

    // un'offerta minima sopra tutte le medie allarga la fascia invece di rovesciarla
    @Test
    void minimoSopraLeMedie() {
        FasciaPrezzoDTO fascia = PrezziService.fascia(d("5"), d("3"), d("4"), null, null, null);

        assertThat(fascia.minimo()).isEqualByComparingTo("5");
        assertThat(fascia.massimo()).isEqualByComparingTo("5");
    }

    @Test
    void senzaNessunValoreNienteFascia() {
        assertThat(PrezziService.fascia(null, BigDecimal.ZERO, null, null, null, null)).isNull();
    }

    // la Reverse prende i valori "-holo" di Cardmarket
    @Test
    void normaleEReverseDaCardmarket() {
        quandoTcgdexRisponde(new TcgdexApi.Cardmarket("2026-10-22T13:13:24.189Z", d("0.05"), d("0.07"), d("0.02"),
                d("0.15"), d("0.06"), d("0.06"), d("0.25"), d("0.28"), d("0.08"), d("0.25"), d("0.25"), d("0.26")));

        PrezziCartaDTO prezzi = service.prezzi(id);

        assertThat(prezzi.normale()).isEqualTo(new FasciaPrezzoDTO(d("0.02"), d("0.15"), d("0.05"), d("0.06")));
        assertThat(prezzi.reverse()).isEqualTo(new FasciaPrezzoDTO(d("0.08"), d("0.28"), d("0.25"), d("0.26")));
        assertThat(prezzi.aggiornatoIl()).isEqualTo("2026-10-22T13:13:24.189Z");
    }

    @Test
    void cartaSenzaCardmarket() {
        when(oggettoRepository.findById(id)).thenReturn(Optional.of(oggetto("swsh3-136")));
        when(tcgdex.dettaglio("swsh3-136")).thenReturn(carta(null));

        assertThat(service.prezzi(id)).isEqualTo(new PrezziCartaDTO(null, null, null));
    }

    // oggetti creati a mano: niente id di TCGdex, niente richiesta
    @Test
    void oggettoSenzaIdEsterno() {
        when(oggettoRepository.findById(id)).thenReturn(Optional.of(oggetto(null)));

        assertThat(service.prezzi(id)).isEqualTo(new PrezziCartaDTO(null, null, null));
        verifyNoInteractions(tcgdex);
    }

    @Test
    void cartaCheTcgdexNonHaPiu() {
        when(oggettoRepository.findById(id)).thenReturn(Optional.of(oggetto("sparita-1")));
        when(tcgdex.dettaglio("sparita-1")).thenThrow(new NotFoundException("Carta sparita-1 non trovata su TCGdex"));

        assertThat(service.prezzi(id)).isEqualTo(new PrezziCartaDTO(null, null, null));
    }

    @Test
    void oggettoInesistente() {
        when(oggettoRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.prezzi(id)).isInstanceOf(NotFoundException.class);
    }

    // aprire due volte il dettaglio della stessa carta non richiama TCGdex
    @Test
    void secondaLetturaDallaMemoria() {
        quandoTcgdexRisponde(new TcgdexApi.Cardmarket(d("0.05"), d("0.07")));

        service.prezzi(id);
        service.prezzi(id);

        verify(tcgdex, times(1)).dettaglio("swsh3-136");
    }

    private void quandoTcgdexRisponde(TcgdexApi.Cardmarket cardmarket) {
        when(oggettoRepository.findById(id)).thenReturn(Optional.of(oggetto("swsh3-136")));
        when(tcgdex.dettaglio("swsh3-136")).thenReturn(carta(new TcgdexApi.Prezzi(cardmarket)));
    }

    private static TcgdexApi.Carta carta(TcgdexApi.Prezzi prezzi) {
        return new TcgdexApi.Carta("swsh3-136", "136", "Furret", "Uncommon", null, null, null, null, null, prezzi);
    }

    private static Oggetto oggetto(String idEsterno) {
        return new Oggetto("Furret", BigDecimal.ONE, null, idEsterno);
    }

    private static BigDecimal d(String valore) {
        return new BigDecimal(valore);
    }
}
