package com.example.ecommerce.services;

import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class RiempimentoVariantiTest {

    @Mock
    private CatalogoService catalogoService;
    @Mock
    private OggettoRepository oggettoRepository;
    @InjectMocks
    private RiempimentoVarianti riempimento;

    // primo giro dopo l'avvio (es. subito dopo la migrazione a TCGdex): tutti i set da riempire, poi il ritmo normale
    @Test
    void primoGiroPassaTuttiISet() {
        when(oggettoRepository.findSetConVariantiMancanti(RiempimentoVarianti.PRIMO_GIRO))
                .thenReturn(List.of("a1", "a2", "a3", "a4", "a5", "a6", "a7"));
        when(oggettoRepository.findSetConVariantiMancanti(5)).thenReturn(List.of());

        riempimento.esegui();
        riempimento.esegui();

        verify(catalogoService, times(7)).riempiVarianti(anyString());
        verify(oggettoRepository).findSetConVariantiMancanti(5);
    }

    // le carte dei set non importati (arrivate da Pokédex e artisti): al primo giro tutte, poi a blocchi
    @Test
    void rileggeAncheLeCarteFuoriDaiSetImportati() {
        when(oggettoRepository.findSetConVariantiMancanti(RiempimentoVarianti.PRIMO_GIRO)).thenReturn(List.of());
        when(oggettoRepository.findIdEsterniDaRiempireFuoriDaiSetImportati(RiempimentoVarianti.PRIMO_GIRO_CARTE))
                .thenReturn(List.of("base1-4", "sv1-1"));
        when(oggettoRepository.findSetConVariantiMancanti(5)).thenReturn(List.of());
        when(oggettoRepository.findIdEsterniDaRiempireFuoriDaiSetImportati(RiempimentoVarianti.CARTE_PER_GIRO))
                .thenReturn(List.of());

        riempimento.esegui();
        riempimento.esegui();

        verify(catalogoService).riempiCarte(List.of("base1-4", "sv1-1"));
        verify(catalogoService, times(1)).riempiCarte(anyList());
    }

    private void primoGiroVuoto() {
        when(oggettoRepository.findSetConVariantiMancanti(RiempimentoVarianti.PRIMO_GIRO)).thenReturn(List.of());
        lenient().when(oggettoRepository.findIdEsterniDaRiempireFuoriDaiSetImportati(anyInt())).thenReturn(List.of());
        riempimento.esegui();
    }

    @Test
    void alMassimoCinqueSetPerGiro() {
        primoGiroVuoto();
        when(oggettoRepository.findSetConVariantiMancanti(5)).thenReturn(List.of("base1", "sv1"));

        riempimento.esegui();

        verify(oggettoRepository).findSetConVariantiMancanti(5);
        verify(catalogoService).riempiVarianti("base1");
        verify(catalogoService).riempiVarianti("sv1");
    }

    @Test
    void unErroreNonFermaGliAltri(CapturedOutput log) {
        primoGiroVuoto();
        when(oggettoRepository.findSetConVariantiMancanti(5)).thenReturn(List.of("base1", "jungle", "sv1"));
        doThrow(new ServizioEsternoException("giù", null)).when(catalogoService).riempiVarianti("jungle");

        riempimento.esegui();

        verify(catalogoService).riempiVarianti("base1");
        verify(catalogoService).riempiVarianti("sv1");
        assertThat(log.getOut()).contains("WARN").contains("jungle");
    }

    @Test
    void senzaSetNonChiamaTcgdex() {
        primoGiroVuoto();
        when(oggettoRepository.findSetConVariantiMancanti(5)).thenReturn(List.of());

        riempimento.esegui();

        verifyNoInteractions(catalogoService);
    }
}
