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
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Stream;

// muro della pagina Illustratori, dalle carte già in archivio: chi ne ha abbastanza può finire sul muro (gli
// illustratori cambiano ogni settimana), e ogni illustratore dell'indice porta le immagini delle sue tre carte più
// preziose.
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
    // dalle ultra rare in su il disegno copre tutta la carta: il ritaglio della finestra prenderebbe testo e cornici.
    // Stessa cosa per VMAX e VSTAR, che GradoRarita mette fra le doppie rare, e per le carte GX, EX, V e simili, anche
    // promo (rarità "Promo"): si riconoscono dal nome
    static final int GRADO_MASSIMO_RITAGLIO = 3;
    private static final Pattern DISEGNO_A_TUTTA_CARTA = Pattern.compile("vmax|vstar", Pattern.CASE_INSENSITIVE);
    private static final Pattern NOME_A_TUTTA_CARTA = Pattern.compile("[ -](GX|EX|V|VMAX|VSTAR|V-UNION|BREAK|LEGEND)$|&");
    private static final Duration DURATA = Duration.ofHours(1);

    // GradoRarita prova le regole una a una: un calcolo per rarità, non uno per confronto
    private static final Map<String, Integer> GRADI = new ConcurrentHashMap<>();

    // per prezzo massimo, poi per rarità
    private static final Comparator<CartaDiArtista> PER_VALORE = Comparator
            .comparing(CartaDiArtista::getPrezzoMassimo, Comparator.nullsLast(Comparator.<BigDecimal>reverseOrder()))
            .thenComparing(Comparator.comparingInt(VetrinaArtistiService::grado).reversed());

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

        Map<String, List<String>> carteIndice = new LinkedHashMap<>();
        List<ElencoArtisti.Artista> candidati = new ArrayList<>();
        for (ElencoArtisti.Artista artista : elenco.elenco()) {
            List<CartaDiArtista> carte = perSlug.getOrDefault(artista.slug(), List.of());
            if (!carte.isEmpty()) {
                carteIndice.put(artista.slug(), diPunta(carte, PER_VALORE).map(CartaAnteprimaDTO::immagineUrlPiccola)
                        .filter(Objects::nonNull).limit(CARTE_INDICE).toList());
            }
            if (carte.size() >= CARTE_MINIME_MURO) {
                candidati.add(artista);
            }
        }

        // ordine pescato dalla settimana: ogni illustratore ha il suo posto, che non dipende dagli altri, così chi
        // supera le carte minime a metà settimana entra solo se pesca un posto fra i primi, senza rimescolare il muro
        String settimana = oggi.get(IsoFields.WEEK_BASED_YEAR) + "-" + oggi.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        List<AnteprimaArtistaDTO> sulMuro = candidati.stream()
                .sorted(Comparator.comparingInt((ElencoArtisti.Artista a) -> (a.slug() + "@" + settimana).hashCode())
                        .thenComparing(ElencoArtisti.Artista::slug))
                .limit(ARTISTI_SUL_MURO)
                .map(artista -> new AnteprimaArtistaDTO(artista.slug(), artista.nome(), artista.carte(),
                        illustrazioni(perSlug.get(artista.slug()))))
                .toList();
        return new VetrinaArtistiDTO(sulMuro, carteIndice);
    }

    // prima i Pokémon col riquadro classico (il ritaglio del disegno viene pulito), fra questi prima quelli non promo
    // (spesso hanno un timbro sul disegno), poi il resto
    static List<CartaAnteprimaDTO> illustrazioni(List<CartaDiArtista> carte) {
        Comparator<CartaDiArtista> primaConRiquadro = Comparator.comparing(c -> !conRiquadro(c));
        Comparator<CartaDiArtista> poiNonPromo = Comparator.comparing(c -> "promo".equalsIgnoreCase(c.getRarita()));
        return diPunta(carte, primaConRiquadro.thenComparing(poiNonPromo).thenComparing(PER_VALORE)).limit(ILLUSTRAZIONI).toList();
    }

    private static boolean conRiquadro(CartaDiArtista carta) {
        return carta.getNumeriPokedex() > 0 && grado(carta) <= GRADO_MASSIMO_RITAGLIO
                && (carta.getRarita() == null || !DISEGNO_A_TUTTA_CARTA.matcher(carta.getRarita()).find())
                && !NOME_A_TUTTA_CARTA.matcher(CartaAnteprimaDTO.nomeSenzaDettaglio(carta.getNome())).find();
    }

    private static int grado(CartaDiArtista carta) {
        return carta.getRarita() == null ? 0 : GRADI.computeIfAbsent(carta.getRarita(), GradoRarita::di);
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
