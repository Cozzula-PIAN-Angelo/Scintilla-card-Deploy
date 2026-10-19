package com.example.ecommerce.services;

import com.example.ecommerce.entities.Variante;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Varianti del master set: Normale più Reverse holo dove esiste. Dai set del 2026 pokemontcg.io non dà più i prezzi
// TCGplayer, quindi nei set senza nessuna variante letta decide la rarità. La stessa regola è in
// fe/src/features/collezione/varianti.ts (variantiMaster): vanno cambiate insieme
@Component
@RequiredArgsConstructor
public class VariantiMaster {

    // le sole rarità che nei set con dati hanno la reverse
    private static final Set<String> RARITA_CON_REVERSE = Set.of("Common", "Uncommon", "Rare", "Rare Holo");
    // ristampe ed energie senza reverse: la regola della rarità sbaglierebbe
    static final Set<String> ESCLUSI = Set.of("me55c", "cel25c", "sve");

    private final JdbcTemplate jdbc;

    // mai vuota: per il master ogni carta vale almeno una voce. La 1ª edizione non fa parte del master set
    public static List<Variante> effettive(List<Variante> lette, String rarita, boolean setSenzaDati) {
        if (lette != null && !lette.isEmpty()) {
            List<Variante> master = lette.stream().filter(v -> v != Variante.PRIMA_EDIZIONE).sorted().toList();
            return master.isEmpty() ? List.of(Variante.NORMALE) : master;
        }
        // Set.of rifiuta contains(null)
        if (setSenzaDati && rarita != null && RARITA_CON_REVERSE.contains(rarita)) {
            return List.of(Variante.NORMALE, Variante.REVERSE_HOLO);
        }
        return List.of(Variante.NORMALE);
    }

    // set con almeno una carta nel catalogo e nessuna variante letta, tolti gli esclusi
    public Set<String> setSenzaDati() {
        Set<String> set = new HashSet<>(jdbc.queryForList("""
                SELECT espansione_id FROM oggetti WHERE espansione_id IS NOT NULL
                GROUP BY espansione_id HAVING bool_and(varianti IS NULL OR varianti = '')""", String.class));
        set.removeAll(ESCLUSI);
        return set;
    }
}
