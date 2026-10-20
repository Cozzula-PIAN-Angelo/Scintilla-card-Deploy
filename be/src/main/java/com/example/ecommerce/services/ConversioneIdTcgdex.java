package com.example.ecommerce.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Passaggio da pokemontcg.io a TCGdex dei dati già nel database: set e carte prendono gli id di TCGdex, le carte
// l'immagine di TCGdex (dove c'è) e varianti, rarità e artista tornano null, da rileggere dalla nuova fonte.
// Collezioni e binder puntano all'id interno delle carte e non cambiano. Solo JDBC: la usa la migrazione V9,
// che gira prima del contesto, e DatiInizialiSeeder per un export fatto prima del passaggio.
// Rilanciarla non fa danni: tocca solo le righe ancora da convertire
@Slf4j
public final class ConversioneIdTcgdex {

    private static final String IMMAGINI_TCGDEX = "https://assets.tcgdex.net/";

    // set e carte convertiti; carte rimaste con un id che il file non conosce (o il cui id nuovo era già usato)
    public record Esito(int set, int carte, int carteNonAbbinate) {
    }

    private record Carta(Object id, String idEsterno, String immagine) {
    }

    private ConversioneIdTcgdex() {
    }

    public static Esito converti(JdbcTemplate jdbc, AbbinamentoTcgdex abbinamento) {
        int set = convertiSet(jdbc, abbinamento.set());

        Map<String, String> carte = abbinamento.carte();
        Set<String> idNuovi = new HashSet<>(carte.values());
        List<Carta> presenti = jdbc.query("SELECT id, id_esterno, immagine_url FROM oggetti WHERE id_esterno IS NOT NULL",
                (riga, n) -> new Carta(riga.getObject(1), riga.getString(2), riga.getString(3)));
        // id già usati: due id vecchi con lo stesso id nuovo violerebbero il vincolo UNIQUE su id_esterno
        Set<String> usati = new HashSet<>(presenti.stream().map(Carta::idEsterno).toList());
        List<Object[]> modifiche = new ArrayList<>();
        int nonAbbinate = 0;
        for (Carta carta : presenti) {
            String nuovo = carte.get(carta.idEsterno());
            if (nuovo == null) {
                if (!idNuovi.contains(carta.idEsterno())) {
                    nonAbbinate++;
                }
                continue;
            }
            String immagine = abbinamento.immagine(nuovo).map(url -> url + "/high.webp").orElse(carta.immagine());
            boolean stessoId = nuovo.equals(carta.idEsterno());
            // con lo stesso id nelle due fonti (es. base1-4) la carta è da convertire finché l'immagine non è di TCGdex
            if (stessoId && (immagine == null || immagine.equals(carta.immagine()))) {
                continue;
            }
            if (!stessoId && !usati.add(nuovo)) {
                log.warn("Carta {}: l'id di TCGdex {} è già usato da un'altra carta, resta com'è", carta.idEsterno(), nuovo);
                nonAbbinate++;
                continue;
            }
            modifiche.add(new Object[]{nuovo, immagine, carta.id()});
        }
        jdbc.batchUpdate("UPDATE oggetti SET id_esterno = ?, immagine_url = ?, varianti = NULL, rarita = NULL, artista = NULL "
                + "WHERE id = ?", modifiche);
        if (!modifiche.isEmpty()) {
            // le pagine degli artisti si riscaricano con i nomi di TCGdex
            jdbc.update("DELETE FROM artisti_importati");
        }

        Esito esito = new Esito(set, modifiche.size(), nonAbbinate);
        log.info("Passaggio a TCGdex: {} set e {} carte convertiti, {} carte senza abbinamento", esito.set(), esito.carte(),
                esito.carteNonAbbinate());
        return esito;
    }

    // l'id è la chiave primaria, e le carte ci puntano: si crea la riga nuova (copia della vecchia), si spostano
    // le carte, si cancella la vecchia. Se la nuova c'è già, resta importata se lo era una delle due
    private static int convertiSet(JdbcTemplate jdbc, Map<String, String> set) {
        int convertiti = 0;
        for (String vecchio : jdbc.queryForList("SELECT id FROM espansioni", String.class)) {
            String nuovo = set.get(vecchio);
            if (nuovo == null || nuovo.equals(vecchio)) {
                continue;
            }
            jdbc.update("""
                    INSERT INTO espansioni (id, nome, serie, data_uscita, totale_carte, logo_url, simbolo_url, importata)
                    SELECT ?, nome, serie, data_uscita, totale_carte, logo_url, simbolo_url, importata FROM espansioni WHERE id = ?
                    ON CONFLICT (id) DO UPDATE SET importata = espansioni.importata OR EXCLUDED.importata""", nuovo, vecchio);
            jdbc.update("UPDATE oggetti SET espansione_id = ? WHERE espansione_id = ?", nuovo, vecchio);
            jdbc.update("DELETE FROM espansioni WHERE id = ?", vecchio);
            convertiti++;
        }
        return convertiti;
    }
}
