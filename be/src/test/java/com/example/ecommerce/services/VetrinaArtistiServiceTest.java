package com.example.ecommerce.services;

import com.example.ecommerce.payloads.AnteprimaArtistaDTO;
import com.example.ecommerce.payloads.CartaAnteprimaDTO;
import com.example.ecommerce.payloads.VetrinaArtistiDTO;
import com.example.ecommerce.repositories.CartaDiArtista;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// artisti.json dei test: mitsuhiro-arita ("Mitsuhiro Arita"), sachiko-eba e shinji-higuchi (insieme in
// "Shinji Higuchi + Sachiko Eba", Higuchi anche in "Kent Kanetsuna/Direc. Shinji Higuchi")
@ExtendWith(MockitoExtension.class)
class VetrinaArtistiServiceTest {

    private static final LocalDate OGGI = LocalDate.of(2026, 10, 26);

    @Mock
    private OggettoRepository oggettoRepository;
    @InjectMocks
    private VetrinaArtistiService service;

    // sul muro solo chi ha abbastanza carte in archivio; nell'indice chiunque ne abbia almeno una
    @Test
    void sulMuroSoloChiHaAbbastanzaCarte() {
        List<CartaDiArtista> carte = new ArrayList<>(pokemon("Mitsuhiro Arita", VetrinaArtistiService.CARTE_MINIME_MURO));
        carte.add(carta("Shinji Higuchi + Sachiko Eba", "Mew", "5", "Rare", 1));
        when(oggettoRepository.findCarteConArtista()).thenReturn(carte);

        VetrinaArtistiDTO vetrina = service.calcola(OGGI);

        assertThat(vetrina.sulMuro()).extracting(AnteprimaArtistaDTO::slug).containsExactly("mitsuhiro-arita");
        assertThat(vetrina.sulMuro().getFirst().carte()).isEqualTo(727);
        assertThat(vetrina.carteIndice()).containsOnlyKeys("mitsuhiro-arita", "sachiko-eba", "shinji-higuchi");
    }

    // una carta disegnata a quattro mani conta per entrambi gli autori
    @Test
    void cartaConPiuAutoriContaPerOgnuno() {
        when(oggettoRepository.findCarteConArtista()).thenReturn(List.of(carta("Shinji Higuchi + Sachiko Eba", "Mew", "5", "Rare", 1)));

        VetrinaArtistiDTO vetrina = service.calcola(OGGI);

        assertThat(vetrina.carteIndice().get("sachiko-eba")).extracting(CartaAnteprimaDTO::nome).containsExactly("Mew");
        assertThat(vetrina.carteIndice().get("shinji-higuchi")).extracting(CartaAnteprimaDTO::nome).containsExactly("Mew");
    }

    // nell'indice le tre più preziose, un Pokémon una volta sola
    @Test
    void indiceConLeTrePiuPreziose() {
        when(oggettoRepository.findCarteConArtista()).thenReturn(List.of(
                carta("Mitsuhiro Arita", "Pikachu (Base 58/102)", "1", "Common", 1),
                carta("Mitsuhiro Arita", "Charizard", "500", "Rare Holo", 1),
                carta("Mitsuhiro Arita", "Pikachu (Jungle 60/64)", "40", "Common", 1),
                carta("Mitsuhiro Arita", "Blastoise", "300", "Rare Holo", 1),
                carta("Mitsuhiro Arita", "Venusaur", "200", "Rare Holo", 1)));

        assertThat(service.calcola(OGGI).carteIndice().get("mitsuhiro-arita"))
                .extracting(CartaAnteprimaDTO::nome).containsExactly("Charizard", "Blastoise", "Venusaur");
    }

    // per il ritaglio prima i Pokémon col riquadro classico, anche se valgono meno di allenatori e illustrazioni speciali
    @Test
    void illustrazioniPrimaIPokemonColRiquadro() {
        List<CartaAnteprimaDTO> illustrazioni = VetrinaArtistiService.illustrazioni(List.of(
                carta("Mitsuhiro Arita", "Professor Oak", "90", "Rare", 0),
                carta("Mitsuhiro Arita", "Pikachu ex", "400", "Special Illustration Rare", 1),
                carta("Mitsuhiro Arita", "Bulbasaur", "2", "Common", 1),
                carta("Mitsuhiro Arita", "Charmander", "5", "Common", 1)));

        assertThat(illustrazioni).extracting(CartaAnteprimaDTO::nome)
                .containsExactly("Charmander", "Bulbasaur", "Pikachu ex", "Professor Oak");
    }

    @Test
    void alPiuQuattroIllustrazioni() {
        assertThat(VetrinaArtistiService.illustrazioni(pokemon("Mitsuhiro Arita", 9))).hasSize(VetrinaArtistiService.ILLUSTRAZIONI);
    }

    // stessa settimana, stessa scelta; e l'archivio si rilegge al massimo una volta l'ora
    @Test
    void vetrinaRicalcolataAlPiuUnaVoltaLOra() {
        when(oggettoRepository.findCarteConArtista()).thenReturn(pokemon("Mitsuhiro Arita", VetrinaArtistiService.CARTE_MINIME_MURO));

        VetrinaArtistiDTO prima = service.vetrina();
        VetrinaArtistiDTO seconda = service.vetrina();

        assertThat(seconda).isSameAs(prima);
        verify(oggettoRepository, times(1)).findCarteConArtista();
    }

    private static List<CartaDiArtista> pokemon(String artista, int quante) {
        return IntStream.range(0, quante)
                .mapToObj(i -> carta(artista, "Pokemon " + i, String.valueOf(i + 1), "Common", 1))
                .toList();
    }

    private static CartaDiArtista carta(String artista, String nome, String prezzo, String rarita, int numeriPokedex) {
        return new Carta(artista, UUID.randomUUID(), nome, "1", rarita, "https://assets.tcgdex.net/en/base/base1/1/high.webp",
                new BigDecimal(prezzo), numeriPokedex);
    }

    private record Carta(String getArtista, UUID getId, String getNome, String getNumero, String getRarita,
                         String getImmagineUrl, BigDecimal getPrezzoMassimo, int getNumeriPokedex) implements CartaDiArtista {
    }
}
