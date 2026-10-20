package com.example.ecommerce.services;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Optional;

// Passaggio da pokemontcg.io a TCGdex, da abbinamento-id.json (generato una volta da scripts/genera-abbinamento.mjs):
// set e carte vecchi -> nuovi, URL delle immagini di TCGdex (senza estensione) e, per le carte che su TCGdex
// non hanno immagine, l'immagine di pokemontcg.io come riserva. Un'istanza unica caricata dal classpath al primo
// uso, senza Spring, come ElencoArtisti: la usa anche la migrazione V9, che gira prima del contesto
public final class AbbinamentoTcgdex {

    private static final String RISORSA = "abbinamento-id.json";

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record File(Map<String, String> set, Map<String, String> carte, Map<String, String> immagini,
                        Map<String, String> riserve) {
    }

    private static final class Caricato {
        private static final AbbinamentoTcgdex ISTANZA = caricaDalClasspath();
    }

    private final File file;

    private AbbinamentoTcgdex(File file) {
        this.file = file;
    }

    public static AbbinamentoTcgdex get() {
        return Caricato.ISTANZA;
    }

    static AbbinamentoTcgdex da(InputStream json) {
        try {
            File file = new ObjectMapper().readValue(json, File.class);
            if (file.set() == null || file.carte() == null || file.immagini() == null || file.riserve() == null) {
                throw new IllegalStateException(RISORSA + " senza le mappe set, carte, immagini e riserve");
            }
            return new AbbinamentoTcgdex(file);
        } catch (IOException ex) {
            throw new IllegalStateException(RISORSA + " non leggibile: " + ex.getMessage(), ex);
        }
    }

    private static AbbinamentoTcgdex caricaDalClasspath() {
        try (InputStream json = AbbinamentoTcgdex.class.getClassLoader().getResourceAsStream(RISORSA)) {
            if (json == null) {
                throw new IllegalStateException(RISORSA + " non trovato: generalo con node scripts/genera-abbinamento.mjs");
            }
            return da(json);
        } catch (IOException ex) {
            throw new IllegalStateException(RISORSA + " non leggibile: " + ex.getMessage(), ex);
        }
    }

    // id del set di pokemontcg.io -> id di TCGdex
    public Map<String, String> set() {
        return file.set();
    }

    // id della carta di pokemontcg.io -> id di TCGdex
    public Map<String, String> carte() {
        return file.carte();
    }

    // URL dell'immagine di TCGdex, senza estensione; vuoto se TCGdex non ce l'ha
    public Optional<String> immagine(String idNuovo) {
        return Optional.ofNullable(file.immagini().get(idNuovo));
    }

    // immagine di pokemontcg.io per una carta che su TCGdex non ha immagine
    public Optional<String> riserva(String idNuovo) {
        return Optional.ofNullable(file.riserve().get(idNuovo));
    }
}
