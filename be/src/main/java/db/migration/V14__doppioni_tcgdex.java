package db.migration;

import com.example.ecommerce.services.UnioneDoppioniTcgdex;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

// Carte rimaste con l'id di pokemontcg.io unite alle stesse carte scaricate da TCGdex (vedi UnioneDoppioniTcgdex).
// Senza rete
public class V14__doppioni_tcgdex extends BaseJavaMigration {

    @Override
    public void migrate(Context context) {
        // la connessione è di Flyway (con la sua transazione): non va chiusa qui
        JdbcTemplate jdbc = new JdbcTemplate(new SingleConnectionDataSource(context.getConnection(), true));
        UnioneDoppioniTcgdex.unisci(jdbc);
    }
}
