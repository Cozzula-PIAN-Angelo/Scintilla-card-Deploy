package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.PokemonImportato;
import com.example.ecommerce.exceptions.ServizioEsternoException;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.PokemonImportatoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PokedexServiceTest {

    private static final int PIKACHU = 25;
    private static final String CLIENT = "203.0.113.7";

    @Mock
    private OggettoRepository oggettoRepository;
    @Mock
    private PokemonImportatoRepository pokemonImportatoRepository;
    @Mock
    private PokemonTcgService pokemonTcgService;
    @Mock
    private LimitatoreImport limitatoreImport;

    @InjectMocks
    private PokedexService service;

    private Oggetto cartaSalvata;

    @BeforeEach
    void prepara() {
        // @Value non viene iniettato nei test con Mockito
        ReflectionTestUtils.setField(service, "numeroMassimo", 1025);
        cartaSalvata = new Oggetto("Pikachu (Base 58/102)", new BigDecimal("2.00"));
    }

    // aggiornamento settimanale con pokemontcg.io giù: le carte già scaricate si mostrano lo stesso
    @Test
    void aggiornamentoFallitoMostraLeCarteGiaSalvate() {
        when(pokemonImportatoRepository.findById(PIKACHU)).thenReturn(Optional.of(importatoDa(Duration.ofDays(8))));
        when(pokemonImportatoRepository.existsById(PIKACHU)).thenReturn(true);
        when(pokemonTcgService.importaPokemon(PIKACHU))
                .thenThrow(new ServizioEsternoException("Errore HTTP da pokemontcg.io", null));
        when(oggettoRepository.findByNumeroPokedex(PIKACHU)).thenReturn(List.of(cartaSalvata));

        List<OggettoResponseDTO> carte = service.carte(PIKACHU, CLIENT);

        assertThat(carte).extracting(OggettoResponseDTO::nome).containsExactly("Pikachu (Base 58/102)");
        // la data non si aggiorna: alla prossima visita si riprova a scaricare
        verify(pokemonImportatoRepository, never()).save(any());
    }

    // prima apertura: non c'è niente da mostrare, quindi l'errore arriva al client (502)
    @Test
    void primaAperturaFallitaRestituisceErrore() {
        when(pokemonImportatoRepository.findById(PIKACHU)).thenReturn(Optional.empty());
        when(pokemonImportatoRepository.existsById(PIKACHU)).thenReturn(false);
        when(pokemonTcgService.importaPokemon(PIKACHU))
                .thenThrow(new ServizioEsternoException("Errore HTTP da pokemontcg.io", null));

        assertThatThrownBy(() -> service.carte(PIKACHU, CLIENT)).isInstanceOf(ServizioEsternoException.class);
        verify(pokemonImportatoRepository, never()).save(any());
    }

    @Test
    void aggiornamentoRiuscitoSalvaLaData() {
        when(pokemonImportatoRepository.findById(PIKACHU)).thenReturn(Optional.of(importatoDa(Duration.ofDays(8))));
        when(pokemonTcgService.importaPokemon(PIKACHU)).thenReturn(new PokemonTcgService.EsitoImport(1, 0, 1, 0, 0));
        when(oggettoRepository.findByNumeroPokedex(PIKACHU)).thenReturn(List.of(cartaSalvata));

        assertThat(service.carte(PIKACHU, CLIENT)).hasSize(1);
        verify(limitatoreImport).registra(CLIENT);
        verify(pokemonImportatoRepository).save(any(PokemonImportato.class));
    }

    private PokemonImportato importatoDa(Duration fa) {
        return new PokemonImportato(PIKACHU, Instant.now().minus(fa));
    }
}
