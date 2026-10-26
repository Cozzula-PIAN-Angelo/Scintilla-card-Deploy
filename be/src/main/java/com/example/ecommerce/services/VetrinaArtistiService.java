package com.example.ecommerce.services;

import com.example.ecommerce.entities.CartaSimboloArtista;
import com.example.ecommerce.exceptions.BadRequestException;
import com.example.ecommerce.exceptions.NotFoundException;
import com.example.ecommerce.payloads.AnteprimaArtistaDTO;
import com.example.ecommerce.payloads.ArtistaCartaDTO;
import com.example.ecommerce.payloads.CartaAnteprimaDTO;
import com.example.ecommerce.payloads.CartaSimboloDTO;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.VetrinaArtistiDTO;
import com.example.ecommerce.repositories.CartaDiArtista;
import com.example.ecommerce.repositories.CartaSimboloArtistaRepository;
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
import java.util.stream.Collectors;
import java.util.stream.Stream;

// muro della pagina Illustratori, dalle carte già in archivio: chi ne ha abbastanza può finire sul muro (gli
// illustratori cambiano ogni settimana), e ogni illustratore dell'indice porta le immagini delle sue tre carte più
// preziose. Sul muro la carta simbolo dell'illustratore: quella scelta dall'admin o, se non c'è, una carta da
// collezionista. Ricalcolata al massimo una volta l'ora (o quando l'admin cambia una scelta): legge tutte le carte con artista
@Service
@RequiredArgsConstructor
public class VetrinaArtistiService {

    static final int ARTISTI_SUL_MURO = 10;
    // carte in archivio perché un illustratore possa finire sul muro
    static final int CARTE_MINIME_MURO = 12;
    // il muro ne mostra una, le altre sono di riserva per le immagini che TCGdex non ha
    static final int ILLUSTRAZIONI = 4;
    static final int CARTE_INDICE = 3;
    // carte da collezionista: illustrazioni rare e speciali (grado 5 e 6 di GradoRarita) o carte che costano almeno 20 €
    static final int GRADO_ILLUSTRAZIONE = 5;
    static final BigDecimal PREZZO_ALTO = new BigDecimal("20");
    // allenatori ed energie normali (senza Pokédex, sotto le ultra rare): disegno piccolo in mezzo al testo, in fondo
    static final int GRADO_ARTE_PIENA = 4;
    private static final Duration DURATA = Duration.ofHours(1);

    // GradoRarita prova le regole una a una: un calcolo per rarità, non uno per confronto
    private static final Map<String, Integer> GRADI = new ConcurrentHashMap<>();

    // per prezzo massimo, poi per rarità
    private static final Comparator<CartaDiArtista> PER_VALORE = Comparator
            .comparing(CartaDiArtista::getPrezzoMassimo, Comparator.nullsLast(Comparator.<BigDecimal>reverseOrder()))
            .thenComparing(Comparator.comparingInt(VetrinaArtistiService::grado).reversed());

