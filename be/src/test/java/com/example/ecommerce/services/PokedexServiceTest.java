package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.PokemonImportato;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import com.example.ecommerce.repositories.PokemonImportatoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// l'import in background finisce in una coda che i test non eseguono: si vede la pagina al volo
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

    private final List<Runnable> coda = new ArrayList<>();
    private PokedexService service;
    private Oggetto cartaSalvata;

    @BeforeEach
    void prepara() {
        ImportInBackground background = new ImportInBackground(coda::add, new LimitatoreImport(10, 1000), Clock.systemUTC());
        service = new PokedexService(oggettoRepository, pokemonImportatoRepository, pokemonTcgService, background);
        // @Value non viene iniettato nei test con Mockito
        ReflectionTestUtils.setField(service, "numeroMassimo", 1025);
        cartaSalvata = new Oggetto("Pikachu (Base 58/102)", new BigDecimal("2.00"));
    }

    @Test
    void completoTutteDalDatabase() {
        when(pokemonImportatoRepository.findById(PIKACHU))
                .thenReturn(Optional.of(new PokemonImportato(PIKACHU, Instant.now().minus(Duration.ofDays(2)))));
        when(oggettoRepository.findByNumeroPokedex(PIKACHU)).thenReturn(List.of(cartaSalvata));

        CarteDTO carte = service.carte(PIKACHU, 3, CLIENT);

        assertThat(carte.completo()).isTrue();
        assertThat(carte.carte()).extracting(OggettoResponseDTO::nome).containsExactly("Pikachu (Base 58/102)");
        verify(pokemonTcgService, never()).paginaCarte(any(), anyInt(), any());
        assertThat(coda).isEmpty();
    }

    @Test
    void primaAperturaPaginaAlVoloEImportAccodato() {
        when(pokemonImportatoRepository.findById(PIKACHU)).thenReturn(Optional.empty());
        when(pokemonTcgService.paginaCarte("nationalPokedexNumbers:25", 1, "-set.releaseDate,number"))
                .thenReturn(new PokemonTcgService.PaginaCarte(List.of(cartaSalvata), 213));

        CarteDTO carte = service.carte(PIKACHU, 1, CLIENT);

        assertThat(carte.completo()).isFalse();
        assertThat(carte.totale()).isEqualTo(213);
        assertThat(carte.fallito()).isFalse();
        assertThat(carte.carte()).extracting(OggettoResponseDTO::nome).containsExactly("Pikachu (Base 58/102)");
        assertThat(coda).hasSize(1);
    }

    @Test
    void paginaNegativa400() {
        assertThatThrownBy(() -> service.carte(PIKACHU, -1, CLIENT))
                .isInstanceOf(BadRequestException.class).hasMessage("La pagina non può essere negativa");
    }

    @Test
    void numeroNonValido400() {
        assertThatThrownBy(() -> service.carte(0, 0, CLIENT)).isInstanceOf(BadRequestException.class);
    }
}
