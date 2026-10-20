package com.example.ecommerce.services;

import com.example.ecommerce.entities.ArtistaImportato;
import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.ArtistaResponseDTO;
import com.example.ecommerce.payloads.CarteDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.StatoCarteDTO;
import com.example.ecommerce.repositories.ArtistaImportatoRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// ElencoArtisti dal file di prova src/test/resources/artisti.json
@ExtendWith(MockitoExtension.class)
class ArtistiServiceTest {

    // dal file artisti.json dei test
    private static final List<String> GRAFIE_HIGUCHI =
            List.of("Kent Kanetsuna/Direc. Shinji Higuchi", "Shinji Higuchi + Sachiko Eba");

    private static final String CLIENT = "203.0.113.7";

    @Mock
    private OggettoRepository oggettoRepository;
    @Mock
    private ArtistaImportatoRepository artistaImportatoRepository;
    @Mock
    private CatalogoService catalogoService;

    private ArtistiService service;

    @BeforeEach
    void prepara() {
        // esecutore sincrono: l'import in background è già finito quando carte risponde
        ImportInBackground background = new ImportInBackground(Runnable::run, new LimitatoreImport(10, 1000), Clock.systemUTC());
        service = new ArtistiService(oggettoRepository, artistaImportatoRepository, catalogoService, background,
                ElencoArtisti.get());
    }

    @Test
    void slugInesistenteE404SenzaChiamate() {
        assertThatThrownBy(() -> service.carte("nessuno", 0, CLIENT)).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(catalogoService);
    }

    // gli slug sono minuscoli: un URL scritto diversamente non è un artista
    @Test
    void slugConMaiuscoleE404() {
        assertThatThrownBy(() -> service.carte("Mitsuhiro-Arita", 0, CLIENT)).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(catalogoService);
    }

    // prima apertura: la pagina al volo con la query del json, e l'import completo accodato
    @Test
    void primaAperturaPaginaAlVoloConLaQueryDelJson() {
        when(artistaImportatoRepository.findById("shinji-higuchi")).thenReturn(Optional.empty());
        when(catalogoService.paginaCarte(FiltroCarte.diArtista(GRAFIE_HIGUCHI), 0, true))
                .thenReturn(new CatalogoService.PaginaCarte(List.of(carta("Carta in coppia", null)), 5));

        CarteDTO carte = service.carte("shinji-higuchi", 0, CLIENT);

        verify(catalogoService).importaArtista(GRAFIE_HIGUCHI);
        assertThat(carte.completo()).isFalse();
        assertThat(carte.totale()).isEqualTo(5);
        assertThat(carte.carte()).extracting(OggettoResponseDTO::nome).containsExactly("Carta in coppia");
    }

    // lo sconosciuto non ha una query di pagina: alla prima apertura si aspetta lo scaricamento completo
    @Test
    void sconosciutoNonCompletoSenzaPaginaAlVolo() {
        when(artistaImportatoRepository.findById("sconosciuto")).thenReturn(Optional.empty());

        CarteDTO carte = service.carte("sconosciuto", 0, CLIENT);

        verify(catalogoService).importaSenzaArtista();
        verify(catalogoService, never()).paginaCarte(any(), anyInt(), anyBoolean());
        assertThat(carte.completo()).isFalse();
        assertThat(carte.carte()).isEmpty();
    }

    @Test
    void sconosciutoCompletoLeggeIVuoti() {
        when(artistaImportatoRepository.findById("sconosciuto")).thenReturn(Optional.of(importatoDaPoco("sconosciuto")));
        when(oggettoRepository.findSenzaArtista()).thenReturn(List.of(carta("Energia", null)));

        CarteDTO carte = service.carte("sconosciuto", 0, CLIENT);

        assertThat(carte.completo()).isTrue();
        assertThat(carte.carte()).extracting(OggettoResponseDTO::nome).containsExactly("Energia");
    }

    @Test
    void carteDallaPiuRecente() {
        when(artistaImportatoRepository.findById("mitsuhiro-arita")).thenReturn(Optional.of(importatoDaPoco("mitsuhiro-arita")));
        when(oggettoRepository.findByArtistaIn(List.of("Mitsuhiro Arita"))).thenReturn(List.of(
                carta("Charizard (Base 4/102)", LocalDate.of(1999, 1, 9)),
                carta("Pikachu (Scarlet 1/198)", LocalDate.of(2023, 3, 31))));

        List<OggettoResponseDTO> carte = service.carte("mitsuhiro-arita", 0, CLIENT).carte();

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

    private static ArtistaImportato importatoDaPoco(String slug) {
        return new ArtistaImportato(slug, Instant.now().minus(Duration.ofDays(1)));
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

    @Test
    void statoDiUnArtistaGiaImportato() {
        when(artistaImportatoRepository.findById("mitsuhiro-arita")).thenReturn(Optional.of(importatoDaPoco("mitsuhiro-arita")));

        assertThat(service.stato("mitsuhiro-arita", CLIENT)).isEqualTo(new StatoCarteDTO(true, false));
        verifyNoInteractions(catalogoService);
    }

    @Test
    void statoDiUnoSlugInesistenteE404() {
        assertThatThrownBy(() -> service.stato("nessuno", CLIENT)).isInstanceOf(NotFoundException.class);
    }
}
