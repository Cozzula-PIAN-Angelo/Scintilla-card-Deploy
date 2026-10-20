package com.example.ecommerce.services;

import com.example.ecommerce.payloads.ArtistaCartaDTO;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

// Elenco degli artisti della sezione Artisti, da artisti.json (generato da scripts/genera-artisti.mjs).
// Un'istanza unica caricata dal classpath al primo uso, senza Spring: così OggettoResponseDTO.from resta
// statico e calcola gli artisti di ogni carta. ArtistiConfig la carica all'avvio: un file mancante o
// rotto ferma l'applicazione invece della prima richiesta
public final class ElencoArtisti {

    // pagina delle carte per cui TCGdex non indica l'artista: non è nell'elenco
    public static final String SLUG_SCONOSCIUTO = "sconosciuto";
    public static final String NOME_SCONOSCIUTO = "Artista sconosciuto";

    private static final String RISORSA = "artisti.json";

    // grafie: i valori grezzi del campo illustrator in cui compare l'artista (una chiamata a TCGdex per grafia)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Artista(String slug, String nome, List<String> grafie, int carte, String avatar) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record File(int sconosciuti, List<Artista> artisti) {
    }

    private static final class Caricato {
        private static final ElencoArtisti ISTANZA = caricaDalClasspath();
    }

    private final List<Artista> elenco;
    private final Map<String, Artista> perSlug;
    // grafia grezza -> artisti che la firmano, nell'ordine in cui compaiono nella grafia
    private final Map<String, List<ArtistaCartaDTO>> perGrafia;
    private final int sconosciuti;

    private ElencoArtisti(File file) {
        this.elenco = file.artisti().stream().sorted(Comparator.comparing(a -> chiaveOrdine(a.nome()))).toList();
        this.perSlug = file.artisti().stream().collect(Collectors.toMap(Artista::slug, Function.identity()));
        this.sconosciuti = file.sconosciuti();

        Map<String, List<Artista>> autori = new HashMap<>();
        file.artisti().forEach(artista -> artista.grafie().forEach(grafia ->
                autori.computeIfAbsent(grafia, chiave -> new ArrayList<>()).add(artista)));
        this.perGrafia = new HashMap<>();
        autori.forEach((grafia, artisti) -> perGrafia.put(grafia, artisti.stream()
                .sorted(Comparator.comparingInt(artista -> posizioneNellaGrafia(grafia, artista.nome())))
                .map(artista -> new ArtistaCartaDTO(artista.nome(), artista.slug()))
                .toList()));
    }

    public static ElencoArtisti get() {
        return Caricato.ISTANZA;
    }

    static ElencoArtisti da(InputStream json) {
        try {
            File file = new ObjectMapper().readValue(json, File.class);
            if (file.artisti() == null) {
                throw new IllegalStateException(RISORSA + " senza l'elenco degli artisti");
            }
            return new ElencoArtisti(file);
        } catch (IOException ex) {
            throw new IllegalStateException(RISORSA + " non leggibile: " + ex.getMessage(), ex);
        }
    }

    private static ElencoArtisti caricaDalClasspath() {
        try (InputStream json = ElencoArtisti.class.getClassLoader().getResourceAsStream(RISORSA)) {
            if (json == null) {
                throw new IllegalStateException(RISORSA + " non trovato: generalo con node scripts/genera-artisti.mjs");
            }
            return da(json);
        } catch (IOException ex) {
            throw new IllegalStateException(RISORSA + " non leggibile: " + ex.getMessage(), ex);
        }
    }

    // in ordine alfabetico, senza badare a maiuscole e accenti
    public List<Artista> elenco() {
        return elenco;
    }

    public Optional<Artista> perSlug(String slug) {
        return Optional.ofNullable(perSlug.get(slug));
    }

    public int sconosciuti() {
        return sconosciuti;
    }

    // autori di una carta dalla grafia grezza salvata in oggetti.artista
    public List<ArtistaCartaDTO> artistiDi(String grafia) {
        if (grafia == null) {
            return List.of();
        }
        if (grafia.isEmpty()) {
            return List.of(new ArtistaCartaDTO(NOME_SCONOSCIUTO, SLUG_SCONOSCIUTO));
        }
        List<ArtistaCartaDTO> noti = perGrafia.get(grafia);
        return noti != null ? noti : List.of(new ArtistaCartaDTO(grafia.replaceAll("\\s+", " ").trim(), null));
    }

    // un alias (es. "K Hoshiba" per "K. Hoshiba") può non comparire alla lettera: finisce in fondo
    private static int posizioneNellaGrafia(String grafia, String nome) {
        // nomi puliti dallo script: si cerca nella grafia con gli spazi già ridotti
        int posizione = grafia.replaceAll("\\s+", " ").indexOf(nome);
        return posizione < 0 ? Integer.MAX_VALUE : posizione;
    }

    private static String chiaveOrdine(String nome) {
        // senza accenti, maiuscole e punteggiatura: "Big Mama" Tagawa va tra le B, non in testa
        return Normalizer.normalize(nome, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase()
                .replaceAll("[^a-z0-9 ]", "");
    }
}
