package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.ArtistaResponseDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.repositories.ArtistaImportatoRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// ElencoArtisti dal file di prova src/test/resources/artisti.json
@ExtendWith(MockitoExtension.class)
class ArtistiServiceTest {

    private static final String CLIENT = "203.0.113.7";

    @Mock
    private OggettoRepository oggettoRepository;
    @Mock
    private ArtistaImportatoRepository artistaImportatoRepository;
    @Mock
    private PokemonTcgService pokemonTcgService;
    @Mock
    private LimitatoreImport limitatoreImport;

    private ArtistiService service;

    @BeforeEach
    void prepara() {
        service = new ArtistiService(oggettoRepository, artistaImportatoRepository, pokemonTcgService, limitatoreImport,
                ElencoArtisti.get());
    }

    @Test
    void slugInesistenteE404SenzaChiamate() {
        assertThatThrownBy(() -> service.carte("nessuno", CLIENT)).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(pokemonTcgService, limitatoreImport);
    }

    // gli slug sono minuscoli: un URL scritto diversamente non è un artista
    @Test
    void slugConMaiuscoleE404() {
        assertThatThrownBy(() -> service.carte("Mitsuhiro-Arita", CLIENT)).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(pokemonTcgService, limitatoreImport);
    }

    @Test
    void primaAperturaImportaConLaQueryDelJson() {
        when(artistaImportatoRepository.findById("shinji-higuchi")).thenReturn(Optional.empty());
        List<String> grafie = List.of("Kent Kanetsuna/Direc. Shinji Higuchi", "Shinji Higuchi + Sachiko Eba");
        when(oggettoRepository.findByArtistaIn(grafie)).thenReturn(List.of(carta("Carta in coppia", null)));

        List<OggettoResponseDTO> carte = service.carte("shinji-higuchi", CLIENT);

        verify(pokemonTcgService).importaArtista("artist:\"Shinji Higuchi\"");
        assertThat(carte).extracting(OggettoResponseDTO::nome).containsExactly("Carta in coppia");
    }

    @Test
    void sconosciutoImportaSenzaArtistaELeggeIVuoti() {
        when(artistaImportatoRepository.findById("sconosciuto")).thenReturn(Optional.empty());
        when(oggettoRepository.findSenzaArtista()).thenReturn(List.of(carta("Energia", null)));

        List<OggettoResponseDTO> carte = service.carte("sconosciuto", CLIENT);

        verify(pokemonTcgService).importaSenzaArtista();
        assertThat(carte).extracting(OggettoResponseDTO::nome).containsExactly("Energia");
    }

    @Test
    void carteDallaPiuRecente() {
        when(artistaImportatoRepository.findById("mitsuhiro-arita")).thenReturn(Optional.empty());
        when(oggettoRepository.findByArtistaIn(List.of("Mitsuhiro Arita"))).thenReturn(List.of(
                carta("Charizard (Base 4/102)", LocalDate.of(1999, 1, 9)),
                carta("Pikachu (Scarlet 1/198)", LocalDate.of(2023, 3, 31))));

        List<OggettoResponseDTO> carte = service.carte("mitsuhiro-arita", CLIENT);

        assertThat(carte).extracting(OggettoResponseDTO::nome)
                .containsExactly("Pikachu (Scarlet 1/198)", "Charizard (Base 4/102)");
    }

    @Test
    void elencoConSconosciutoInFondo() {
        List<ArtistaResponseDTO> elenco = service.elenco();

        assertThat(elenco).extracting(ArtistaResponseDTO::slug)
                .containsExactly("mitsuhiro-arita", "sachiko-eba", "shinji-higuchi", "sconosciuto");
        assertThat(elenco.getLast()).isEqualTo(new ArtistaResponseDTO("sconosciuto", "Artista sconosciuto", 12, null));
    }

    private static Oggetto carta(String nome, LocalDate uscita) {
        Oggetto carta = new Oggetto(nome, new BigDecimal("1.00"));
        if (uscita != null) {
            Espansione set = new Espansione("set-" + uscita.getYear());
            set.setDataUscita(uscita);
            carta.setEspansione(set);
        }
        carta.setNumero("1");
        return carta;
    }
}
