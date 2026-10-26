package com.example.ecommerce.services;

import com.example.ecommerce.payloads.AnteprimaArtistaDTO;
import com.example.ecommerce.payloads.ArtistaCartaDTO;
import com.example.ecommerce.payloads.CartaAnteprimaDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.VetrinaArtistiDTO;
import com.example.ecommerce.repositories.CartaDiArtista;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Stream;

// muro della pagina Illustratori, dalle carte già in archivio: chi ne ha abbastanza può finire sul muro (gli
// illustratori cambiano ogni settimana), e ogni illustratore dell'indice porta le sue tre carte più preziose.
// Ricalcolata al massimo una volta l'ora: legge tutte le carte con artista
@Service
@RequiredArgsConstructor
public class VetrinaArtistiService {

    static final int ARTISTI_SUL_MURO = 10;
    // carte in archivio perché un illustratore possa finire sul muro
    static final int CARTE_MINIME_MURO = 12;
    // il muro ne mostra una, le altre sono di riserva per le immagini che TCGdex non ha
    static final int ILLUSTRAZIONI = 4;
    static final int CARTE_INDICE = 3;
    // dalle ultra rare in su il disegno copre tutta la carta: il ritaglio della finestra prenderebbe testo e cornici
    static final int GRADO_MASSIMO_RITAGLIO = 3;
    private static final Duration DURATA = Duration.ofHours(1);

    // per prezzo massimo, poi per rarità
    private static final Comparator<CartaDiArtista> PER_VALORE = Comparator
            .comparing(CartaDiArtista::getPrezzoMassimo, Comparator.nullsLast(Comparator.<BigDecimal>reverseOrder()))
            .thenComparing(Comparator.comparingInt((CartaDiArtista c) -> GradoRarita.di(c.getRarita())).reversed());

    private final OggettoRepository oggettoRepository;

    private VetrinaArtistiDTO calcolata;
    private Instant calcolataIl = Instant.EPOCH;

    public synchronized VetrinaArtistiDTO vetrina() {
        Instant adesso = Instant.now();
        if (calcolata == null || calcolataIl.plus(DURATA).isBefore(adesso)) {
            calcolata = calcola(LocalDate.now());
            calcolataIl = adesso;
        }
        return calcolata;
    }

    VetrinaArtistiDTO calcola(LocalDate oggi) {
        ElencoArtisti elenco = ElencoArtisti.get();
        // una carta con più autori conta per ognuno
        Map<String, List<CartaDiArtista>> perSlug = new HashMap<>();
        for (CartaDiArtista carta : oggettoRepository.findCarteConArtista()) {
            for (ArtistaCartaDTO autore : elenco.artistiDi(carta.getArtista())) {
                if (autore.slug() != null) {
                    perSlug.computeIfAbsent(autore.slug(), slug -> new ArrayList<>()).add(carta);
                }
            }
        }

        Map<String, List<CartaAnteprimaDTO>> carteIndice = new LinkedHashMap<>();
        List<ElencoArtisti.Artista> candidati = new ArrayList<>();
        for (ElencoArtisti.Artista artista : elenco.elenco()) {
            List<CartaDiArtista> carte = perSlug.getOrDefault(artista.slug(), List.of());
            if (!carte.isEmpty()) {
                carteIndice.put(artista.slug(), diPunta(carte, PER_VALORE).limit(CARTE_INDICE).toList());
            }
            if (carte.size() >= CARTE_MINIME_MURO) {
                candidati.add(artista);
            }
        }

        // stessa scelta per tutta la settimana
        Collections.shuffle(candidati, new Random(oggi.get(IsoFields.WEEK_BASED_YEAR) * 100L
                + oggi.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)));
        List<AnteprimaArtistaDTO> sulMuro = candidati.stream()
                .limit(ARTISTI_SUL_MURO)
                .map(artista -> new AnteprimaArtistaDTO(artista.slug(), artista.nome(), artista.carte(),
                        illustrazioni(perSlug.get(artista.slug()))))
                .toList();
        return new VetrinaArtistiDTO(sulMuro, carteIndice);
    }

    // prima i Pokémon col riquadro classico (il ritaglio del disegno viene pulito), poi il resto
    static List<CartaAnteprimaDTO> illustrazioni(List<CartaDiArtista> carte) {
        Comparator<CartaDiArtista> primaConRiquadro = Comparator.comparing(c -> !conRiquadro(c));
        return diPunta(carte, primaConRiquadro.thenComparing(PER_VALORE)).limit(ILLUSTRAZIONI).toList();
    }

    private static boolean conRiquadro(CartaDiArtista carta) {
        return carta.getNumeriPokedex() > 0 && GradoRarita.di(carta.getRarita()) <= GRADO_MASSIMO_RITAGLIO;
    }

    // nell'ordine dato, un Pokémon una volta sola
    private static Stream<CartaAnteprimaDTO> diPunta(List<CartaDiArtista> carte, Comparator<CartaDiArtista> ordine) {
        Set<String> nomi = new HashSet<>();
        return carte.stream()
                .sorted(ordine)
                .filter(c -> nomi.add(CartaAnteprimaDTO.nomeSenzaDettaglio(c.getNome())))
                .map(c -> new CartaAnteprimaDTO(c.getId(), CartaAnteprimaDTO.nomeSenzaDettaglio(c.getNome()),
                        c.getNumero(), c.getRarita(), c.getImmagineUrl(),
                        OggettoResponseDTO.immaginePiccola(c.getImmagineUrl())));
    }
}
