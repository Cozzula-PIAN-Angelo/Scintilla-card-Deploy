package com.example.ecommerce.runners;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;

// Database nuovo (es. ricreato dal Blueprint di Render dopo la scadenza di quello gratuito): lo riempie con i
// dati esportati da scripts/esporta-dati.ps1, letti da app.seed.dati (su Render un Secret File).
// Gira prima di DatabaseSeeder e CatalogoSeeder (HIGHEST_PRECEDENCE vale anche se un giorno prendono un
// @Order): dopo l'import loro trovano admin e catalogo e saltano. Se qualcosa va storto annulla tutto e
// l'avvio prosegue con il database vuoto, come senza file
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DatiInizialiSeeder implements CommandLineRunner {

    // ordine di inserimento: prima le tabelle a cui puntano le chiavi esterne. È anche l'elenco delle sole
    // tabelle ammesse: i nomi nelle query vengono da qui, mai dal file
    static final List<String> TABELLE = List.of(
            "ruoli", "utenti", "ruoli_utenti", "espansioni", "oggetti", "oggetti_pokedex", "pokemon_importati",
            "artisti_importati", "utenti_oggetti_preferiti", "binder", "binder_slot", "binder_immagini",
            "collezione");

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transazione;
    private final String percorso;

    public DatiInizialiSeeder(JdbcTemplate jdbc,
                              PlatformTransactionManager transazioni,
                              @Value("${app.seed.dati:}") String percorso) {
        this.jdbc = jdbc;
        this.transazione = new TransactionTemplate(transazioni);
        this.percorso = percorso;
    }

    @Override
    public void run(String... args) {
        if (percorso.isBlank() || !Files.isRegularFile(Path.of(percorso))) {
            log.info("Dati iniziali: nessun file in '{}', salto", percorso);
            return;
        }
        if (haRighe("utenti") || haRighe("oggetti")) {
            log.info("Dati iniziali: il database ha già utenti o carte, salto");
            return;
        }
        try {
            JsonNode dati = leggi(Path.of(percorso));
            Map<String, Integer> inserite = transazione.execute(stato -> inserisci(dati));
            log.info("Dati iniziali: inserite {}", inserite);
        } catch (RuntimeException | IOException ex) {
            log.error("Dati iniziali: import da '{}' non riuscito, il database resta vuoto ({})", percorso, ex.toString());
        }
    }

    private boolean haRighe(String tabella) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM " + tabella + ")", Boolean.class));
    }

    // il MIME decoder ignora a capo e spazi: il file può essere stato incollato a mano nella pagina di Render
    private static JsonNode leggi(Path file) throws IOException {
        try (InputStream base64 = Files.newInputStream(file);
             InputStream json = new GZIPInputStream(Base64.getMimeDecoder().wrap(base64))) {
            return new ObjectMapper().readTree(json);
        }
    }

    private Map<String, Integer> inserisci(JsonNode dati) {
        dati.fieldNames().forEachRemaining(nome -> {
            if (!TABELLE.contains(nome)) {
                log.warn("Dati iniziali: tabella '{}' sconosciuta nel file, ignorata", nome);
            }
        });
        // senza utenti i ruoli eventualmente creati da un avvio precedente non sono legati a nulla:
        // si tengono quelli del file, con i loro id
        jdbc.update("DELETE FROM ruoli");

        Map<String, Integer> inserite = new LinkedHashMap<>();
        for (String tabella : TABELLE) {
            JsonNode righe = dati.get(tabella);
            if (righe == null || !righe.isArray() || righe.isEmpty()) {
                continue;
            }
            int n = jdbc.update("INSERT INTO " + tabella + " SELECT * FROM json_populate_recordset(NULL::" + tabella
                    + ", ?::json)", righe.toString());
            inserite.put(tabella, n);
        }
        return inserite;
    }
}
