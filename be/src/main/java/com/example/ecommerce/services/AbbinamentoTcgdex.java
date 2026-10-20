package com.example.ecommerce.services;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Optional;

// Passaggio da pokemontcg.io a TCGdex, da abbinamento-id.json (generato una volta da scripts/genera-abbinamento.mjs):
// set e carte vecchi -> nuovi, URL delle immagini di TCGdex (senza estensione) e le copie locali (fe/public/immagini,
// da scripts/scarica-immagini.mjs) di quello che TCGdex non ha: riserve delle carte, carte rimaste con l'id
// vecchio, simboli e loghi dei set. Un'istanza unica caricata dal classpath al primo
// uso, senza Spring, come ElencoArtisti: la usa anche la migrazione V9, che gira prima del contesto
public final class AbbinamentoTcgdex {

    private static final String RISORSA = "abbinamento-id.json";

    // riserveVecchie, simboli e loghi facoltative: un file di prima delle copie locali non le ha
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record File(Map<String, String> set, Map<String, String> carte, Map<String, String> immagini,
                        Map<String, String> riserve, Map<String, String> riserveVecchie, Map<String, String> simboli,
                        Map<String, String> loghi) {
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

    // copia locale dell'immagine di una carta che su TCGdex non ha immagine
    public Optional<String> riserva(String idNuovo) {
        return Optional.ofNullable(file.riserve().get(idNuovo));
    }

    // copia locale dell'immagine di una carta rimasta con l'id di pokemontcg.io
    public Optional<String> riservaVecchia(String idVecchio) {
        return cerca(file.riserveVecchie(), idVecchio);
    }

    // copia locale del simbolo del set (quelli di TCGdex non si caricano)
    public Optional<String> simbolo(String idSet) {
        return cerca(file.simboli(), idSet);
    }

    // copia locale del logo, per i set che su TCGdex non ce l'hanno
    public Optional<String> logo(String idSet) {
        return cerca(file.loghi(), idSet);
    }

    private static Optional<String> cerca(Map<String, String> mappa, String chiave) {
        return mappa == null ? Optional.empty() : Optional.ofNullable(mappa.get(chiave));
    }
}
