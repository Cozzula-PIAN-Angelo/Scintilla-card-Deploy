package com.example.ecommerce.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

// Carte rimaste con l'id di pokemontcg.io che sono doppioni di carte scaricate poi da TCGdex: il passaggio (V9) non le
// aveva abbinate, così riscaricando il set la stessa carta è comparsa due volte (30th Classic Collection con 33 carte
// invece di 30). Abbinamenti verificati a mano su nome, PS, illustratore e immagine: in 30th lo script abbinava solo
// per nome e solo i nomi unici (le due metà di Darkrai & Cresselia LEGEND hanno lo stesso nome; "Palkia LV.X" su TCGdex
// è "Palkia"); in Black Bolt pokemontcg.io dà ad Antique Cover Fossil il numero 60, che lo portava su Escavalier;
// in Aquapolis pokemontcg.io aveva una sola carta (50) dove TCGdex ne ha due (50a e 50b, attacchi e codice e-Reader
// diversi): l'immagine della vecchia è la versione a (scritto "50a/147" sulla carta).
// Gli stessi abbinamenti sono in abbinamento-id.json (CARTE_A_MANO in scripts/abbinamento-regole.mjs).
// Solo JDBC: la usa la migrazione V14, che gira prima del contesto. Rilanciarla non fa danni
@Slf4j
public final class UnioneDoppioniTcgdex {

    // id di pokemontcg.io -> id di TCGdex
    static final Map<String, String> DOPPIONI = Map.of(
            "me55c-99", "30th-c-019",
            "me55c-100", "30th-c-020",
            "me55c-106p", "30th-c-022",
            "zsv10pt5-80", "sv10.5b-080",
            "ecard2-50", "ecard2-50a",
            "ecard2-74", "ecard2-74a",
            "ecard2-95", "ecard2-95a",
            "ecard2-103", "ecard2-103a");

    // unite: la vecchia è sparita dentro la nuova; convertite: la nuova non c'era, la vecchia ha preso il suo id
    public record Esito(int unite, int convertite) {
    }

    private UnioneDoppioniTcgdex() {
    }

    public static Esito unisci(JdbcTemplate jdbc) {
        int unite = 0;
        int convertite = 0;
        for (Map.Entry<String, String> doppione : DOPPIONI.entrySet()) {
            UUID vecchia = idDi(jdbc, doppione.getKey());
            if (vecchia == null) {
                continue;
            }
            UUID nuova = idDi(jdbc, doppione.getValue());
            if (nuova == null) {
                // come il passaggio a TCGdex: id nuovo, immagine tenuta, varianti, rarità e artista da rileggere
                jdbc.update("UPDATE oggetti SET id_esterno = ?, varianti = NULL, rarita = NULL, artista = NULL WHERE id = ?",
                        doppione.getValue(), vecchia);
                convertite++;
            } else {
                sposta(jdbc, vecchia, nuova);
                unite++;
            }
        }
        if (unite + convertite > 0) {
            log.info("Doppioni di pokemontcg.io: {} uniti alla carta di TCGdex, {} convertiti", unite, convertite);
        }
        return new Esito(unite, convertite);
    }

    private static UUID idDi(JdbcTemplate jdbc, String idEsterno) {
        List<UUID> id = jdbc.queryForList("SELECT id FROM oggetti WHERE id_esterno = ?", UUID.class, idEsterno);
        return id.isEmpty() ? null : id.get(0);
    }

    // tutto quello che punta alla vecchia passa alla nuova, poi la vecchia si cancella. Dove un utente ha già la nuova
    // (stessa variante in collezione, preferiti, vetrina) le copie si sommano o la riga della vecchia si toglie
    private static void sposta(JdbcTemplate jdbc, UUID vecchia, UUID nuova) {
        // TCGdex non ha l'immagine di queste carte di 30th e Aquapolis: resta la copia locale della vecchia
        jdbc.update("UPDATE oggetti SET immagine_url = (SELECT immagine_url FROM oggetti WHERE id = ?) WHERE id = ? AND immagine_url IS NULL",
                vecchia, nuova);

        jdbc.update("""
                UPDATE collezione c SET quantita = LEAST(999, c.quantita + v.quantita), aggiornata_il = now()
                FROM collezione v
                WHERE v.id_oggetto = ? AND c.id_oggetto = ? AND c.id_utente = v.id_utente AND c.variante = v.variante""",
                vecchia, nuova);
        jdbc.update("""
                DELETE FROM collezione v WHERE v.id_oggetto = ? AND EXISTS (SELECT 1 FROM collezione c
                    WHERE c.id_oggetto = ? AND c.id_utente = v.id_utente AND c.variante = v.variante)""", vecchia, nuova);
        jdbc.update("UPDATE collezione SET id_oggetto = ? WHERE id_oggetto = ?", nuova, vecchia);

        for (String tabella : List.of("utenti_oggetti_preferiti", "profili_vetrina")) {
            jdbc.update("DELETE FROM " + tabella + " v WHERE v.id_oggetto = ? AND EXISTS (SELECT 1 FROM " + tabella
                    + " n WHERE n.id_oggetto = ? AND n.id_utente = v.id_utente)", vecchia, nuova);
            jdbc.update("UPDATE " + tabella + " SET id_oggetto = ? WHERE id_oggetto = ?", nuova, vecchia);
        }

        jdbc.update("UPDATE binder_slot SET id_oggetto = ? WHERE id_oggetto = ?", nuova, vecchia);
        jdbc.update("UPDATE binder SET id_carta_copertina = ? WHERE id_carta_copertina = ?", nuova, vecchia);
        jdbc.update("DELETE FROM oggetti_pokedex WHERE oggetto_id = ?", vecchia);
        jdbc.update("DELETE FROM oggetti WHERE id = ?", vecchia);
    }
}
