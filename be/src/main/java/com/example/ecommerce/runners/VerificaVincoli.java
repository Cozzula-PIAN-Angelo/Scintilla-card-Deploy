package com.example.ecommerce.runners;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

// Le cancellazioni a cascata (@OnDelete nelle entity) le fa il database, ma con ddl-auto=update
// Hibernate crea i vincoli solo insieme alle tabelle e non modifica mai quelli esistenti: un database
// nato prima di un @OnDelete resta con la regola vecchia, e allora cancellare un utente o una carta
// fallisce con un errore di integrità. Qui si confrontano le regole del DB con quelle attese e, se
// non coincidono, lo si scrive nel log con l'istruzione per correggerle. Solo lettura: lo schema di
// produzione non si modifica da solo
@Slf4j
@Component
@RequiredArgsConstructor
public class VerificaVincoli implements CommandLineRunner {

    // "tabella.colonna" -> regola ON DELETE attesa, come nelle annotazioni @OnDelete delle entity
    private static final Map<String, String> ATTESE = Map.of(
            "ruoli_utenti.id_utente", "CASCADE",
            "ruoli_utenti.id_ruolo", "CASCADE",
            "utenti_oggetti_preferiti.id_utente", "CASCADE",
            "utenti_oggetti_preferiti.id_oggetto", "CASCADE",
            "binder.id_utente", "CASCADE",
            "binder.id_carta_copertina", "SET NULL",
            "binder_immagini.id_binder", "CASCADE",
            "binder_slot.id_binder", "CASCADE",
            "binder_slot.id_oggetto", "CASCADE");

    private static final String QUERY = """
            SELECT c.conrelid::regclass::text AS tabella, a.attname AS colonna, c.conname AS vincolo,
                   c.confrelid::regclass::text AS riferita,
                   CASE c.confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT'
                                      WHEN 'r' THEN 'RESTRICT' ELSE 'NO ACTION' END AS regola
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
            WHERE c.contype = 'f'
            """;

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            Map<String, String[]> presenti = new HashMap<>();
            jdbcTemplate.query(QUERY, riga -> {
                presenti.put(riga.getString("tabella") + "." + riga.getString("colonna"), new String[]{
                        riga.getString("vincolo"), riga.getString("riferita"), riga.getString("regola")});
            });

            int sbagliati = 0;
            for (Map.Entry<String, String> attesa : ATTESE.entrySet()) {
                String[] vincolo = presenti.get(attesa.getKey());
                if (vincolo == null) {
                    log.warn("Vincolo mancante sulla colonna {}: dovrebbe essere ON DELETE {}", attesa.getKey(), attesa.getValue());
                    sbagliati++;
                } else if (!vincolo[2].equals(attesa.getValue())) {
                    String[] tabellaColonna = attesa.getKey().split("\\.");
                    log.warn("Vincolo {} su {}: ON DELETE {} invece di {}. Per correggerlo: "
                                    + "ALTER TABLE {} DROP CONSTRAINT {}, ADD CONSTRAINT {} FOREIGN KEY ({}) REFERENCES {} ON DELETE {};",
                            vincolo[0], attesa.getKey(), vincolo[2], attesa.getValue(),
                            tabellaColonna[0], vincolo[0], vincolo[0], tabellaColonna[1], vincolo[1], attesa.getValue());
                    sbagliati++;
                }
            }
            if (sbagliati == 0) {
                log.info("Vincoli del database: le {} regole ON DELETE sono quelle attese", ATTESE.size());
            }
        } catch (RuntimeException ex) {
            // un controllo diagnostico non deve mai impedire l'avvio (es. database diverso da PostgreSQL)
            log.warn("Verifica dei vincoli del database non riuscita: {}", ex.getMessage());
        }
    }
}
