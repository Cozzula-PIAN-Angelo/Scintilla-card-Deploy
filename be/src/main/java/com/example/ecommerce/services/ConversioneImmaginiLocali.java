package com.example.ecommerce.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

// Le immagini che nel database puntano ancora ai server di pokemontcg.io e Scrydex (che si spengono con l'API il
// 1° marzo 2027) passano alle copie locali di abbinamento-id.json (fe/public/immagini). Senza copia (immagine già
// sparita da quei server) l'indirizzo diventa null: il frontend mostra il segnaposto o il nome del set.
// Anche i simboli di TCGdex, che non si caricano, passano alla copia locale o a null. Solo JDBC: la usa la migrazione
// V10 e DatiInizialiSeeder. Rilanciarla non fa danni: tocca solo gli indirizzi dei vecchi server
@Slf4j
public final class ConversioneImmaginiLocali {

    private static final String VECCHI_SERVER = "images\\.pokemontcg\\.io/|images\\.scrydex\\.com/";
    private static final String SIMBOLI_TCGDEX = "assets\\.tcgdex\\.net/univ/";

    // righe cambiate
    public record Esito(int carte, int loghi, int simboli) {
    }

    private ConversioneImmaginiLocali() {
    }

    public static Esito converti(JdbcTemplate jdbc, AbbinamentoTcgdex abbinamento) {
        int carte = 0;
        for (Map<String, Object> riga : jdbc.queryForList(
                "SELECT id, id_esterno FROM oggetti WHERE immagine_url ~ ?", VECCHI_SERVER)) {
            String idEsterno = (String) riga.get("id_esterno");
            Optional<String> copia = idEsterno == null ? Optional.empty()
                    : abbinamento.riserva(idEsterno).or(() -> abbinamento.riservaVecchia(idEsterno));
            carte += jdbc.update("UPDATE oggetti SET immagine_url = ? WHERE id = ?", copia.orElse(null), riga.get("id"));
        }
        int loghi = aggiorna(jdbc, "logo_url", VECCHI_SERVER, abbinamento::logo);
        int simboli = aggiorna(jdbc, "simbolo_url", VECCHI_SERVER + "|" + SIMBOLI_TCGDEX, abbinamento::simbolo);

        Esito esito = new Esito(carte, loghi, simboli);
        log.info("Immagini locali: {} carte, {} loghi e {} simboli aggiornati", esito.carte(), esito.loghi(), esito.simboli());
        return esito;
    }

    // colonna: logo_url o simbolo_url (nome fisso, mai da fuori)
    private static int aggiorna(JdbcTemplate jdbc, String colonna, String daSostituire, Function<String, Optional<String>> copia) {
        int cambiate = 0;
        for (String id : jdbc.queryForList("SELECT id FROM espansioni WHERE " + colonna + " ~ ?", String.class, daSostituire)) {
            cambiate += jdbc.update("UPDATE espansioni SET " + colonna + " = ? WHERE id = ?", copia.apply(id).orElse(null), id);
        }
        return cambiate;
    }
}