    private final OggettoRepository oggettoRepository;
    private final CartaSimboloArtistaRepository cartaSimboloRepository;

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
        Map<String, String> scelte = cartaSimboloRepository.findAll().stream()
                .collect(Collectors.toMap(CartaSimboloArtista::getSlug, CartaSimboloArtista::getIdEsterno));

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
        List<AnteprimaArtistaDTO> sulMuro = candidati.stream()
                .sorted(ordineDellaSettimana(oggi))
                .limit(ARTISTI_SUL_MURO)
                .map(artista -> new AnteprimaArtistaDTO(artista.slug(), artista.nome(), artista.carte(),
                        illustrazioni(perSlug.get(artista.slug()), scelte.get(artista.slug()))))
                .toList();
        return new VetrinaArtistiDTO(sulMuro, carteIndice);
    }

    // per l'admin: la carta scelta (se è in archivio), quella automatica e se l'illustratore è sul muro adesso
    public CartaSimboloDTO cartaSimbolo(String slug) {
        ElencoArtisti.Artista artista = artista(slug);
        List<CartaDiArtista> carte = oggettoRepository.findCarteDiArtista(artista.grafie());
        String scelta = cartaSimboloRepository.findById(slug).map(CartaSimboloArtista::getIdEsterno).orElse(null);
        CartaAnteprimaDTO sceltaInArchivio = carte.stream()
                .filter(c -> scelta != null && scelta.equals(c.getIdEsterno()))
                .findFirst().map(VetrinaArtistiService::anteprima).orElse(null);
        CartaAnteprimaDTO automatica = illustrazioni(carte, null).stream().findFirst().orElse(null);
        boolean sulMuro = vetrina().sulMuro().stream().anyMatch(a -> a.slug().equals(slug));
        return new CartaSimboloDTO(sceltaInArchivio, scelta != null, automatica, sulMuro);
    }

    // solo una carta dell'illustratore già in archivio; il muro si ricalcola alla prossima richiesta
    public void scegliCartaSimbolo(String slug, String idEsterno) {
        ElencoArtisti.Artista artista = artista(slug);
        if (!oggettoRepository.existsByIdEsternoAndArtistaInAndImmagineUrlIsNotNull(idEsterno, artista.grafie())) {
            throw new BadRequestException("La carta " + idEsterno + " non è di " + artista.nome() + " o non è ancora in archivio");
        }
        cartaSimboloRepository.save(new CartaSimboloArtista(slug, idEsterno, Instant.now()));
        dimentica();
    }

    public void togliCartaSimbolo(String slug) {
        artista(slug);
        cartaSimboloRepository.deleteById(slug);
        dimentica();
    }

    private synchronized void dimentica() {
        calcolata = null;
    }

    private static ElencoArtisti.Artista artista(String slug) {
        return ElencoArtisti.get().perSlug(slug)
                .orElseThrow(() -> new NotFoundException("Illustratore non trovato: " + slug));
    }

    private static Comparator<ElencoArtisti.Artista> ordineDellaSettimana(LocalDate oggi) {
        String settimana = oggi.get(IsoFields.WEEK_BASED_YEAR) + "-" + oggi.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        return Comparator.comparingInt((ElencoArtisti.Artista a) -> (a.slug() + "@" + settimana).hashCode())
                .thenComparing(ElencoArtisti.Artista::slug);
    }

    // prima la carta scelta dall'admin (se c'è); allenatori ed energie normali in fondo anche se valgono tanto;
    // fra le altre prima le carte da collezionista, per valore
    static List<CartaAnteprimaDTO> illustrazioni(List<CartaDiArtista> carte, String scelta) {
        Comparator<CartaDiArtista> ordine = Comparator
                .comparing((CartaDiArtista c) -> scelta == null || !scelta.equals(c.getIdEsterno()))
                .thenComparing(VetrinaArtistiService::disegnoPiccolo)
                .thenComparing(c -> !daCollezionista(c))
                .thenComparing(PER_VALORE);
        return diPunta(carte, ordine).limit(ILLUSTRAZIONI).toList();
    }

    private static boolean daCollezionista(CartaDiArtista carta) {
        return grado(carta) >= GRADO_ILLUSTRAZIONE
                || (carta.getPrezzoMassimo() != null && carta.getPrezzoMassimo().compareTo(PREZZO_ALTO) >= 0);
    }

    private static boolean disegnoPiccolo(CartaDiArtista carta) {
        return carta.getNumeriPokedex() == 0 && grado(carta) < GRADO_ARTE_PIENA;
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
                .map(VetrinaArtistiService::anteprima);
    }

    private static CartaAnteprimaDTO anteprima(CartaDiArtista c) {
        return new CartaAnteprimaDTO(c.getId(), CartaAnteprimaDTO.nomeSenzaDettaglio(c.getNome()), c.getNumero(),
                c.getRarita(), c.getImmagineUrl(), OggettoResponseDTO.immaginePiccola(c.getImmagineUrl()));
    }
}
