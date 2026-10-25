package com.example.ecommerce.services;

import com.example.ecommerce.entities.Espansione;
import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.payloads.AnteprimaSetDTO;
import com.example.ecommerce.payloads.CartaAnteprimaDTO;
import com.example.ecommerce.payloads.RaritaContataDTO;
import com.example.ecommerce.repositories.EspansioneRepository;
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
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VetrinaServiceTest {

    @Mock
    private EspansioneRepository espansioneRepository;
    @Mock
    private OggettoRepository oggettoRepository;
    @InjectMocks
    private VetrinaService service;

    // solo i set già scaricati, con logo e data: degli altri le carte non sono in archivio
    @Test
    void inVetrinaSoloISetScaricatiConLogoEData() {
        Espansione nuovo = set("me05", true, "logo", LocalDate.of(2026, 7, 17));
        Espansione nonScaricato = set("me03", false, "logo", LocalDate.of(2026, 3, 27));
        Espansione senzaLogo = set("mep", true, null, LocalDate.of(2025, 9, 26));
        Espansione vecchio = set("sv10", true, "logo", LocalDate.of(2025, 5, 30));
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(List.of(nuovo, nonScaricato, senzaLogo, vecchio));
        when(oggettoRepository.findByEspansioneId(anyString())).thenReturn(List.of());

        List<AnteprimaSetDTO> anteprime = service.anteprime(false);

        assertThat(anteprime).extracting(a -> a.espansione().id()).containsExactly("me05", "sv10");
    }

    @Test
    void alPiuUndiciSet() {
        List<Espansione> tanti = IntStream.range(0, 14).mapToObj(i -> set("s" + i, true, "logo", LocalDate.of(2026, 1, 1))).toList();
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(tanti);
        when(oggettoRepository.findByEspansioneId(anyString())).thenReturn(List.of());

        assertThat(service.anteprime(false)).hasSize(VetrinaService.SET_IN_VETRINA);
    }

    // i tre set che girano nella hero hanno le carte di sfondo e quelle in più per il tavolo, gli altri no
    @Test
    void sfondoSoloPerISetDellaHero() {
        List<Espansione> cinque = IntStream.range(0, 5).mapToObj(i -> set("s" + i, true, "logo", LocalDate.of(2026, 1, 1))).toList();
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(cinque);
        List<Oggetto> carte = IntStream.range(0, 30).mapToObj(i -> carta("Carta" + i + " (Set " + i + "/30)", "Rare", null)).toList();
        when(oggettoRepository.findByEspansioneId(anyString())).thenReturn(carte);

        List<AnteprimaSetDTO> anteprime = service.anteprime(false);

        assertThat(anteprime.subList(0, 3)).allSatisfy(a -> {
            assertThat(a.carteDiPunta()).hasSize(VetrinaService.CARTE_HERO);
            assertThat(a.carteSfondo()).hasSize(VetrinaService.CARTE_SFONDO);
        });
        assertThat(anteprime.subList(3, 5)).allSatisfy(a -> {
            assertThat(a.carteDiPunta()).hasSize(VetrinaService.CARTE_ALTRI_SET);
            assertThat(a.carteSfondo()).isEmpty();
        });
    }

    // i set digitali (TCG Pocket) hanno la loro riga: mai nella hero né tra gli altri set appena usciti
    @Test
    void setDigitaliFuoriDallaVetrinaDeiSetFisici() {
        Espansione pocket = digitale(set("B2a", true, "logo", LocalDate.of(2026, 2, 26)));
        Espansione fisico = set("me02.5", true, "logo", LocalDate.of(2026, 1, 30));
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(List.of(pocket, fisico));
        when(oggettoRepository.findByEspansioneId(anyString())).thenReturn(List.of());

        assertThat(service.anteprime(false)).extracting(a -> a.espansione().id()).containsExactly("me02.5");
    }

    @Test
    void riprendeDigitaliAlPiuQuattroSenzaHero() {
        List<Espansione> tutti = new ArrayList<>();
        tutti.add(set("me05", true, "logo", LocalDate.of(2026, 7, 17)));
        IntStream.range(0, 6).forEach(i -> tutti.add(digitale(set("A" + i, true, "logo", LocalDate.of(2025, 6 - i, 1)))));
        tutti.add(digitale(set("A9", false, "logo", LocalDate.of(2026, 3, 1))));
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(tutti);
        Oggetto carta = carta("Pikachu ex (Genetic Apex 1/226)", "Crown", null);
        when(oggettoRepository.findByEspansioneId(anyString())).thenReturn(List.of(carta));

        List<AnteprimaSetDTO> anteprime = service.anteprime(true);

        assertThat(anteprime).extracting(a -> a.espansione().id()).containsExactly("A0", "A1", "A2", "A3");
        assertThat(anteprime).allSatisfy(a -> {
            assertThat(a.espansione().digitale()).isTrue();
            assertThat(a.carteDiPunta()).hasSize(1);
            assertThat(a.carteSfondo()).isEmpty();
        });
    }

    // da scaricare senza aspettare una visita: i set che la home mostrerebbe, fisici e digitali, ancora senza carte
    @Test
    void daScaricareISetDellaHomeAncoraSenzaCarte() {
        Espansione nuovo = set("me06", false, "logo", LocalDate.of(2026, 9, 26));
        Espansione senzaLogo = set("mep", false, null, LocalDate.of(2026, 9, 1));
        Espansione scaricato = set("me05", true, "logo", LocalDate.of(2026, 7, 17));
        Espansione pocket = digitale(set("B2", false, "logo", LocalDate.of(2026, 1, 29)));
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(List.of(nuovo, senzaLogo, scaricato, pocket));

        assertThat(service.setDaScaricare()).containsExactly("me06", "B2");
    }

    // solo quanti ne entrano in home: undici fisici e quattro digitali
    @Test
    void daScaricareAlPiuQuantiNeMostraLaHome() {
        List<Espansione> tutti = new ArrayList<>();
        IntStream.range(0, 14).forEach(i -> tutti.add(set("s" + i, false, "logo", LocalDate.of(2026, 1, 1))));
        IntStream.range(0, 6).forEach(i -> tutti.add(digitale(set("A" + i, false, "logo", LocalDate.of(2025, 1, 1)))));
        when(espansioneRepository.findAllByOrderByDataUscitaDescNomeAsc()).thenReturn(tutti);

        assertThat(service.setDaScaricare())
                .hasSize(VetrinaService.SET_IN_VETRINA + VetrinaService.SET_DIGITALI_IN_VETRINA)
                .contains("s10", "A3")
                .doesNotContain("s11", "A4");
    }

    // con abbastanza prezzi si ordina per prezzo massimo; un Pokémon compare una volta sola
    @Test
    void carteDiPuntaPerPrezzoSenzaDoppioni() {
        List<Oggetto> carte = new ArrayList<>();
        carte.add(carta("Mew (30th Celebration R/128)", "RGB Rare", "3009.79"));
        carte.add(carta("Mew (30th Celebration G/128)", "RGB Rare", "2780.50"));
        carte.add(carta("Gengar ex (30th Celebration 154/128)", "Special illustration rare", "112.42"));
        carte.add(carta("Pikachu ex (30th Celebration 150/128)", "Special illustration rare", "94.24"));

        List<Oggetto> diPunta = VetrinaService.carteDiPunta(carte, 3);

        assertThat(diPunta).extracting(Oggetto::getNome).containsExactly(
                "Mew (30th Celebration R/128)", "Gengar ex (30th Celebration 154/128)", "Pikachu ex (30th Celebration 150/128)");
    }

    // pochi prezzi letti: conta la rarità
    @Test
    void carteDiPuntaPerRaritaSenzaPrezzi() {
        List<Oggetto> carte = List.of(
                carta("Weedle (Chaos Rising 1/86)", "Common", null),
                carta("Mega Darkrai ex (Chaos Rising 120/86)", "Mega Hyper Rare", null),
                carta("Beedrill ex (Chaos Rising 3/86)", "Double rare", null));

        assertThat(VetrinaService.carteDiPunta(carte, 2)).extracting(Oggetto::getRarita).containsExactly("Mega Hyper Rare", "Double rare");
    }

    @Test
    void sfondoSenzaLeCarteDelTavolo() {
        Oggetto rara = carta("Mew ex (S 152/128)", "Special illustration rare", null);
        Oggetto illustrata = carta("Eevee (S 140/128)", "Illustration rare", null);
        Oggetto comune = carta("Caterpie (S 1/128)", "Common", null);

        List<Oggetto> sfondo = VetrinaService.carteSfondo(List.of(comune, rara, illustrata), List.of(rara));

        assertThat(sfondo).containsExactly(illustrata, comune);
    }

    // dalle ultra rare in su, dalla più rara: grado più alto, poi meno copie
    @Test
    void raritaAmbiteDallaPiuRara() {
        List<Oggetto> carte = new ArrayList<>();
        carte.add(carta("A (S 1/1)", "Common", null));
        carte.add(carta("B (S 2/1)", "Double rare", null));
        IntStream.range(0, 10).forEach(i -> carte.add(carta("SIR" + i + " (S x/1)", "Special illustration rare", null)));
        IntStream.range(0, 3).forEach(i -> carte.add(carta("RGB" + i + " (S x/1)", "RGB Rare", null)));
        IntStream.range(0, 18).forEach(i -> carte.add(carta("IR" + i + " (S x/1)", "Illustration rare", null)));

        assertThat(VetrinaService.raritaAmbite(carte)).containsExactly(
                new RaritaContataDTO("RGB Rare", 3, 6),
                new RaritaContataDTO("Special illustration rare", 10, 6),
                new RaritaContataDTO("Illustration rare", 18, 5));
    }

    @Test
    void nomeSenzaIlDettaglioDelSet() {
        assertThat(CartaAnteprimaDTO.nomeSenzaDettaglio("Mew ex (30th Celebration 152/128)")).isEqualTo("Mew ex");
        assertThat(CartaAnteprimaDTO.nomeSenzaDettaglio("Pikachu")).isEqualTo("Pikachu");
    }

    @Test
    void gradiDelleRarita() {
        assertThat(GradoRarita.di("Special illustration rare")).isEqualTo(6);
        assertThat(GradoRarita.di("Illustration rare")).isEqualTo(5);
        assertThat(GradoRarita.di("Ultra Rare")).isEqualTo(4);
        assertThat(GradoRarita.di("Double rare")).isEqualTo(3);
        assertThat(GradoRarita.di("Rare Holo")).isEqualTo(2);
        assertThat(GradoRarita.di("Uncommon")).isEqualTo(1);
        assertThat(GradoRarita.di("Common")).isZero();
        assertThat(GradoRarita.di(null)).isZero();
    }

    @Test
    void gradiDelleRaritaDiTcgPocket() {
        assertThat(GradoRarita.di("Crown")).isEqualTo(6);
        assertThat(GradoRarita.di("Three Star")).isEqualTo(6);
        assertThat(GradoRarita.di("Two Shiny")).isEqualTo(6);
        assertThat(GradoRarita.di("Two Star")).isEqualTo(5);
        assertThat(GradoRarita.di("One Star")).isEqualTo(5);
        assertThat(GradoRarita.di("One Shiny")).isEqualTo(4);
        assertThat(GradoRarita.di("Four Diamond")).isEqualTo(3);
        assertThat(GradoRarita.di("Three Diamond")).isEqualTo(2);
        assertThat(GradoRarita.di("Two Diamond")).isEqualTo(1);
        assertThat(GradoRarita.di("One Diamond")).isZero();
        // le stelle d'oro dell'era EX restano holo
        assertThat(GradoRarita.di("Rare Holo Star")).isEqualTo(2);
    }

    private static Espansione digitale(Espansione set) {
        set.setDigitale(true);
        return set;
    }

    private static Espansione set(String id, boolean importata, String logo, LocalDate uscita) {
        Espansione set = new Espansione(id);
        set.setNome(id);
        set.setImportata(importata);
        set.setLogoUrl(logo);
        set.setDataUscita(uscita);
        return set;
    }

    private static Oggetto carta(String nome, String rarita, String prezzoMassimo) {
        Oggetto carta = new Oggetto(nome, BigDecimal.ONE);
        carta.setRarita(rarita);
        carta.setImmagineUrl("https://assets.tcgdex.net/x/high.webp");
        carta.setPrezzoMassimo(prezzoMassimo == null ? null : new BigDecimal(prezzoMassimo));
        return carta;
    }
}
