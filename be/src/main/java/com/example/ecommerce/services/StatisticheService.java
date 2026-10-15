package com.example.ecommerce.services;

import com.example.ecommerce.entities.Oggetto;
import com.example.ecommerce.entities.Utente;
import com.example.ecommerce.entities.Variante;
import com.example.ecommerce.payloads.OggettoResponseDTO;
import com.example.ecommerce.payloads.StatisticheDTO;
import com.example.ecommerce.payloads.StatisticheDTO.AvanzamentoSetDTO;
import com.example.ecommerce.payloads.StatisticheDTO.CartaPreziosaDTO;
import com.example.ecommerce.repositories.OggettoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// statistiche della collezione con poche query aggregate, tutte filtrate per utente
@Service
@RequiredArgsConstructor
public class StatisticheService {

    private static final int PIU_PREZIOSE = 10;

    private final JdbcTemplate jdbc;
    private final OggettoRepository oggettoRepository;

    @Transactional(readOnly = true)
    public StatisticheDTO statistiche(Utente utente) {
        UUID id = utente.getId();
        List<AvanzamentoSetDTO> set = set(id);
        int completati = (int) set.stream().filter(s -> s.possedute() == s.totale()).count();

        Map<Variante, Long> perVariante = new EnumMap<>(Variante.class);
        jdbc.query("SELECT variante, SUM(quantita) FROM collezione WHERE id_utente = ? GROUP BY variante",
                riga -> {
                    perVariante.put(Variante.valueOf(riga.getString(1)), riga.getLong(2));
                }, id);
        long copie = perVariante.values().stream().mapToLong(Long::longValue).sum();
        Long carteDiverse = jdbc.queryForObject("SELECT COUNT(DISTINCT id_oggetto) FROM collezione WHERE id_utente = ?", Long.class, id);
        Long binder = jdbc.queryForObject("SELECT COUNT(*) FROM binder WHERE id_utente = ?", Long.class, id);
        Long tasche = jdbc.queryForObject(
                "SELECT COUNT(*) FROM binder_slot s JOIN binder b ON b.id = s.id_binder WHERE b.id_utente = ?", Long.class, id);

        StatisticheDTO.Totali totali = new StatisticheDTO.Totali(carteDiverse, copie, perVariante, set.size(), completati, binder, tasche);
        return new StatisticheDTO(totali, valore(id), set, pokemon(id));
    }

    private StatisticheDTO.Valore valore(UUID id) {
        BigDecimal totale = jdbc.queryForObject(
                "SELECT COALESCE(SUM(o.prezzo * c.quantita), 0) FROM collezione c JOIN oggetti o ON o.id = c.id_oggetto WHERE c.id_utente = ?",
                BigDecimal.class, id);
        // carta e copie (somma delle varianti), dalla più cara; a parità di prezzo per nome
        List<Map.Entry<UUID, Integer>> righe = jdbc.query("""
                SELECT o.id, SUM(c.quantita) FROM collezione c JOIN oggetti o ON o.id = c.id_oggetto
                WHERE c.id_utente = ? GROUP BY o.id, o.prezzo, o.nome ORDER BY o.prezzo DESC, o.nome LIMIT ?""",
                (riga, n) -> Map.entry(riga.getObject(1, UUID.class), riga.getInt(2)), id, PIU_PREZIOSE);
        Map<UUID, Oggetto> carte = oggettoRepository.findAllById(righe.stream().map(Map.Entry::getKey).toList()).stream()
                .collect(Collectors.toMap(Oggetto::getId, Function.identity()));
        List<CartaPreziosaDTO> piuPreziose = righe.stream()
                .map(r -> {
                    Oggetto carta = carte.get(r.getKey());
                    return new CartaPreziosaDTO(OggettoResponseDTO.from(carta), r.getValue(),
                            carta.getPrezzo().multiply(BigDecimal.valueOf(r.getValue())));
                })
                .toList();
        return new StatisticheDTO.Valore(totale, piuPreziose);
    }

    private List<AvanzamentoSetDTO> set(UUID id) {
        return jdbc.query("""
                SELECT e.id, e.nome, e.serie, e.simbolo_url, e.data_uscita, e.importata, e.totale_carte,
                       COUNT(DISTINCT c.id_oggetto) AS possedute,
                       (SELECT COUNT(*) FROM oggetti t WHERE t.espansione_id = e.id) AS nel_catalogo
                FROM collezione c JOIN oggetti o ON o.id = c.id_oggetto JOIN espansioni e ON e.id = o.espansione_id
                WHERE c.id_utente = ?
                GROUP BY e.id ORDER BY e.data_uscita DESC NULLS LAST, e.id""",
                (riga, n) -> {
                    Date uscita = riga.getDate("data_uscita");
                    int possedute = riga.getInt("possedute");
                    Integer totaleCarte = (Integer) riga.getObject("totale_carte");
                    return new AvanzamentoSetDTO(riga.getString("id"), riga.getString("nome"), riga.getString("serie"),
                            riga.getString("simbolo_url"), uscita == null ? null : uscita.toLocalDate(), possedute,
                            totaleSet(riga.getBoolean("importata"), totaleCarte, riga.getInt("nel_catalogo"), possedute));
                }, id);
    }

    private List<Integer> pokemon(UUID id) {
        return jdbc.queryForList("""
                SELECT DISTINCT p.numero_pokedex FROM collezione c JOIN oggetti_pokedex p ON p.oggetto_id = c.id_oggetto
                WHERE c.id_utente = ? ORDER BY p.numero_pokedex""", Integer.class, id);
    }

    // importato: fanno fede le carte del catalogo. Non importato: nel catalogo ci sono solo le carte arrivate da
    // altre pagine, quindi vale il totale di pokemontcg.io se c'è e non è più basso
    static int totaleSet(boolean importata, Integer totaleCarte, int nelCatalogo, int possedute) {
        int totale = importata || totaleCarte == null || totaleCarte < nelCatalogo ? nelCatalogo : totaleCarte;
        return Math.max(totale, possedute);
    }
}
