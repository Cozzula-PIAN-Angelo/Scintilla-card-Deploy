package db.migration;

import com.example.ecommerce.services.AbbinamentoTcgdex;
import com.example.ecommerce.services.ConversioneImmaginiLocali;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

// Immagini dei server di pokemontcg.io e Scrydex sostituite dalle copie locali (vedi ConversioneImmaginiLocali).
// Senza rete; come la V9, un abbinamento-id.json mancante ferma l'avvio
public class V10__immagini_locali extends BaseJavaMigration {

    @Override
    public void migrate(Context context) {
        // la connessione è di Flyway (con la sua transazione): non va chiusa qui
        JdbcTemplate jdbc = new JdbcTemplate(new SingleConnectionDataSource(context.getConnection(), true));
        ConversioneImmaginiLocali.converti(jdbc, AbbinamentoTcgdex.get());
    }
}
