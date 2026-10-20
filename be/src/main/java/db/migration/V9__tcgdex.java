package db.migration;

import com.example.ecommerce.services.AbbinamentoTcgdex;
import com.example.ecommerce.services.ConversioneIdTcgdex;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

// Passaggio da pokemontcg.io a TCGdex: id di set e carte riscritti con abbinamento-id.json (vedi ConversioneIdTcgdex).
// Senza rete. Se il file manca o non si legge, AbbinamentoTcgdex lancia: la migrazione fallisce e l'applicazione
// non parte, meglio di un database convertito a metà
public class V9__tcgdex extends BaseJavaMigration {

    @Override
    public void migrate(Context context) {
        // la connessione è di Flyway (con la sua transazione): non va chiusa qui
        JdbcTemplate jdbc = new JdbcTemplate(new SingleConnectionDataSource(context.getConnection(), true));
        ConversioneIdTcgdex.converti(jdbc, AbbinamentoTcgdex.get());
    }
}
