package com.example.ecommerce.services;

import com.example.ecommerce.entities.CartaSimboloArtista;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.AnteprimaArtistaDTO;
import com.example.ecommerce.payloads.CartaAnteprimaDTO;
import com.example.ecommerce.payloads.CartaSimboloDTO;
import com.example.ecommerce.payloads.VetrinaArtistiDTO;
import com.example.ecommerce.repositories.CartaDiArtista;
import com.example.ecommerce.repositories.CartaSimboloArtistaRepository;
import com.example.ecommerce.repositories.OggettoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
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
    @Mock
    private CartaSimboloArtistaRepository cartaSimboloRepository;
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

        assertThat(vetrina.carteIndice().get("sachiko-eba")).containsExactly(immagine("Mew"));
        assertThat(vetrina.carteIndice().get("shinji-higuchi")).containsExactly(immagine("Mew"));
    }

    // nell'indice le immagini delle tre più preziose, un Pokémon una volta sola
    @Test
    void indiceConLeTrePiuPreziose() {
        when(oggettoRepository.findCarteConArtista()).thenReturn(List.of(
                carta("Mitsuhiro Arita", "Pikachu (Base 58/102)", "1", "Common", 1),
                carta("Mitsuhiro Arita", "Charizard", "500", "Rare Holo", 1),
                carta("Mitsuhiro Arita", "Pikachu (Jungle 60/64)", "40", "Common", 1),
                carta("Mitsuhiro Arita", "Blastoise", "300", "Rare Holo", 1),
                carta("Mitsuhiro Arita", "Venusaur", "200", "Rare Holo", 1)));

        assertThat(service.calcola(OGGI).carteIndice().get("mitsuhiro-arita"))
                .containsExactly(immagine("Charizard"), immagine("Blastoise"), immagine("Venusaur"));
    }

    // sul muro prima le carte da collezionista (illustrazioni rare o carte da almeno 20 €), per valore; le
    // illustrazioni contano anche se costano poco; allenatori ed energie normali in fondo anche se valgono tanto
    @Test
    void illustrazioniPrimaLeCarteDaCollezionista() {
        List<CartaAnteprimaDTO> illustrazioni = VetrinaArtistiService.illustrazioni(List.of(
                carta("Mitsuhiro Arita", "Professor Oak", "90", "Rare", 0),
                carta("Mitsuhiro Arita", "Bulbasaur", "15", "Common", 1),
                carta("Mitsuhiro Arita", "Pikachu", "3", "Illustration rare", 1),
                carta("Mitsuhiro Arita", "Charizard", "250", "Rare Holo", 1),
                carta("Mitsuhiro Arita", "Squirtle", "1", "Common", 1)), null);

        assertThat(illustrazioni).extracting(CartaAnteprimaDTO::nome)
                .containsExactly("Charizard", "Pikachu", "Bulbasaur", "Squirtle");
    }

    // la carta scelta dall'admin va prima di tutte, anche se vale poco
    @Test
    void illustrazioniPrimaLaCartaSceltaDallAdmin() {
        List<CartaAnteprimaDTO> illustrazioni = VetrinaArtistiService.illustrazioni(List.of(
                carta("Mitsuhiro Arita", "Charizard", "250", "Rare Holo", 1),
                carta("Mitsuhiro Arita", "Squirtle", "1", "Common", 1)), "id-Squirtle");

        assertThat(illustrazioni).extracting(CartaAnteprimaDTO::nome).containsExactly("Squirtle", "Charizard");
    }

    @Test
    void sulMuroLaCartaSceltaDallAdmin() {
        List<CartaDiArtista> carte = new ArrayList<>(pokemon("Mitsuhiro Arita", VetrinaArtistiService.CARTE_MINIME_MURO));
        when(oggettoRepository.findCarteConArtista()).thenReturn(carte);
        when(cartaSimboloRepository.findAll()).thenReturn(List.of(new CartaSimboloArtista("mitsuhiro-arita", "id-Pokemon 0", null)));

        assertThat(service.calcola(OGGI).sulMuro().getFirst().illustrazioni().getFirst().nome()).isEqualTo("Pokemon 0");
    }

    @Test
    void alPiuQuattroIllustrazioni() {
        assertThat(VetrinaArtistiService.illustrazioni(pokemon("Mitsuhiro Arita", 9), null)).hasSize(VetrinaArtistiService.ILLUSTRAZIONI);
    }

    // chi supera le carte minime a metà settimana non rimescola il muro: gli altri restano nello stesso ordine
    @Test
    void muroDellaSettimanaNonSiRimescolaQuandoArrivaQualcuno() {
        List<CartaDiArtista> due = new ArrayList<>(pokemon("Mitsuhiro Arita", VetrinaArtistiService.CARTE_MINIME_MURO));
        due.addAll(pokemon("Kent Kanetsuna/Direc. Shinji Higuchi", VetrinaArtistiService.CARTE_MINIME_MURO));
        when(oggettoRepository.findCarteConArtista()).thenReturn(due);
        List<String> prima = service.calcola(OGGI).sulMuro().stream().map(AnteprimaArtistaDTO::slug).toList();

        // Sachiko Eba arriva a 12 carte
        List<CartaDiArtista> tre = new ArrayList<>(due);
        tre.addAll(pokemon("Shinji Higuchi + Sachiko Eba", VetrinaArtistiService.CARTE_MINIME_MURO));
        when(oggettoRepository.findCarteConArtista()).thenReturn(tre);
        List<String> dopo = service.calcola(OGGI).sulMuro().stream().map(AnteprimaArtistaDTO::slug).toList();

        assertThat(prima).containsExactlyInAnyOrder("mitsuhiro-arita", "shinji-higuchi");
        assertThat(dopo).hasSize(3).contains("sachiko-eba").containsSubsequence(prima);
    }

    // l'archivio si rilegge al massimo una volta l'ora
    @Test
    void vetrinaRicalcolataAlPiuUnaVoltaLOra() {
        when(oggettoRepository.findCarteConArtista()).thenReturn(pokemon("Mitsuhiro Arita", VetrinaArtistiService.CARTE_MINIME_MURO));

        VetrinaArtistiDTO prima = service.vetrina();
        VetrinaArtistiDTO seconda = service.vetrina();

        assertThat(seconda).isSameAs(prima);
        verify(oggettoRepository, times(1)).findCarteConArtista();
    }

    // la scelta dell'admin si salva solo per una carta dell'illustratore in archivio, e il muro si ricalcola
    @Test
    void scegliereLaCartaSimboloLaSalvaERicalcolaIlMuro() {
        when(oggettoRepository.findCarteConArtista()).thenReturn(pokemon("Mitsuhiro Arita", VetrinaArtistiService.CARTE_MINIME_MURO));
        when(oggettoRepository.existsByIdEsternoAndArtistaInAndImmagineUrlIsNotNull("id-Pokemon 1", List.of("Mitsuhiro Arita"))).thenReturn(true);
        service.vetrina();

        service.scegliCartaSimbolo("mitsuhiro-arita", "id-Pokemon 1");
        service.vetrina();

        ArgumentCaptor<CartaSimboloArtista> salvata = ArgumentCaptor.forClass(CartaSimboloArtista.class);
        verify(cartaSimboloRepository).save(salvata.capture());
        assertThat(salvata.getValue().getSlug()).isEqualTo("mitsuhiro-arita");
        assertThat(salvata.getValue().getIdEsterno()).isEqualTo("id-Pokemon 1");
        assertThat(salvata.getValue().getSceltaIl()).isNotNull();
        verify(oggettoRepository, times(2)).findCarteConArtista();
    }

    @Test
    void cartaSimboloDiUnAltroIllustratoreRifiutata() {
        when(oggettoRepository.existsByIdEsternoAndArtistaInAndImmagineUrlIsNotNull("id-Mew", List.of("Mitsuhiro Arita"))).thenReturn(false);

        assertThatThrownBy(() -> service.scegliCartaSimbolo("mitsuhiro-arita", "id-Mew"))
                .isInstanceOf(BadRequestException.class);
        verify(cartaSimboloRepository, never()).save(any());
    }

    @Test
    void illustratoreInesistente() {
        assertThatThrownBy(() -> service.scegliCartaSimbolo("nessuno", "id-Mew")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.togliCartaSimbolo("nessuno")).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.cartaSimbolo("nessuno")).isInstanceOf(NotFoundException.class);
    }

    // per l'admin: la scelta (se è in archivio), quella automatica e se l'illustratore è sul muro
    @Test
    void cartaSimboloSceltaEAutomatica() {
        when(oggettoRepository.findCarteConArtista()).thenReturn(pokemon("Mitsuhiro Arita", VetrinaArtistiService.CARTE_MINIME_MURO));
        when(oggettoRepository.findCarteDiArtista(anyCollection())).thenReturn(List.of(
                carta("Mitsuhiro Arita", "Charizard", "250", "Rare Holo", 1),
                carta("Mitsuhiro Arita", "Squirtle", "1", "Common", 1)));
        when(cartaSimboloRepository.findById("mitsuhiro-arita")).thenReturn(Optional.of(new CartaSimboloArtista("mitsuhiro-arita", "id-Squirtle", null)));

        CartaSimboloDTO simbolo = service.cartaSimbolo("mitsuhiro-arita");

        assertThat(simbolo.scelta().nome()).isEqualTo("Squirtle");
        assertThat(simbolo.sceltaSalvata()).isTrue();
        assertThat(simbolo.automatica().nome()).isEqualTo("Charizard");
        assertThat(simbolo.sulMuro()).isTrue();
    }

    // scelta di una carta non più in archivio (database ricreato): vale quella automatica, ma la scelta salvata
    // si vede, così l'admin la può togliere
    @Test
    void cartaSimboloSceltaNonInArchivio() {
        when(oggettoRepository.findCarteDiArtista(anyCollection())).thenReturn(List.of(carta("Mitsuhiro Arita", "Charizard", "250", "Rare Holo", 1)));
        when(cartaSimboloRepository.findById("mitsuhiro-arita")).thenReturn(Optional.of(new CartaSimboloArtista("mitsuhiro-arita", "id-Mew", null)));

        CartaSimboloDTO simbolo = service.cartaSimbolo("mitsuhiro-arita");

        assertThat(simbolo.scelta()).isNull();
        assertThat(simbolo.sceltaSalvata()).isTrue();
        assertThat(simbolo.automatica().nome()).isEqualTo("Charizard");
        assertThat(simbolo.sulMuro()).isFalse();
    }

    private static List<CartaDiArtista> pokemon(String artista, int quante) {
        return IntStream.range(0, quante)
                .mapToObj(i -> carta(artista, "Pokemon " + i, String.valueOf(i + 1), "Common", 1))
                .toList();
    }

    private static CartaDiArtista carta(String artista, String nome, String prezzo, String rarita, int numeriPokedex) {
        return new Carta(artista, UUID.randomUUID(), "id-" + nome, nome, "1", rarita,
                "https://assets.tcgdex.net/en/base/base1/" + nome + "/high.webp", new BigDecimal(prezzo), numeriPokedex);
    }

    // l'immagine piccola della carta col nome dato (vedi carta)
    private static String immagine(String nome) {
        return "https://assets.tcgdex.net/en/base/base1/" + nome + "/low.webp";
    }

    private record Carta(String getArtista, UUID getId, String getIdEsterno, String getNome, String getNumero, String getRarita,
                         String getImmagineUrl, BigDecimal getPrezzoMassimo, int getNumeriPokedex) implements CartaDiArtista {
    }
}
