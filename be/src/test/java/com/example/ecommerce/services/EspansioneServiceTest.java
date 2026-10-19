package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.EspansioneResponseDTO;
import com.example.ecommerce.repositories.EspansioneRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EspansioneServiceTest {

    @Mock
    private EspansioneRepository espansioneRepository;
    @Mock
    private OggettoRepository oggettoRepository;
    @Mock
    private PokemonTcgService pokemonTcgService;
    @Mock
    private LimitatoreImport limitatoreImport;
    @Mock
    private VariantiMaster variantiMaster;

    @InjectMocks
    private EspansioneService service;

    // vetrina vuota e pokemontcg.io giù: dopo un fallimento le visite successive rispondono subito con
    // l'errore, invece di rifare ognuna tutti i tentativi verso un'API ancora giù
    @Test
    void dopoUnaSincronizzazioneFallitaNonSiRiprovaSubito() {
        when(espansioneRepository.count()).thenReturn(0L);
        when(pokemonTcgService.sincronizzaEspansioni())
                .thenThrow(new ServizioEsternoException("pokemontcg.io ha risposto 502 BAD_GATEWAY", null));

        assertThatThrownBy(() -> service.findAll()).isInstanceOf(ServizioEsternoException.class);
        assertThatThrownBy(() -> service.findAll()).isInstanceOf(ServizioEsternoException.class);

        verify(pokemonTcgService, times(1)).sincronizzaEspansioni();
    }

    @Test
    void vetrinaVuotaSiSincronizzaAllaPrimaVisita() {
        when(espansioneRepository.count()).thenReturn(0L, 0L, 1L);
        when(pokemonTcgService.sincronizzaEspansioni()).thenReturn(1);
        Espansione base = new Espansione("base1");
        base.setNome("Base");
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(List.of(base));

        List<EspansioneResponseDTO> espansioni = service.findAll();

        assertThat(espansioni).extracting(EspansioneResponseDTO::id).containsExactly("base1");
        verify(pokemonTcgService, times(1)).sincronizzaEspansioni();
    }

    // senzaDati: il set non ha nessuna variante letta, nel master decide la rarità
    @Test
    void segnaISetSenzaDati() {
        when(espansioneRepository.count()).thenReturn(2L);
        Espansione nuovo = new Espansione("me3");
        nuovo.setNome("Perfect Order");
        Espansione vecchio = new Espansione("sv8");
        vecchio.setNome("Surging Sparks");
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(List.of(nuovo, vecchio));
        when(variantiMaster.setSenzaDati()).thenReturn(Set.of("me3"));

        assertThat(service.findAll()).extracting(EspansioneResponseDTO::senzaDati).containsExactly(true, false);
    }

    // vetrina già popolata: nessuna chiamata esterna
    @Test
    void vetrinaPopolataNonSincronizza() {
        when(espansioneRepository.count()).thenReturn(180L);

        service.findAll();

        verify(pokemonTcgService, times(0)).sincronizzaEspansioni();
    }
}
