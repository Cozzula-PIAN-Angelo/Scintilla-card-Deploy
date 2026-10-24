package com.example.ecommerce.services;

import com.example.ecommerce.payloads.TcgdexApi.CartaDelCatalogo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// Nomi e numeri delle carte uguali a quelli di TCGdex, con la regola dell'import (CatalogoService.componiNome).
// Le carte convertite da pokemontcg.io avevano tenuto nome e numero della vecchia API ("Base" invece di "Base Set",
// "-GX" invece di " GX", in 30th Classic Collection il numero della carta originale); nei set promo il totale fra
// parentesi cresce quando TCGdex aggiunge carte. Gira all'avvio e ogni notte dopo i set, da cui prende nome e carte
// ufficiali. Le carte che TCGdex non ha restano come sono. Un nome cambiato a mano dall'admin torna quello di TCGdex
@Slf4j
@Service
public class AllineamentoNomi {

    private final TcgdexClient tcgdex;
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transazione;

    public AllineamentoNomi(TcgdexClient tcgdex, JdbcTemplate jdbc, TransactionTemplate transazione) {
        this.tcgdex = tcgdex;
        this.jdbc = jdbc;
        this.transazione = transazione;
    }

    private record SetSalvato(String nome, Integer ufficiali) {
    }

    private record Riga(UUID id, String idEsterno, String nome, String numero) {
    }

    // nome null: resta quello di adesso, cambia solo il numero
    private record Cambio(UUID id, String nome, String numero) {
    }

    // restituisce quante carte ha cambiato. La chiamata a TCGdex sta fuori dalla transazione
    public int allinea() {
        List<CartaDelCatalogo> carte = tcgdex.carteDelCatalogo();
        Integer cambiate = transazione.execute(stato -> allinea(carte));
        return cambiate == null ? 0 : cambiate;
    }

    int allinea(List<CartaDelCatalogo> carte) {
        Map<String, CartaDelCatalogo> perId = carte.stream()
                .collect(Collectors.toMap(CartaDelCatalogo::id, Function.identity(), (prima, seconda) -> prima));
        Map<String, SetSalvato> set = new HashMap<>();
        jdbc.query("SELECT id, nome, carte_ufficiali FROM espansioni", riga -> {
            set.put(riga.getString("id"), new SetSalvato(riga.getString("nome"), (Integer) riga.getObject("carte_ufficiali")));
        });
        List<Riga> righe = jdbc.query("SELECT id, id_esterno, nome, numero FROM oggetti", (riga, n) -> new Riga(
                riga.getObject("id", UUID.class), riga.getString("id_esterno"), riga.getString("nome"), riga.getString("numero")));

        // prima i nomi che restano, poi quelli nuovi: un nome nuovo già preso prende l'id fra quadre, come all'import
        Set<String> occupati = new HashSet<>();
        List<Cambio> cambi = new ArrayList<>();
        List<Riga> daRinominare = new ArrayList<>();
        for (Riga riga : righe) {
            CartaDelCatalogo carta = riga.idEsterno() == null ? null : perId.get(riga.idEsterno());
            SetSalvato espansione = carta == null || carta.set() == null ? null : set.get(carta.set().id());
            if (espansione == null) {
                occupati.add(riga.nome());
                continue;
            }
            String nome = CatalogoService.componiNome(carta.name(), espansione.nome(), carta.localId(), espansione.ufficiali());
            String numero = CatalogoService.numeroDaLocalId(carta.localId());
            if (senzaId(riga).equals(nome)) {
                occupati.add(riga.nome());
                if (!Objects.equals(riga.numero(), numero)) {
                    cambi.add(new Cambio(riga.id(), null, numero));
                }
            } else {
                daRinominare.add(new Riga(riga.id(), riga.idEsterno(), nome, numero));
            }
        }
        daRinominare.sort(Comparator.comparing(Riga::idEsterno));
        for (Riga riga : daRinominare) {
            String nome = occupati.add(riga.nome()) ? riga.nome() : riga.nome() + " [" + riga.idEsterno() + "]";
            occupati.add(nome);
            cambi.add(new Cambio(riga.id(), nome, riga.numero()));
        }

        // due passaggi: un nome provvisorio unico libera i vecchi, così due carte possono scambiarsi il nome
        List<Cambio> rinominate = cambi.stream().filter(cambio -> cambio.nome() != null).toList();
        jdbc.batchUpdate("UPDATE oggetti SET nome = ? WHERE id = ?",
                rinominate.stream().map(cambio -> new Object[]{"~" + cambio.id(), cambio.id()}).toList());
        jdbc.batchUpdate("UPDATE oggetti SET nome = COALESCE(CAST(? AS varchar), nome), numero = ? WHERE id = ?",
                cambi.stream().map(cambio -> new Object[]{cambio.nome(), cambio.numero(), cambio.id()}).toList());
        if (!cambi.isEmpty()) {
            log.info("Nomi delle carte allineati a TCGdex: {} rinominate, {} solo col numero cambiato",
                    rinominate.size(), cambi.size() - rinominate.size());
        }
        return cambi.size();
    }

    // il nome senza l'id fra quadre aggiunto all'import quando era già preso
    private static String senzaId(Riga riga) {
        String suffisso = " [" + riga.idEsterno() + "]";
        return riga.nome().endsWith(suffisso) ? riga.nome().substring(0, riga.nome().length() - suffisso.length()) : riga.nome();
    }
}
