package com.example.ecommerce;

import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

// Deriva tra lo schema di Flyway e quello che Hibernate genererebbe dalle entity. ddl-auto=validate controlla solo
// tabelle, colonne e tipi: qui si confrontano anche NOT NULL, vincoli UNIQUE e chiavi esterne. Hibernate scrive il
// suo DDL in uno script all'avvio del contesto; lo si esegue in uno schema a parte e si confrontano i cataloghi
@DataJpaTest(properties = {
        "spring.jpa.properties.jakarta.persistence.schema-generation.scripts.action=create",
        "spring.jpa.properties.jakarta.persistence.schema-generation.scripts.create-target=target/schema-hibernate.sql",
        "spring.jpa.properties.hibernate.hbm2ddl.delimiter=;",
        // altrimenti Hibernate accoda allo script del giro prima
        "spring.jpa.properties.hibernate.hbm2ddl.schema-generation.script.append=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
class SchemaDerivaTest {

    // differenze volute, una per riga come le stampa il test, col motivo
    private static final Set<String> AMMESSE = Set.of();

    private static final String COLONNE = """
            SELECT table_name || '.' || column_name || (CASE is_nullable WHEN 'NO' THEN ' NOT NULL' ELSE '' END)
            FROM information_schema.columns WHERE table_schema = ?
            """;

    // vincoli UNIQUE e chiavi primarie, come "tabella UNIQUE(colonne in ordine alfabetico)"
    private static final String UNICI = """
            SELECT t.relname || CASE c.contype WHEN 'p' THEN ' PRIMARY KEY(' ELSE ' UNIQUE(' END
                   || (SELECT string_agg(a.attname, ',' ORDER BY a.attname) FROM pg_attribute a
                       WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)) || ')'
            FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = ? AND c.contype IN ('u', 'p')
            """;

    // chiavi esterne senza nome né regola ON DELETE (quella la controlla MigrazioniTest.regoleOnDelete)
    private static final String ESTERNE = """
            SELECT t.relname || '.' || (SELECT string_agg(a.attname, ',') FROM pg_attribute a
                       WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)) || ' -> ' || r.relname
            FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_class r ON r.oid = c.confrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = ? AND c.contype = 'f'
            """;

    @Autowired
    private DataSource dataSource;

    @Test
    void loSchemaDiFlywayCorrispondeAQuelloDelleEntity() throws Exception {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        String script = Files.readString(Path.of("target/schema-hibernate.sql"));
        // stessa transazione del test (e quindi stessa connessione): il search_path vale per lo script
        jdbc.execute("CREATE SCHEMA hibernate; SET LOCAL search_path TO hibernate; " + script);
        jdbc.execute("SET LOCAL search_path TO public");

        List<String> differenze = new ArrayList<>();
        for (String query : List.of(COLONNE, UNICI, ESTERNE)) {
            Set<String> flyway = leggi(jdbc, query, "public");
            Set<String> hibernate = leggi(jdbc, query, "hibernate");
            // la tabella di Flyway non ha un'entity
            flyway.removeIf(riga -> riga.startsWith("flyway_schema_history"));
            flyway.stream().filter(riga -> !hibernate.contains(riga)).forEach(riga -> differenze.add("solo Flyway: " + riga));
            hibernate.stream().filter(riga -> !flyway.contains(riga)).forEach(riga -> differenze.add("solo entity: " + riga));
        }
        differenze.removeAll(AMMESSE);

        assertThat(differenze).isEmpty();
    }

    private static Set<String> leggi(JdbcTemplate jdbc, String query, String schema) {
        return new TreeSet<>(jdbc.queryForList(query, String.class, schema));
    }
}
