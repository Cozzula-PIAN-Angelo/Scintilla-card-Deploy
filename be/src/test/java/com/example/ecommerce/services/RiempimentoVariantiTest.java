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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith({MockitoExtension.class, OutputCaptureExtension.class})
class RiempimentoVariantiTest {

    @Mock
    private PokemonTcgService pokemonTcgService;
    @Mock
    private OggettoRepository oggettoRepository;
    @InjectMocks
    private RiempimentoVarianti riempimento;

    @Test
    void alMassimoCinqueSetPerGiro() {
        when(oggettoRepository.findSetConVariantiMancanti(5)).thenReturn(List.of("base1", "sv1"));

        riempimento.esegui();

        verify(oggettoRepository).findSetConVariantiMancanti(5);
        verify(pokemonTcgService).riempiVarianti("base1");
        verify(pokemonTcgService).riempiVarianti("sv1");
    }

    @Test
    void unErroreNonFermaGliAltri(CapturedOutput log) {
        when(oggettoRepository.findSetConVariantiMancanti(5)).thenReturn(List.of("base1", "jungle", "sv1"));
        doThrow(new ServizioEsternoException("giù", null)).when(pokemonTcgService).riempiVarianti("jungle");

        riempimento.esegui();

        verify(pokemonTcgService).riempiVarianti("base1");
        verify(pokemonTcgService).riempiVarianti("sv1");
        assertThat(log.getOut()).contains("WARN").contains("jungle");
    }

    @Test
    void senzaSetNonChiamaPokemontcg() {
        when(oggettoRepository.findSetConVariantiMancanti(5)).thenReturn(List.of());

        riempimento.esegui();

        verifyNoInteractions(pokemonTcgService);
    }
}
